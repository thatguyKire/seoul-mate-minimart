// Creates a staff account on the LOCAL Supabase stack only (D-028). Staging and production
// staff accounts are created by the owner in the Supabase dashboard (README, "Staff accounts").
//
// Usage:
//   node scripts/create-local-staff.mjs <email> <password> [--not-staff] [--require-mfa]
//
//   --not-staff    creates the login without adding it to the admins table, to test that
//                  such an account can change nothing (FR-37)
//   --require-mfa  sets admins.require_mfa, so the account can write only after a code
//
// Reads API_URL and SERVICE_ROLE_KEY from the environment, or else from
// `supabase status -o env`. Refuses any address that is not this machine.
import { spawnSync } from 'node:child_process';

const [email, password, ...flags] = process.argv.slice(2);
if (!email || !password) {
  console.error(
    'Usage: node scripts/create-local-staff.mjs <email> <password> [--not-staff] [--require-mfa]',
  );
  process.exit(2);
}

function localStatus() {
  const result = spawnSync('npx', ['supabase', 'status', '-o', 'env'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const values = {};
  for (const line of (result.stdout ?? '').split(/\r?\n/)) {
    const match = /^([A-Z_]+)="?([^"]*)"?$/.exec(line.trim());
    if (match) values[match[1]] = match[2];
  }
  return values;
}

const status = process.env.API_URL && process.env.SERVICE_ROLE_KEY ? {} : localStatus();
const apiUrl = process.env.API_URL ?? status.API_URL;
const serviceKey = process.env.SERVICE_ROLE_KEY ?? status.SERVICE_ROLE_KEY;
if (!apiUrl || !serviceKey) {
  console.error('No local Supabase found. Start it with `npm run db:start` first.');
  process.exit(1);
}

const host = new URL(apiUrl).hostname;
if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) {
  console.error(
    `Refusing to create a staff account on ${host}: this script is for the local stack only (D-028).`,
  );
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
};

async function call(path, init) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

// Create the login, or find it if it already exists.
const created = await call('/auth/v1/admin/users', {
  method: 'POST',
  body: JSON.stringify({ email, password, email_confirm: true }),
});
let userId = created.body?.id;
if (!userId) {
  const list = await call('/auth/v1/admin/users?per_page=1000', { method: 'GET' });
  userId = list.body?.users?.find((user) => user.email === email.toLowerCase())?.id;
  if (!userId) {
    console.error(`Could not create ${email}: ${JSON.stringify(created.body)}`);
    process.exit(1);
  }
  // Keep the password in step with what the caller passed.
  const updated = await call(`/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });
  if (updated.status >= 300) {
    console.error(`Could not update ${email}: ${JSON.stringify(updated.body)}`);
    process.exit(1);
  }
}

if (flags.includes('--not-staff')) {
  console.log(`Login ${email} is ready, without staff rights.`);
  process.exit(0);
}

const admin = await call('/rest/v1/admins?on_conflict=user_id', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify({ user_id: userId, require_mfa: flags.includes('--require-mfa') }),
});
if (admin.status >= 300) {
  console.error(`Could not add ${email} to admins: ${JSON.stringify(admin.body)}`);
  process.exit(1);
}
console.log(`Staff account ${email} is ready on the local stack.`);
