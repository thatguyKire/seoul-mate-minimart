# Decisions

Each entry records one decision: date, context, the choice, and the alternatives considered. Entries are never deleted. A reversed decision gets a new entry, and the old one is marked "Replaced by D-xxx".

---

## D-001: Visitors never log in, only staff do

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The brief (section 1.2) makes the catalog public and read-only, and needs staff to keep it current.
- **Decision:** Visitors never log in. Staff log in at `/admin`. There is no public sign-up: the owner creates staff accounts in the Supabase dashboard and adds them to the `admins` table, and only users in that table can write (NFR-SEC-03).
- **Alternatives considered:** Customer accounts (rejected: no feature needs them, and they would mean storing more personal data). Open sign-up with admin approval (rejected: an extra attack surface for a small team).

## D-002: Stack follows the brief's defaults

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The owner left the stack inputs blank, which means the brief's defaults.
- **Decision:** Vite, React and TypeScript for the frontend. Supabase for database, auth, live updates and storage. Sentry for errors. Rule-based replies, with no AI model, for the future bot. Versions are in [TRD.md](TRD.md#1-stack-and-versions).
- **Alternatives considered:** A server-rendered framework such as Next.js (rejected: it would tie the code to a server-capable host while hosting is undecided, and the brief's default is a static frontend).

## D-003: Hosting deferred

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The owner said not to set up hosting yet. While checking the brief's default host, two problems came up: Vercel's free Hobby plan is for non-commercial use only, and GitHub Pages cannot set the security headers the brief requires (NFR-SEC-11).
- **Decision:** Choose the host later, against the checklist in [TRD.md, section 2.1](TRD.md#21-what-the-host-must-support). Cloudflare Pages is recommended. Until then, the build stays host-neutral, and the analytics provider waits too because it may come with the host. Step 10 of the implementation order waits for the owner's go-ahead.
- **Alternatives considered:** Vercel Hobby (rejected: not allowed for commercial use). Vercel Pro (possible, but paid). GitHub Pages (rejected: fails the header requirement).
- **Consequence:** NFR-SEC-11 and NFR-REL-05 cannot be verified until a host is chosen.

## D-004: Messenger bot deferred

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The owner said not to build the Messenger bot yet. A bot also needs a Meta developer app, Page admin rights, and Meta App Review before it can reply to ordinary customers. Review can take days to weeks.
- **Decision:** v1 uses plain Messenger links only (FR-27, FR-28). The bot requirements stay in the SRS, marked Deferred, and the database design includes what the bot will need, so adding it later needs no schema rework. Step 7 of the implementation order waits for the owner's go-ahead.
- **Alternatives considered:** Meta Business Suite's built-in instant replies for the greeting. These need no code and could cover FR-49 in the meantime, but they cannot check stock (FR-50). Worth suggesting to the owner as a stopgap.

## D-005: Server code runs on Supabase Edge Functions

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The contact form needs server-side validation and rate limiting (FR-30, NFR-SEC-09, NFR-SEC-16), and the bot will need a webhook. Hosting is undecided (D-003).
- **Decision:** Run server code as Supabase Edge Functions, so it works whichever host serves the frontend.
- **Alternatives considered:** The host's own functions, such as Cloudflare Pages Functions (rejected for now: they would tie the code to a host that is not chosen yet). A separate server (rejected: more cost and upkeep).
- **Trade-offs:** Edge Functions run on Deno, not Node. They can access the service role key, so each function must use it only where needed, and they must limit cross-origin requests to the site's origin (NFR-SEC-12).

## D-006: Three languages, each with its own URL

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The owner wants English, Filipino and Korean, with a button that switches the whole site.
- **Decision:** Locales `en`, `fil` and `ko`, each under its own URL prefix (`/en/`, `/fil/`, `/ko/`). The visitor's choice is remembered. A first visit to the root uses the browser's language if supported, otherwise English (FR-16 to FR-21).
- **Alternatives considered:** Language kept only in browser storage, with one URL for all (rejected: a shared link would not open in the sender's language, and search engines see one language). An automatic translation widget (rejected: poor translation quality, extra third-party scripts that break the CSP, and privacy concerns).

## D-007: Item text is stored per language

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** Item and category names and descriptions change often and are edited by staff, so they cannot live in the code's translation files.
- **Decision:** The database stores names and descriptions per locale. English is required; Filipino and Korean are optional and fall back to English when missing (FR-21, FR-38). The table layout is designed in `BACKEND-SCHEMA.md` (step 2).
- **Alternatives considered:** English only for item text (rejected: Korean speakers are part of the audience). Machine translation when saving (rejected: unreviewed text and an extra paid service).

## D-008: Translations are reviewed by fluent speakers

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The brief bans generic, AI-sounding copy. Drafted Filipino and Korean text may read unnaturally.
- **Decision:** Filipino and Korean interface text is drafted during development and marked as needing review. Fluent speakers review it before launch (PRD S6).
- **Alternatives considered:** Launching with unreviewed drafts (rejected).

## D-009: Legal pages in three languages, English prevails

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The whole site switches language (D-006), but legal text must be exact, and it needs legal review.
- **Decision:** The privacy policy and terms are available in all three languages. Each page states that the English version prevails if the versions differ. All versions are marked as needing legal review (FR-58, FR-59, PRD S7).
- **Alternatives considered:** English-only legal pages (rejected: Filipino and Korean readers could not understand what they agree to).

## D-010: Sample products until the real list arrives

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The owner does not have the product list yet. The brief forbids fake information on the live site.
- **Decision:** Seed data uses sample products, based on product types visible in the store's Facebook banner, with made-up prices. Every sample row is flagged in the database, and non-production environments show a visible "Sample" label on those items. Sample data never goes to production, and launch is blocked while any sample row remains (PRD S5).
- **Alternatives considered:** An empty catalog until the list arrives (rejected: the menu cannot be built or tested without data).

## D-011: Pickup only, orders through Messenger

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The owner said there is no delivery yet.
- **Decision:** The site does not take orders or payment. Customers order through Messenger, pick up in store, and pay with cash or GCash (owner, 2026-10-18) (FR-26).
- **Alternatives considered:** On-site cart and checkout (rejected: out of scope, and it would mean handling payments and more personal data).

## D-012: Availability is yes or no, not a quantity

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** Staff need to update availability in seconds (PRD G6), and there is no inventory system to sync with.
- **Decision:** Each item is either available or out of stock.
- **Alternatives considered:** Stock counts (rejected: staff would have to update numbers after every sale, and counts drift without a point-of-sale link).

## D-013: Self-hosted fonts

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The owner approved Fredoka, Nunito and Noto Sans KR. Loading them from Google Fonts would send every visitor's IP address to Google before consent, and would widen the CSP.
- **Decision:** Self-host the fonts through Fontsource packages (NFR-PRIV-02).
- **Alternatives considered:** Google Fonts CDN (rejected for the privacy and CSP reasons above).

## D-014: Messenger link uses the Page ID

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The Facebook Page has no username (its URL is `profile.php?id=61594474910928`), and m.me links normally use one.
- **Decision:** Use `https://m.me/61594474910928`, and test it on Android, iOS and desktop during step 5. If the owner sets a Page username (PRD Q8), switch to it, changing only the store facts config.
- **Alternatives considered:** Linking to the Facebook Page instead of Messenger (rejected: adds a step before the customer can message).

## D-015: TypeScript 6.0 for now

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** TypeScript 7.0 is the latest release, but typescript-eslint 8.71, the latest, supports TypeScript below 6.1 only. Linting is required in CI.
- **Decision:** Use TypeScript 6.0.x. Move to 7.x once typescript-eslint supports it.
- **Alternatives considered:** TypeScript 7 without type-aware linting (rejected: weaker CI checks).

## D-016: Admin session limits

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The brief requires session expiry. Staff use the admin panel on a phone throughout the day, so very short sessions would mean frequent logins at the counter. Security has priority, but a lost or shared phone is the main risk to manage.
- **Decision:** A session ends after 60 minutes without activity, or 12 hours after login, whichever comes first (FR-46). Staff can log out at any time. How Supabase Auth enforces this, and which settings depend on the Supabase plan, is designed in `SDD.md` (step 2).
- **Alternatives considered:** 15-minute idle timeout (rejected: too much friction for counter use). No expiry (rejected: the brief requires it).

## D-017: Search runs in the browser

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The menu is expected to stay well under 2,000 items (PRD A3), and the browser already holds the full published menu for live availability. Postgres full-text search has no built-in Korean dictionary.
- **Decision:** Search filters the loaded menu in the browser (FR-12 to FR-15). No search endpoint exists, so search needs no rate limiting. Revisit if the menu grows past about 2,000 items.
- **Alternatives considered:** Database search through a function using trigram matching (rejected for now: an extra endpoint to secure and rate-limit, for no gain at this size).

## D-018: Text wordmark until a logo exists

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The owner has no original logo file (PRD Q11). The only artwork is a screenshot of the Facebook banner, which is low resolution and shows other brands' packaging.
- **Decision:** The site shows "Seoul-Mate Minimart" as a text wordmark in Fredoka, using the brand colors. The favicon is a simple SVG letter mark in the same colors. The brand colors stay as estimates from the banner. The banner screenshot is not used on the site. When a logo exists, it replaces the wordmark and favicon, and the colors are matched to it.
- **Alternatives considered:** Cropping the logo from the banner screenshot (rejected: blurry at favicon and header sizes). Commissioning a generated logo (rejected: the brief bans AI-generated imagery).

## D-019: Photos are processed in the staff member's browser

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** Photos must be resized, converted, and stripped of EXIF and location data (FR-44). Image resizing on the server needs either a paid Supabase feature or heavy image libraries inside Edge Functions, which have tight CPU limits. Some browsers, notably Safari, may not be able to encode WebP.
- **Decision:** The admin panel checks the original file (type by its first bytes, size up to 5 MB), then redraws it on a canvas at three widths. Redrawing drops all metadata. It encodes WebP, or JPEG if the browser cannot produce WebP, and uploads only the processed files. The storage bucket accepts only WebP and JPEG under 1 MB, from staff only (NFR-SEC-14).
- **Alternatives considered:** Supabase image transformations (rejected for now: paid plan). Processing in an Edge Function (rejected: CPU limits).
- **Security trade-off:** Metadata stripping happens on the staff member's device, so a staff member who bypassed the admin panel could upload a file that still has metadata. Only staff can upload at all, and staff can already change everything on the menu, so this adds no new risk.

## D-020: Live updates through a one-row version table

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** Visitors must see changes within 5 seconds (FR-06), including items being hidden. Supabase Realtime filters database change events through RLS, so when an item is hidden, visitors never receive that change. Realtime's public broadcast channels let any client send messages, so attackers could push fake updates.
- **Decision:** A one-row `menu_state` table holds a version number. A statement-level trigger on `items` and `categories` bumps it once per change, even for bulk actions. Visitors subscribe to changes on that row and reload the published menu through the normal RLS-protected API, waiting 300 ms to batch further changes. Only the database creates these events, so they cannot be faked. If Realtime is unavailable, the page checks the version every 10 seconds instead.
- **Alternatives considered:** Subscribing to `items` changes directly (rejected: misses hidden items). Public broadcast channel (rejected: anyone could send fake events). Polling only (rejected: slower and more load).

## D-021: Translated text in one column per language

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** Item and category text is stored per language (D-007), for exactly three languages.
- **Decision:** Each translated field has one column per language, such as `name_en`, `name_fil` and `name_ko`. English columns are required and the others are nullable. Database constraints check each column's length.
- **Alternatives considered:** A separate translations table (rejected: more joins and harder RLS for no benefit with three fixed languages). One JSON column per field (rejected: weaker constraints). Adding a fourth language later means a migration, which is acceptable.

## D-022: Staff token sent in a header, not a cookie

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The brief requires CSRF protection for admin forms. CSRF works because browsers attach cookies automatically. Supabase's client sends the staff session as an `Authorization` header instead, which browsers never attach on their own, and keeps it in browser storage.
- **Decision:** Keep Supabase's header-based session. This rules out CSRF by design (NFR-SEC-13). The cost is that a script injected into the page could read the token, so XSS defenses carry the weight: a strict CSP with no inline or third-party scripts on admin pages, React's escaping, a lint rule banning raw HTML rendering, and short-lived access tokens (15 minutes).
- **Alternatives considered:** Cookie-based sessions through a server, with CSRF tokens (rejected: needs a server in front of Supabase and a host that runs it, while hosting is undecided).

## D-023: Messenger webhook limits by sender, not by IP

- **Date:** 2026-10-18
- **Status:** Accepted (applies when the bot is built, D-004)
- **Context:** The brief asks for a per-IP rate limit on the webhook. All genuine webhook calls come from Meta's servers, so a per-IP limit would throttle Meta itself, not abusers.
- **Decision:** The webhook first rejects bodies over 64 KB, then checks the signature, which needs no database call, so forged requests are rejected cheaply. Valid events are then limited per Messenger sender, so one customer cannot make the bot flood the Page.
- **Alternatives considered:** Per-IP limit as written (rejected: limits the wrong party). This is a deviation from the brief's wording, made for security reasons.

## D-024: Admin login uses Supabase Auth's rate limits

- **Date:** 2026-10-18
- **Status:** Accepted, to verify in step 6
- **Context:** Staff log in directly against Supabase Auth, which has its own per-IP rate limits for sign-in. The brief asks for `429` with `Retry-After`.
- **Decision:** Use Supabase Auth's built-in limits, set in the Auth settings. In step 6, check whether Auth's `429` responses include `Retry-After`. If they do not, add a small login function that applies the project's own limit before passing the login to Auth.
- **Alternatives considered:** Always routing login through our own function (deferred: more code that handles passwords, only needed if the built-in limits fall short).

## D-025: Admin panel in English only for v1

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The public site has three languages (D-006). The admin panel is used only by a few staff members, and every translated string adds review work (D-008).
- **Decision:** The admin panel is in English for v1, built on the same translation system so other languages can be added later. Item text is still entered in all three languages.
- **Alternatives considered:** All three languages in the admin panel (rejected for v1: triples the review work for a handful of users). Revisit if staff prefer Filipino.

## D-026: Protected main, squash merges, Conventional Commit titles

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The brief requires a protected `main`, pull requests that pass CI, and Conventional Commit messages. The project has one owner, so nobody else can approve a pull request.
- **Decision:** `main` requires a pull request and passing CI checks (lint, format, typecheck, unit tests, build, bundle check, dependency audit, end-to-end tests, PR title), with no required approvals. The rules apply to admins too, and force pushes and deletion are blocked. Pull requests are squash-merged using the PR title as the commit message, so a CI check on the title enforces Conventional Commits for every commit on `main`. Branches are deleted after merging.
- **Alternatives considered:** Requiring one approval (rejected: a single owner cannot approve their own pull request). A commit message linter on every commit (rejected: squash merging makes the PR title the only message that reaches `main`, so checking the title is enough without another dependency).

## D-027: Accessibility lint rules from the maintained fork

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** `eslint-plugin-jsx-a11y` is the usual accessibility linter for React, but its last release was in October 2024 and it does not support ESLint 10. That makes it unmaintained by NFR-SEC-18's definition.
- **Decision:** Use `eslint-plugin-jsx-a11y-x`, a fork by the es-tooling project that supports ESLint 10 (latest release May 2026, about 110,000 weekly downloads), with its strict preset. axe checks in the end-to-end tests (step 5 onward) cover what static rules cannot.
- **Alternatives considered:** The original plugin with forced peer dependencies (rejected: unmaintained). Staying on ESLint 9 (rejected: its maintenance period has ended). No accessibility linting (rejected: catches problems earlier than end-to-end tests).

## D-028: No staff account in seed data

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The design planned one test staff account in the local seed data. `supabase/seed.sql` can also be applied to the staging project, which is reachable from the internet, and the seed file is public in this repository. A staff account created there would have a publicly known password.
- **Decision:** `seed.sql` holds sample menu data only. A local staff account for testing the admin panel is created in step 6 by a separate script that refuses to run against anything but the local database. Staging and production staff accounts are created only by the owner.
- **Alternatives considered:** A seeded staff account with a password from an environment variable (rejected: seed files cannot read environment variables, and a mistake would expose an admin account).

## D-029: Local database tests in PGlite, CI as the source of truth

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The real database tests need Docker for the local Supabase stack, and the development PC has no Docker. Pushing untested SQL and waiting for CI on every mistake is slow.
- **Decision:** CI runs the pgTAP tests against a real local Supabase stack on every pull request; that result decides. During development, the same migrations, seed and test files can also run in PGlite (Postgres compiled to WebAssembly, with pgTAP) on top of a small imitation of Supabase's roles and schemas. The harness is `scripts/db-test-pglite.mjs` (`npm run db:test:pglite`), a development aid only. It found three real test bugs before the first push.
- **Alternatives considered:** Installing Docker Desktop (still possible later; it needs WSL 2 and administrator rights). Testing only in CI (rejected as the only option: slow feedback).

## D-030: The public site uses Supabase's REST and Realtime clients directly

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The public site may load 170 KB of gzipped JavaScript (NFR-PERF-02). With the full `@supabase/supabase-js` client, the first build of the catalog loaded 157 KB, because that client always bundles login, storage and functions code. Sentry, added in step 10, needs roughly another 25 to 30 KB. Visitors never log in or upload anything (D-001).
- **Decision:** The public site creates `@supabase/postgrest-js` and `@supabase/realtime-js` clients itself (`src/lib/supabase.ts`), sending the same headers supabase-js sends without a session. Initial JavaScript dropped to 126 KB. The admin panel (step 6) uses the full supabase-js client, loaded only under `/admin`. Both packages are the ones supabase-js itself is built from, at the same version.
- **Alternatives considered:** The full client everywhere (rejected: leaves no room for Sentry within the budget). Raising the budget (rejected: phones on 4G are the main audience, NFR-PERF-01).
- **Consequence:** When Supabase changes how its client authenticates, `src/lib/supabase.ts` must follow. Dependabot updates the two packages together with supabase-js.

## D-031: End-to-end tests use a fake Supabase, plus one live-stack test in CI

- **Date:** 2026-10-18
- **Status:** Accepted
- **Context:** The end-to-end tests must cover live updates, a dropped live connection and a failing menu (FR-06, FR-09, FR-11). A real Supabase stack cannot easily stage a dropped connection, and the development PC has no Docker (D-029). The fake alone, though, cannot prove that Row Level Security and Realtime work together in the browser.
- **Decision:** `e2e/support/fakeSupabase.ts` answers the public site's database API requests and speaks Realtime's websocket protocol, so most end-to-end tests are fast, run anywhere, and can drop the connection on demand. `e2e/live-stack.spec.ts` runs only in CI, against a local Supabase stack with the seed data: it checks that hidden items never reach the browser and that a change made in the database reaches an open page within 5 seconds. CI builds the site for these tests with `npm run build:e2e`, which points it at the local stack.
- **Alternatives considered:** Only the real stack (rejected: no local runs without Docker, and dropped connections are hard to stage). Only the fake (rejected: would not catch a broken policy, grant or Realtime publication).
