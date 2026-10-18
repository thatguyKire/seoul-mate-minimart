# Handoff

Last updated: 2026-10-18

## 1. Goal

Build the Seoul-Mate Minimart menu catalog website described in [docs/BRIEF.md](docs/BRIEF.md), following its implementation order (section 7). Security is the top priority.

## 2. Current State

- Steps 1 (requirements), 2 (design, 15 diagrams) and 3 (repository setup) are done. Steps 1 and 2 were approved by the owner on 2026-10-18.
- The app is a placeholder page. CI runs lint, format, typecheck, unit tests, build, bundle check, dependency audit, end-to-end tests and a PR title check on every pull request.
- `main` is protected ([D-026](docs/DECISIONS.md#d-026-protected-main-squash-merges-conventional-commit-titles)): pull requests only, CI must pass, squash merges, admins included.
- Deferred by the owner: hosting ([D-003](docs/DECISIONS.md#d-003-hosting-deferred)) and the Messenger bot ([D-004](docs/DECISIONS.md#d-004-messenger-bot-deferred)). Steps 7 and 10 wait for the owner's go-ahead.
- Open questions Q4 to Q10 remain in [PRD section 8](docs/PRD.md#8-open-questions); none block step 4.

## 3. Active Files

- Tooling: `package.json`, `eslint.config.js`, `vite.config.ts`, `playwright.config.ts`, `tsconfig*.json`, `scripts/check-bundle.mjs`
- GitHub: `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.github/pull_request_template.md`
- App: `index.html`, `src/`, `e2e/`, `public/favicon.svg`
- Docs: `README.md`, `CHANGELOG.md`, `docs/DECISIONS.md` (D-026, D-027), `docs/TRD.md`

## 4. Changes Made

- Created the GitHub repository; installed GitHub CLI and Node.js 24; logged in as `thatguyKire`.
- Wrote and got approval for the step 1 and step 2 documents; owner review page for the diagrams: https://claude.ai/artifact/A9EzTULr187orGF86kEAyo (private).
- Step 3: app skeleton, strict lint and type rules, unit and end-to-end tests, bundle checker, CI, Dependabot, branch protection, squash-merge settings, Dependabot security updates turned on.
- Verified locally: lint rules reject `console`, `innerHTML`, `dangerouslySetInnerHTML` and accessibility mistakes; the bundle checker fails on a planted service role key, GitHub token and source map; the build contains no `console` calls; initial JavaScript is about 66 KB gzipped of the 170 KB budget.

## 5. Failed Attempts

- `gh` and `node` were "not recognized" in terminals opened before they were installed. Fix: restart the terminal (fully quit VS Code), or use `C:\Program Files\GitHub CLI\gh.exe` and `C:\Program Files\nodejs`.
- `winget` was not on PATH in the automation shell. Calling `%LOCALAPPDATA%\Microsoft\WindowsApps\winget.exe` directly worked.
- First drafts of diagrams 6, 7, 8 and 11 rendered 2,000 to 3,000 pixels wide. Fixed by changing layout directions and trimming; the ER diagram stays wide because Mermaid puts unconnected tables in one row.
- `eslint-plugin-jsx-a11y` does not support ESLint 10 and is unmaintained; replaced by its fork ([D-027](docs/DECISIONS.md#d-027-accessibility-lint-rules-from-the-maintained-fork)).
- On Windows, Playwright takes about two minutes to stop a preview server it started itself (the tests finish in seconds). Starting Vite directly instead of through npm did not help. Workaround: run `npm run preview:e2e` in another terminal first. CI runs on Linux and is not affected.

## 6. Next Steps

1. Step 4, database: Supabase CLI, migrations for the schema in [BACKEND-SCHEMA.md](docs/BACKEND-SCHEMA.md), RLS policies, pgTAP tests proving RLS works, seed data with sample products.
2. Local database tests need Docker Desktop. Without it, they run in CI only (GitHub's Linux runners have Docker).
3. A Supabase account and the staging and production projects are needed before anything is deployed. The owner creates the account; that can wait until after step 4.
