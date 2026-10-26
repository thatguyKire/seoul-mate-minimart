// NFR-SEC-18: no direct dependency may go 12 months without a release or other maintainer
// activity on npm, unless a recorded decision allows it (list it in `allowed` with its ID).
// Usage: node scripts/check-maintained.mjs
import { readFileSync } from 'node:fs';

const maxAgeDays = 365;
/** Package name to the decision that allows it, such as 'some-package': 'D-040'. */
const allowed = {};

const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const names = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).sort();

async function lastActivity(name) {
  // The abbreviated metadata is the smallest document that has the last-modified time.
  const response = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2F')}`, {
    headers: { Accept: 'application/vnd.npm.install-v1+json' },
  });
  if (!response.ok) throw new Error(`${name}: the registry answered ${String(response.status)}`);
  const { modified } = await response.json();
  return new Date(modified);
}

const now = Date.now();
const results = await Promise.all(
  names.map(async (name) => ({ name, modified: await lastActivity(name) })),
);
const stale = results.filter(
  ({ name, modified }) => !(name in allowed) && now - modified.getTime() > maxAgeDays * 86_400_000,
);

console.log(`Checked ${String(results.length)} direct dependencies on npm.`);
for (const { name, modified } of results) {
  console.log(
    `  ${modified.toISOString().slice(0, 10)}  ${name}${allowed[name] ? ` (allowed, ${allowed[name]})` : ''}`,
  );
}
if (stale.length > 0) {
  for (const { name, modified } of stale) {
    console.error(
      `FAIL ${name}: no activity since ${modified.toISOString().slice(0, 10)}. Replace it, or record a decision and list it in allowed.`,
    );
  }
  process.exit(1);
}
console.log(`All active within the last ${String(maxAgeDays)} days.`);
