// Checks a production build before it can ship:
//   - no source maps (NFR-SEC-07)
//   - no secrets (NFR-SEC-06): known secret formats, and the actual values of any secret
//     settings present while it runs, such as the service role key in CI
//   - JavaScript loaded by the first page within budget (NFR-PERF-02)
// Usage: node scripts/check-bundle.mjs <dist folder>
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

export const initialJsBudgetKb = 170;
const textExtensions = new Set([
  '.js',
  '.mjs',
  '.css',
  '.html',
  '.json',
  '.svg',
  '.txt',
  '.webmanifest',
]);

const secretPatterns = [
  { name: 'Supabase secret key', pattern: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: 'Supabase access token', pattern: /\bsbp_[a-f0-9]{40}\b/ },
  { name: 'private key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'Meta access token', pattern: /\bEAA[A-Za-z0-9]{60,}/ },
  { name: 'GitHub token', pattern: /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/ },
  { name: 'Sentry auth token', pattern: /\bsntry[su]_[A-Za-z0-9+/=_-]{20,}/ },
];
const jwtPattern = /eyJ[A-Za-z0-9_-]+\.(eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g;

/** Setting names that hold secrets. VITE_ settings are public by design (.env.example). */
const secretName = /SECRET|SERVICE_ROLE|TOKEN|PASSWORD|SALT|PRIVATE/i;

/**
 * Secret settings whose values must never appear in the build: from the environment and
 * from the Edge Functions' local settings file, when it exists. Short values are skipped,
 * because they could match by chance.
 */
export function secretSettings(
  environment = process.env,
  functionsEnvFile = 'supabase/functions/.env',
) {
  const entries = Object.entries(environment);
  if (existsSync(functionsEnvFile)) {
    for (const line of readFileSync(functionsEnvFile, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (match) entries.push([match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]);
    }
  }
  return entries
    .filter(([name]) => !name.startsWith('VITE_') && secretName.test(name))
    .filter(([, value]) => typeof value === 'string' && value.length >= 12)
    .map(([name, value]) => ({ name, value }));
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function jwtRole(payload) {
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role;
  } catch {
    return undefined;
  }
}

/** Returns what is wrong with the build in `dist`; an empty `problems` list means it can ship. */
export function checkBundle(dist, { secrets = [] } = {}) {
  const problems = [];
  const files = walk(dist);

  for (const file of files) {
    const name = relative(dist, file).split(sep).join('/');
    if (file.endsWith('.map')) problems.push(`source map shipped: ${name}`);
    if (!textExtensions.has(extname(file))) continue;

    const text = readFileSync(file, 'utf8');
    if (text.includes('sourceMappingURL=')) problems.push(`source map reference in: ${name}`);
    for (const { name: secret, pattern } of secretPatterns) {
      if (pattern.test(text)) problems.push(`${secret} found in: ${name}`);
    }
    for (const match of text.matchAll(jwtPattern)) {
      if (jwtRole(match[1]) === 'service_role')
        problems.push(`Supabase service role key found in: ${name}`);
    }
    // Names only: the report must not print the secret it found.
    for (const { name: setting, value } of secrets) {
      if (text.includes(value)) problems.push(`value of ${setting} found in: ${name}`);
    }
  }

  // Initial JavaScript: the entry script plus everything index.html preloads.
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const initialScripts = [
    ...html.matchAll(/<script[^>]+src="\/([^"]+\.js)"/g),
    ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="\/([^"]+\.js)"/g),
  ].map((match) => match[1]);
  const initialBytes = initialScripts.reduce(
    (sum, path) => sum + gzipSync(readFileSync(join(dist, path))).length,
    0,
  );
  const initialKb = initialBytes / 1024;
  if (initialScripts.length === 0) problems.push('no entry script found in index.html');
  if (initialKb > initialJsBudgetKb) {
    problems.push(
      `initial JavaScript is ${initialKb.toFixed(1)} KB gzipped, over the ${initialJsBudgetKb} KB budget`,
    );
  }

  return { problems, fileCount: files.length, initialKb };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dist = process.argv[2] ?? 'dist';
  const secrets = secretSettings();
  const { problems, fileCount, initialKb } = checkBundle(dist, { secrets });
  console.log(
    `Checked ${fileCount} files in ${dist}, also for the values of ${secrets.length} secret settings.`,
  );
  console.log(
    `Initial JavaScript: ${initialKb.toFixed(1)} KB gzipped (budget ${initialJsBudgetKb} KB).`,
  );
  if (problems.length > 0) {
    for (const problem of problems) console.error(`FAIL ${problem}`);
    process.exit(1);
  }
  console.log('No source maps, no secrets, within budget.');
}
