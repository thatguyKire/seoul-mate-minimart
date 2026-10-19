# Handoff

Last updated: 2026-10-19

## 1. Goal

Build the Seoul-Mate Minimart menu catalog website described in [docs/BRIEF.md](docs/BRIEF.md), following its implementation order (section 7). Security is the top priority.

## 2. Current State

- Steps 1 to 6 are done: requirements, design (approved by the owner), repository setup, database, the public catalog, and the staff panel at `/admin`.
- Staff panel: login (generic refusal message, show-password toggle), non-staff accounts logged straight out, optional two-factor login, logout after 60 idle minutes or 12 hours; items (one-tap stock switch, mark all out of stock, add, edit, delete, reorder, photos processed in the browser); categories (add, rename, reorder, delete refused while in use). English only (D-025). It is its own chunk (69 KB gzipped); the public site's initial JavaScript is 126 KB of 170 KB.
- Database: five migrations. The fifth, `20261019120000_photo_format.sql`, adds `items.photo_format` (D-034). 97 pgTAP assertions.
- Staging Supabase project `vebcdxmhoeksxnlyrmqf` (free plan, Tokyo): migrations and sample data from step 4 applied ([D-032](docs/DECISIONS.md#d-032-staging-migrations-applied-through-the-supabase-connector-until-step-10)); the photo format migration is applied after this step's CI passes (Next Steps 1). Its URL and publishable key are in `.env.local` on the development PC (git-ignored). Auth settings set by the owner on 2026-10-19 to match `supabase/config.toml`; sign-ups confirmed off.
- No staff account exists on staging yet: the owner creates them (README, "Staff accounts").
- Supabase Auth's login limit answers `429` without `Retry-After`; kept on purpose ([D-033](docs/DECISIONS.md#d-033-staff-login-keeps-supabase-auths-limit-without-retry-after)).
- Deferred by the owner: hosting ([D-003](docs/DECISIONS.md#d-003-hosting-deferred)) and the Messenger bot ([D-004](docs/DECISIONS.md#d-004-messenger-bot-deferred)).

## 3. Active Files

- Staff panel: `src/features/admin/` (`AdminApp.tsx` routes and login gate; `session/` login state and session limits; `adminData.ts` every read and write; `schemas.ts` form rules; `photos/` photo checks, processing and field; `pages/`; `components/`; `locales/en.json`; `admin.css`)
- `src/App.tsx` (lazy `/admin` route, new-version fallback), `src/lib/database.types.ts` (full rows, functions), `src/features/catalog/ItemPhoto.tsx` (stored format)
- `supabase/migrations/20261019120000_photo_format.sql`, `supabase/tests/database/01_structure.test.sql` and `06_constraints.test.sql`
- `scripts/create-local-staff.mjs` (`npm run db:staff`), `.github/workflows/ci.yml` (end-to-end job creates two local logins)
- Tests: `src/features/admin/*.test.ts`, `e2e/admin.spec.ts`, `e2e/live-stack.spec.ts`, `e2e/support/fakeSupabase.ts` (now with auth, writes and storage), `e2e/support/photos.ts`
- Docs: `docs/DECISIONS.md` (D-033 to D-035, D-024 replaced), `docs/SDD.md` (2.1 tree, 2.2, 2.3, E6, 5.4, 5.5, 5.8), `docs/SRS.md` (6.1), `docs/BACKEND-SCHEMA.md` (2.2, 3, 8), `README.md` (Staff accounts), `CHANGELOG.md`

## 4. Changes Made

- Step 6 in one pull request: everything in section 2, 85 unit tests, 79 end-to-end tests at phone and desktop sizes plus the CI-only real-stack tests, all passing locally in Edge.
- Checked D-024 on staging: about 41 wrong logins in a row get `429 over_request_rate_limit`, without `Retry-After`. Recorded as D-033.
- Settled the photo format question from step 5 with a column (D-034).
- Visual check of the panel at phone and desktop sizes; rows were reworked so the reorder arrows sit under the switch instead of on a line of their own.

## 5. Failed Attempts

- JavaScript's `String.replace` reads `$$` in the replacement as a single `$`, which silently broke SQL `$$` quotes in an edit script. Use `split(from).join(to)` for text edits.
- React's lint rule `set-state-in-effect` flags loaders that call a state-setting function from an effect, even after an `await`. Loaders now subscribe to a promise in the effect and reload by bumping a counter.
- `FormEvent` is deprecated in the current React types; use `SubmitEvent` for form submit handlers.
- `react-refresh/only-export-components`: keep contexts and hooks (`session/authContext.ts`) apart from component files.
- Still true: on Windows, run `npm run preview:e2e` in another terminal before `npm run test:e2e`, and stop the leftover Node process on port 4173 afterwards (`Get-NetTCPConnection -LocalPort 4173`).

## 6. Next Steps

1. After this step's CI passes: apply `20261019120000_photo_format.sql` to staging and set its recorded version, as in D-032. Then merge.
2. Owner: create a first staff account on staging (README, "Staff accounts") and try the panel from a phone, for example with `npm run dev` on the PC and the phone on the same network, until hosting exists. PRD S3: mark an item out of stock in under 10 seconds.
3. Step 7, the Messenger bot, waits for the owner (D-004). Step 8 is next: contact form and its function, staff messages page, FAQ, legal pages, cookie banner and UTM capture, theme toggle, back to top, scroll progress, print styles, favicons and web manifest.
4. Owner: test the m.me link on Android, iPhone and desktop (D-014); check live updates on a real phone over mobile data (PRD S4); find fluent Filipino and Korean reviewers (D-008).
5. Every new migration: after CI passes, apply it to staging as in D-032, until step 10 automates it.
6. Before the menu passes 1,000 published items, page the item reads (ARCHITECTURE 6).
