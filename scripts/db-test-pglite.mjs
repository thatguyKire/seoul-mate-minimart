// Local stand-in for `supabase test db` when Docker is not available (D-029).
// Applies the real migrations and seed to PGlite (Postgres in WASM) on top of a minimal
// imitation of Supabase's roles and schemas, then runs every pgTAP test file.
// CI against the real Supabase stack remains the source of truth.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { pgtap } from '@electric-sql/pglite-pgtap';

const supabaseDir = process.argv[2] ?? 'supabase';
const db = new PGlite({ extensions: { pgtap } });

const shim = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema extensions;
  create extension pgtap with schema extensions;
  grant usage on schema extensions to anon, authenticated, service_role;
  grant execute on all functions in schema extensions to anon, authenticated, service_role;

  create schema auth;
  create table auth.users (id uuid primary key, email text, aud text, role text, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ), '')::uuid
  $$;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;

  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id), name text, owner uuid,
    created_at timestamptz default now()
  );
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant all on storage.objects, storage.buckets to anon, authenticated, service_role;

  create publication supabase_realtime;

  create schema cron;
  create table cron.job (jobname text primary key, schedule text, command text);
  create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$
    insert into cron.job values (job_name, schedule, command)
    on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command
    returning 1::bigint
  $$;

  set search_path = "$user", public, extensions;
`;

await db.exec(shim);

const migrationsDir = join(supabaseDir, 'migrations');
for (const file of readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()) {
  // pg_cron is not available in PGlite; the cron schema above stands in for it.
  const sql = readFileSync(join(migrationsDir, file), 'utf8').replace(
    /create extension if not exists pg_cron;/i,
    '',
  );
  try {
    await db.exec(sql);
    console.log(`migration ok: ${file}`);
  } catch (error) {
    console.log(`MIGRATION FAILED: ${file}: ${error.message}`);
    process.exit(1);
  }
}

try {
  await db.exec(readFileSync(join(supabaseDir, 'seed.sql'), 'utf8'));
  const { rows } = await db.query(
    'select count(*)::int as items, count(*) filter (where is_sample)::int as samples from public.items',
  );
  console.log(`seed ok: ${rows[0].items} items, ${rows[0].samples} marked as samples`);
} catch (error) {
  console.log(`SEED FAILED: ${error.message}`);
  process.exit(1);
}

const testsDir = join(supabaseDir, 'tests', 'database');
let failures = 0;
let total = 0;
for (const file of readdirSync(testsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()) {
  let lines;
  try {
    const results = await db.exec(readFileSync(join(testsDir, file), 'utf8'));
    lines = results.flatMap((r) => r.rows.map((row) => String(Object.values(row)[0])));
  } catch (error) {
    lines = [`not ok - file aborted: ${error.message}`];
    await db.exec('rollback').catch(() => {});
  }
  const tap = lines.filter((l) => /^(not )?ok \d|^# |^not ok - /.test(l));
  const bad = tap.filter((l) => l.startsWith('not ok'));
  const planLine = lines.find((l) => /^1\.\.\d+/.test(l));
  const diag = lines.filter((l) => l.startsWith('#'));
  total += tap.filter((l) => /^(not )?ok \d/.test(l)).length;
  failures += bad.length;
  console.log(
    `${bad.length ? 'FAIL' : 'ok  '} ${file} (${planLine ?? 'no plan'}, ${tap.length - bad.length - diag.length} passed)`,
  );
  for (const line of [...bad, ...diag]) console.log(`     ${line}`);
}
console.log(failures ? `${failures} failing assertions` : `all ${total} assertions passed`);
process.exit(failures ? 1 : 0);
