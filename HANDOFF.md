# Handoff

Last updated: 2026-10-18

## 1. Goal

Build the Seoul-Mate Minimart menu catalog website described in [docs/BRIEF.md](docs/BRIEF.md), following its implementation order (section 7). Security is the top priority.

## 2. Current State

- Steps 1 to 5 are done: requirements, design (approved by the owner), repository setup, database, and the public catalog.
- The public site works against any Supabase project: menu by category with live availability, search, category filter, English, Filipino and Korean under `/en/`, `/fil/`, `/ko/`, store information, how to order, mobile menu, floating Messenger button. Light and dark themes follow the system setting; the toggle comes in step 8.
- No Supabase account or hosted project exists yet, and Docker is not installed, so the site has not been seen with live data on the development PC. End-to-end tests use a fake Supabase locally; CI also runs `e2e/live-stack.spec.ts` against a real local stack ([D-031](docs/DECISIONS.md#d-031-end-to-end-tests-use-a-fake-supabase-plus-one-live-stack-test-in-ci)).
- Initial JavaScript is 126 KB gzipped of the 170 KB budget ([D-030](docs/DECISIONS.md#d-030-the-public-site-uses-supabases-rest-and-realtime-clients-directly)).
- `main` is protected ([D-026](docs/DECISIONS.md#d-026-protected-main-squash-merges-conventional-commit-titles)).
- Deferred by the owner: hosting ([D-003](docs/DECISIONS.md#d-003-hosting-deferred)) and the Messenger bot ([D-004](docs/DECISIONS.md#d-004-messenger-bot-deferred)).

## 3. Active Files

- App shell: `src/main.tsx`, `src/App.tsx`, `src/app/` (locale route and layout, root redirect, error boundary)
- Catalog: `src/features/catalog/` (`liveMenu.ts` holds the live-update logic, `supabaseMenuSource.ts` the Supabase calls, `MenuSection.tsx` the UI)
- Search, languages, store information: `src/features/search/`, `src/features/i18n/` (translations in `locales/*.json`), `src/features/store-info/`, `src/config/store.ts`
- Shared: `src/components/`, `src/lib/` (`supabase.ts`, `format.ts`, `database.types.ts`), styles in `src/index.css` and one CSS file per area
- Tests: `src/**/*.test.ts(x)`, `src/test/`, `e2e/` (`support/fakeSupabase.ts`), `.github/workflows/ci.yml` (end-to-end job now starts a local Supabase)
- Docs: `docs/SRS.md` (traceability 6.1), `docs/SDD.md` (2.1, 2.2, E3), `docs/DECISIONS.md` (D-030, D-031), `docs/TRD.md`, `docs/ARCHITECTURE.md` (6), `docs/BRIEF.md`, `README.md`, `CHANGELOG.md`

## 4. Changes Made

- Step 5, public catalog, in one pull request: everything in section 2 above, 69 unit tests and 51 end-to-end tests (phone and desktop sizes), all passing locally in Edge.
- Built store information and how to order (FR-22 to FR-26) in this step too, because the hero must say where the store is and how to order. FAQ, contact form, legal pages, cookie banner, theme toggle, back to top, scroll progress and print styles stay in step 8.
- Visual check with screenshots in light and dark, English and Korean, phone and desktop. "Last updated" moved under the Menu heading so the floating button never covers it.

## 5. Failed Attempts

- The full `@supabase/supabase-js` client put initial JavaScript at 157 KB, too close to the budget once Sentry arrives. Replaced with its REST and Realtime packages (D-030).
- Concatenated strings in a `select(...)` call lose their literal type, so the Supabase client typed every row as an error. Keep each column list as one string literal.
- `@typescript-eslint/no-generated-empty-object-type` flags the empty `Views` and `Functions` groups in `database.types.ts`; they carry a disable comment because the client requires them.
- Playwright's `test.skip(({}, testInfo) => ...)` is not allowed: the condition gets fixtures only. The live-stack test skips on `isMobile` instead.
- Suspected that a quick remount would reuse a closing Realtime channel with the same name. It does not: the client drops a channel from its list as soon as it starts leaving. Kept the remount test in `catalog.spec.ts` as a guard.
- Still true: on Windows, Playwright takes about two minutes to stop a preview server it started itself, so run `npm run preview:e2e` in another terminal first.

## 6. Next Steps

1. Merge the step 5 pull request once CI passes. The first real run of `e2e/live-stack.spec.ts` happens there: if it fails, check that `supabase status -o env` still prints `API_URL`, `ANON_KEY` and `SERVICE_ROLE_KEY`.
2. Step 6, admin panel: login, item editing, availability switch, confirmation modals, photo upload, and the local-only staff account script (D-028). It uses the full supabase-js client, lazy-loaded under `/admin`. Decide there how visitors learn a photo's format: today the card tries WebP, then JPEG, so a JPEG-only photo costs one failed request (D-019). Storing the format with the photo, or always uploading both formats, would remove it.
3. Owner: create a Supabase staging project (or install Docker Desktop) to see the site with real data; test the m.me link on an Android phone, an iPhone and a desktop (D-014); find fluent Filipino and Korean reviewers for the drafted text (D-008).
4. Before the menu passes 1,000 published items, page the item reads (ARCHITECTURE 6).
