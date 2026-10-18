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

Steps 1 (requirements), 2 (design), 3 (repository setup) and 4 (database) of 11 are done. The site is a placeholder page until step 5 builds the menu. Progress and next steps are in [HANDOFF.md](HANDOFF.md).

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

Server secrets never go in `.env` files for the frontend. Where they live is in [docs/ARCHITECTURE.md, section 3](docs/ARCHITECTURE.md#3-deployment).

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint, failing on any warning |
| `npm run format` / `format:check` | Format with Prettier / check formatting |
| `npm run typecheck` | TypeScript checks |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) against the production build |
| `npm run check:bundle` | Fails on source maps, secrets, or initial JavaScript over budget |
| `npm run audit` | Dependency audit, failing on high or critical issues |
| `npm run db:start` / `db:stop` | Start or stop the local Supabase stack (needs Docker) |
| `npm run db:reset` | Rebuild the local database from migrations and sample data |
| `npm run db:test` | Database tests (pgTAP) against the local stack |
| `npm run db:test:pglite` | The same database tests without Docker, in PGlite (development aid; CI decides) |
| `npm run db:lint` | Check database functions for errors |

End-to-end tests on Windows: run `npm run build`, start `npm run preview:e2e` in a second terminal, then run `npm run test:e2e`. Locally they use the installed Microsoft Edge, so no browser download is needed.

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
| [docs/DECISIONS.md](docs/DECISIONS.md) | Every decision and its reasons |
| [CHANGELOG.md](CHANGELOG.md) | Released changes by version |
| [HANDOFF.md](HANDOFF.md) | Where work stands and what comes next |
