# Handoff

Last updated: 2026-10-18

## 1. Goal

Build the Seoul-Mate Minimart menu catalog website described in [docs/BRIEF.md](docs/BRIEF.md), following its implementation order (section 7). Security is the top priority.

## 2. Current State

- Steps 1 to 4 are done: requirements, design (approved by the owner), repository setup, and the database.
- Database: four migrations in `supabase/migrations` build the schema in [BACKEND-SCHEMA.md](docs/BACKEND-SCHEMA.md), including RLS, privileges, triggers, the rate limiter, the photo bucket and scheduled jobs. `supabase/seed.sql` adds four categories and twelve sample items.
- 94 pgTAP assertions in `supabase/tests/database` prove the access rules. CI runs them against a real local Supabase stack ("Database tests" job, a required check on `main`).
- No Supabase account or hosted project exists yet; everything runs locally or in CI.
- The app is still the placeholder page; step 5 builds the public catalog.
- `main` is protected ([D-026](docs/DECISIONS.md#d-026-protected-main-squash-merges-conventional-commit-titles)).
- Deferred by the owner: hosting ([D-003](docs/DECISIONS.md#d-003-hosting-deferred)) and the Messenger bot ([D-004](docs/DECISIONS.md#d-004-messenger-bot-deferred)).

## 3. Active Files

- `supabase/config.toml` (hardened auth settings), `supabase/migrations/*.sql`, `supabase/seed.sql`, `supabase/tests/database/*.test.sql`
- `scripts/db-test-pglite.mjs`, `.github/workflows/ci.yml` (new `database` job), `package.json` (`db:*` scripts)
- Docs: `docs/BACKEND-SCHEMA.md` (sections 3, 6, 7, new 8), `docs/DECISIONS.md` (D-028, D-029), `docs/TRD.md`, `docs/SRS.md`, `README.md`, `CHANGELOG.md`

## 4. Changes Made

- Step 4 database: schema, RLS and privileges, functions and triggers, storage bucket and policies, realtime publication, `pg_cron` jobs, sample data, pgTAP tests, CI job, local Supabase config.
- Verified locally in PGlite: all migrations apply, seed loads 12 sample items, all 94 assertions pass. Mutation check: making hidden items visible to visitors, leaving Supabase's default grants in place, or ignoring the two-factor rule each turns tests red.
- Design changes found while building, all reflected in BACKEND-SCHEMA: `is_admin()` is callable only by signed-in users (visitor policies never call it); staff get a select policy on photo files (needed to replace and delete them); photo uploads must match the path pattern; the category foreign key uses `no action`; no staff account in seed data (D-028); GraphQL API not exposed.

## 5. Failed Attempts

- `gh` and `node` were "not recognized" in terminals opened before they were installed. Fix: restart the terminal (fully quit VS Code), or use full paths.
- On Windows, Playwright takes about two minutes to stop a preview server it started itself. Workaround: `npm run preview:e2e` in another terminal first. CI is not affected.
- `ON DELETE RESTRICT` reports error code 23001 in Postgres 18 (PGlite) but 23503 in Postgres 17 (Supabase). Switched to `NO ACTION`, which reports 23503 everywhere.
- A test using `check_rate_limit(...) between 1 and 60` called the limiter twice, because Postgres expands `BETWEEN` into two comparisons. Fixed with a materialized CTE.
- Pushing workflow files needs the `workflow` scope on the GitHub CLI login; granted on 2026-10-18.

## 6. Next Steps

1. Step 5, public catalog: layout, store facts config, menu with live availability, search, three languages. Needs `@supabase/supabase-js`, i18next and React Router.
2. To run the site against real data locally, either install Docker Desktop (local Supabase stack) or create a free Supabase account with a staging project. The owner creates the account; until then, step 5 can be built and tested against mocked data.
3. Step 6 adds the local-only staff account script (D-028).
