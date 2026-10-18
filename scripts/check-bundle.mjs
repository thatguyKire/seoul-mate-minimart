// Checks a production build before it can ship:
//   - no source maps (NFR-SEC-07)
//   - no secrets (NFR-SEC-06)
//   - JavaScript loaded by the first page within budget (NFR-PERF-02)
// Usage: node scripts/check-bundle.mjs <dist folder>
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = process.argv[2] ?? 'dist';
const initialJsBudgetKb = 170;
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
  { name: 'private key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'Meta access token', pattern: /\bEAA[A-Za-z0-9]{60,}/ },
  { name: 'GitHub token', pattern: /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/ },
  { name: 'Sentry auth token', pattern: /\bsntry[su]_[A-Za-z0-9+/=_-]{20,}/ },
];
const jwtPattern = /eyJ[A-Za-z0-9_-]+\.(eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g;

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

const problems = [];
const files = walk(dist);

for (const file of files) {
  const name = relative(dist, file);
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

console.log(`Checked ${files.length} files in ${dist}.`);
console.log(
  `Initial JavaScript: ${initialKb.toFixed(1)} KB gzipped (budget ${initialJsBudgetKb} KB).`,
);
if (problems.length > 0) {
  for (const problem of problems) console.error(`FAIL ${problem}`);
  process.exit(1);
}
console.log('No source maps, no secrets, within budget.');
