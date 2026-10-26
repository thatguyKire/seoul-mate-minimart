// The bundle check must catch what it claims to (NFR-SEC-06, NFR-SEC-07). Every fake secret
// here is put together at run time, so the repository never holds one in a scannable form.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkBundle, secretSettings } from './check-bundle.mjs';

const folders = [];

/** A small build: index.html loading /assets/entry.js, plus any extra files. */
function build(entry = 'console.log("menu")', extra = {}) {
  const dist = mkdtempSync(join(tmpdir(), 'bundle-check-'));
  folders.push(dist);
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'index.html'), '<script type="module" src="/assets/entry.js"></script>');
  writeFileSync(join(dist, 'assets', 'entry.js'), entry);
  for (const [name, text] of Object.entries(extra)) writeFileSync(join(dist, name), text);
  return dist;
}

function jwt(role) {
  const part = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ iss: 'supabase', role })}.c2lnbmF0dXJlLXBhcnQ`;
}

afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

describe('checkBundle', () => {
  it('passes a clean build, including the public anon key', () => {
    const { problems } = checkBundle(build(`const key = "${jwt('anon')}";`));
    expect(problems).toEqual([]);
  });

  it('finds a service role key', () => {
    const { problems } = checkBundle(build(`const key = "${jwt('service_role')}";`));
    expect(problems).toEqual(['Supabase service role key found in: assets/entry.js']);
  });

  it('finds secrets in known formats', () => {
    const secret = ['sb', 'secret', 'a1B2c3D4e5F6g7H8'].join('_');
    const accessToken = `sbp_${'0123456789abcdef'.repeat(3).slice(0, 40)}`;
    const privateKey = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
    const { problems } = checkBundle(
      build(`"${secret}"`, { 'notes.txt': `${accessToken}\n${privateKey}` }),
    );
    expect(problems).toEqual([
      'Supabase secret key found in: assets/entry.js',
      'Supabase access token found in: notes.txt',
      'private key found in: notes.txt',
    ]);
  });

  it('finds the value of a secret setting without printing it', () => {
    const value = 'salt-for-hashing-0123456789';
    const { problems } = checkBundle(build(`const x = "${value}";`), {
      secrets: [{ name: 'CONTACT_IP_SALT', value }],
    });
    expect(problems).toEqual(['value of CONTACT_IP_SALT found in: assets/entry.js']);
    expect(problems.join('\n')).not.toContain(value);
  });

  it('finds source maps and references to them', () => {
    const { problems } = checkBundle(
      build('console.log(1);\n//# sourceMappingURL=entry.js.map', { 'entry.js.map': '{}' }),
    );
    expect(problems).toEqual([
      'source map reference in: assets/entry.js',
      'source map shipped: entry.js.map',
    ]);
  });

  it('fails a first page over the JavaScript budget', () => {
    // Random text barely compresses, so 260 KB of it stays over 170 KB gzipped.
    const random = Buffer.from(
      Array.from({ length: 200_000 }, () => Math.floor(Math.random() * 256)),
    ).toString('base64');
    const { problems } = checkBundle(build(`"${random}"`));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/over the 170 KB budget/);
  });
});

describe('secretSettings', () => {
  it('takes secret-looking settings, but not public VITE_ ones or short values', () => {
    const settings = secretSettings(
      {
        E2E_SERVICE_ROLE_KEY: 'service-role-value-123',
        SENTRY_AUTH_TOKEN: 'token-value-0123456789',
        VITE_SUPABASE_ANON_KEY: 'public-anon-key-value',
        E2E_STAFF_PASSWORD: 'short',
        PATH: '/usr/bin:/bin:/usr/local/bin',
      },
      'no-such-file',
    );
    expect(settings.map((setting) => setting.name)).toEqual([
      'E2E_SERVICE_ROLE_KEY',
      'SENTRY_AUTH_TOKEN',
    ]);
  });

  it('reads the Edge Functions settings file too', () => {
    const dist = build();
    const file = join(dist, 'functions.env');
    writeFileSync(
      file,
      'ALLOWED_ORIGINS=http://127.0.0.1:4173\nCONTACT_IP_SALT="abcdef0123456789"\n',
    );
    expect(secretSettings({}, file)).toEqual([
      { name: 'CONTACT_IP_SALT', value: 'abcdef0123456789' },
    ]);
  });
});
