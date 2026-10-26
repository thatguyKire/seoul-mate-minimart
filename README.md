# Seoul-Mate Minimart

Website for **Seoul-Mate Minimart**, *your one stop shop* for Korean goodies and daily needs in Masbate City, Philippines.

- Facebook: https://www.facebook.com/profile.php?id=61594474910928
- Messenger: https://m.me/61594474910928

## What we sell

- Korean snacks & drinks
- Beauty & skincare
- Instant noodles
- Household essentials
- And more!

## Project status

Steps 1 to 6 of 11 are done: requirements, design, repository setup, database, the public menu (live availability, search, English, Filipino and Korean, store information) and the staff panel at `/admin`. Step 8 is done: theme toggle, privacy banner, privacy policy and terms, FAQ, print layout, icons, and the contact form with its Edge Function and the staff messages page. Step 7, the Messenger bot, waits for the owner. The menu shows sample products until the real list arrives. Progress and next steps are in [HANDOFF.md](HANDOFF.md).

## Local setup

Requirements: Node.js 24 or later (see `.nvmrc`) and Git. Docker Desktop is needed only to run the local Supabase stack; without it, use `npm run db:test:pglite` for the database tests.

```sh
npm ci                       # install exact versions from package-lock.json
cp .env.example .env.local   # then fill in the values
npm run dev                  # start the dev server at http://localhost:5173
```

## Environment variables

Listed in [`.env.example`](.env.example). Every `VITE_` variable is built into the public site, so only public values may use that prefix.

| Name | Used for |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (publishable) key, safe only because of RLS |
| `VITE_SENTRY_DSN` | Browser error reports; empty turns them off |
| `VITE_APP_ENV` | `local`, `staging` or `production`; sample products are labeled outside production |

The `contact` Edge Function reads `ALLOWED_ORIGINS` (comma-separated exact origins, such as `http://localhost:5173`) and `CONTACT_IP_SALT` (a long random string) from Edge Function secrets, or locally from `supabase/functions/.env`, which git ignores.

Server secrets never go in `.env` files for the frontend. Where they live is in [docs/ARCHITECTURE.md, section 3](docs/ARCHITECTURE.md#3-deployment).

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run build:e2e` | The same build, pointed at the local Supabase address, for end-to-end tests |
| `npm run preview` | Serve the production build locally, with the site's security headers |
| `npm run lint` | ESLint, failing on any warning |
| `npm run format` / `format:check` | Format with Prettier / check formatting |
| `npm run typecheck` | TypeScript checks |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) against the production build |
| `node scripts/generate-icons.mjs` | Render the PNG icons in `public/` from `public/favicon.svg`, after the favicon changes |
| `npm run check:bundle` | Fails on source maps, secrets, or initial JavaScript over budget |
| `npm run check:maintained` | Fails when a direct dependency has had no activity on npm for 12 months |
| `npm run audit` | Dependency audit, failing on high or critical issues |
| `npm run db:start` / `db:stop` | Start or stop the local Supabase stack (needs Docker) |
| `npm run db:reset` | Rebuild the local database from migrations and sample data |
| `npm run db:test` | Database tests (pgTAP) against the local stack |
| `npm run db:test:pglite` | The same database tests without Docker, in PGlite (development aid; CI decides) |
| `npm run db:lint` | Check database functions for errors |
| `npm run db:staff -- <email> <password>` | Create a staff login on the local stack only; refuses any other database ([D-028](docs/DECISIONS.md#d-028-no-staff-account-in-seed-data)) |

End-to-end tests on Windows: run `npm run build:e2e`, start `npm run preview:e2e` in a second terminal, then run `npm run test:e2e`. The preview server sends the site's real security headers, and any test whose page breaks the Content-Security-Policy fails ([D-039](docs/DECISIONS.md#d-039-security-headers-live-in-one-file-and-the-preview-server-enforces-them-before-a-host-exists)). Locally they use the installed Microsoft Edge, so no browser download is needed. The tests answer Supabase requests themselves, so they need no Docker; `e2e/live-stack.spec.ts`, which needs a real local stack, runs in CI only ([D-031](docs/DECISIONS.md#d-031-end-to-end-tests-use-a-fake-supabase-plus-one-live-stack-test-in-ci)).

To see the site with data in `npm run dev`, put a Supabase project URL and anon (publishable) key in `.env.local`: the staging project's, from its dashboard under Project Settings, API Keys, or a local stack's (`npm run db:start`, needs Docker). Set `VITE_APP_ENV=staging` for the staging project. Without them the menu shows its error state.

## Staff accounts

Staff log in at `/admin`. There is no sign-up: the owner adds each staff member in the Supabase dashboard of the project (staging, and later production):

1. **Authentication, Users, Add user, Create new user.** Enter the email and a password of at least 12 characters with lowercase and uppercase letters and digits, and tick "Auto Confirm User".
2. **Copy the new user's ID** (UID) from the user list.
3. **Table Editor, `admins`, Insert row.** Paste the ID into `user_id`. Set `require_mfa` to `true` to make two-factor login compulsory for this person; they can change the menu only after setting it up.
4. The staff member logs in at `/admin` and can turn on two-factor login under Security.

To remove a staff member, delete their `admins` row, which takes away their rights at once, and then delete the user. A login without an `admins` row can't use the staff panel.

## Contributing

`main` is protected. Every change goes through a pull request that must pass CI, and its title must follow [Conventional Commits](https://www.conventionalcommits.org/), for example `feat(catalog): add search`. Pull requests are squash-merged ([D-026](docs/DECISIONS.md#d-026-protected-main-squash-merges-conventional-commit-titles)).

## Deployment

Not set up yet: hosting is deferred by the owner ([D-003](docs/DECISIONS.md#d-003-hosting-deferred)).

## Documents

| Document | Owns |
|---|---|
| [docs/BRIEF.md](docs/BRIEF.md) | The owner's brief and store facts |
| [docs/PRD.md](docs/PRD.md) | Why and for whom, scope, success criteria, open questions |
| [docs/SRS.md](docs/SRS.md) | Numbered, testable requirements |
| [docs/TRD.md](docs/TRD.md) | Stack, versions, services, environments, browser support |
| [docs/SDD.md](docs/SDD.md) | How each part is built: modules, endpoints, security, error handling, key flows |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components, deployment, caching, scaling, monitoring, backups |
| [docs/BACKEND-SCHEMA.md](docs/BACKEND-SCHEMA.md) | Tables, security policies, functions, storage |
| [docs/APP-FLOW.md](docs/APP-FLOW.md) | Step-by-step user flows |
| [docs/UI-UX.md](docs/UI-UX.md) | Design tokens, components and their states, design rules |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Every decision and its reasons |
| [CHANGELOG.md](CHANGELOG.md) | Released changes by version |
| [HANDOFF.md](HANDOFF.md) | Where work stands and what comes next |
