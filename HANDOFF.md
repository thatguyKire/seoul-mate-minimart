# Handoff

Last updated: 2026-10-26

## 1. Goal

Build the Seoul-Mate Minimart menu catalog website described in [docs/BRIEF.md](docs/BRIEF.md), following its implementation order (section 7). Security is the top priority.

## 2. Current State

- Steps 1 to 6, 8 and 9 are merged: requirements, design (approved by the owner), repository setup, database, the public catalog, the staff panel at `/admin`, the remaining site features, and security hardening (#14, D-039).
- Step 9: `hosting/headers.ts` holds the security headers, the Content-Security-Policy and the caching rules for any host. The local preview server sends the headers, so the whole end-to-end suite runs under the real policy, and a page that breaks it fails its test. Header, policy, framing and injection tests, a stronger bundle secret scan with its own tests, and CI checks for registry signatures and unmaintained dependencies.
- Motion design (owner's request, 2026-10-22, D-038) is on branch `feat/motion`, pull request #12, now up to date with `main` and waiting for the owner to look at it locally. On a desktop with a mouse, the hero rises in, sections and menu cards fade up as they scroll into view, and cards lift and swing on hover. Touch screens get tap-driven motion only (mobile menu, FAQ, banner, press feedback, theme cross-fade, thank-you check). The colors are unchanged. The owner relaxed the brief's motion rule for this; the brief, NFR-ACC-04 and UI-UX were updated to match. All motion runs under the policy with no exceptions.
- Dependabot's #13 (six minor and patch updates) is open; merge only with the owner's approval.
- The repository's `CLAUDE.md` (#11) holds the owner's commit and PR rules: no attribution trailers or lines, short imperative summaries, no force pushes or history rewrites unless asked. On 2026-10-22 the owner had every co-author line removed from `main`'s history and force-pushed (all commit IDs changed).
- The `contact` function runs on staging (version 2, token check off) with `ALLOWED_ORIGINS=http://localhost:5173` and `CONTACT_IP_SALT`, set by the owner in the dashboard. Step 9 added `z.config({ jitless: true })` to its shared schema; that changes no behaviour, so the deployed version need not be redeployed for it. A test message ("Staging test", safe to delete) is on staging.
- Step 7, the Messenger bot, waits for the owner (D-004).
- Public site's initial JavaScript is 133.2 KB of 170 KB with motion (132.5 KB on `main`); the staff panel, the legal pages and the contact form are their own chunks.
- Database: five migrations, 97 pgTAP assertions. Staging (`vebcdxmhoeksxnlyrmqf`, free plan, Tokyo) has all five and the sample data ([D-032](docs/DECISIONS.md#d-032-staging-migrations-applied-through-the-supabase-connector-until-step-10)).
- Staging has one staff account, the owner's (eriklmao000@gmail.com, `require_mfa` off), added on 2026-10-19.
- GitHub secret scanning, push protection, Dependabot alerts and Dependabot security updates are on. Secret scanning for non-provider patterns (generic keys and passwords) is off; the owner may want it on.
- FAQ entries are drafts written from known store facts and marked `todo`; a build with `VITE_APP_ENV=production` fails until the owner approves or replaces them (PRD Q10).
- Privacy policy and terms are drafts awaiting a lawyer (PRD S7) and fluent reviewers for Filipino and Korean (D-008). Before launch, check that they still match what the site does: Sentry (step 10), the host, any analytics provider, and the contact message retention (PRD Q9, 180 days for now).
- Deferred by the owner: hosting ([D-003](docs/DECISIONS.md#d-003-hosting-deferred)) and the Messenger bot ([D-004](docs/DECISIONS.md#d-004-messenger-bot-deferred)).

## 3. Active Files

- Motion: `src/features/motion/` (`motion.ts` with `startMotion`, `reveal`, `revealEach`, `motionMs`; `motion.css`; `motion.test.ts`), tokens and the reduced-motion rule in `src/index.css`, component motion beside each component's styles (`home.css`, `catalog.css`, `layout.css`, `site.css`), `src/print.css`, `e2e/motion.spec.ts`, `reducedMotion: 'reduce'` in `playwright.config.ts`
- Headers: `hosting/headers.ts` and `hosting/headers.test.ts`; `vite.config.ts` (preview server sends all headers, dev server all but the policy); `preview:e2e` and Playwright's web server run `vite preview --mode e2e`, so the policy names the e2e build's Supabase address
- Tests: `e2e/support/test.ts` (fixture that fails a test on any policy violation; every spec imports `test`, `Page` and `Locator` from it), `e2e/security.spec.ts`, the injection test at the end of `e2e/live-stack.spec.ts`
- Secrets and supply chain: `scripts/check-bundle.mjs` with `scripts/check-bundle.test.mjs`; `scripts/check-maintained.mjs`; `.github/workflows/ci.yml` (`npm audit signatures`, `check:maintained`, `check:bundle` on the e2e build)
- Zod: `z.config({ jitless: true })` at the top of `src/features/admin/schemas.ts` and `supabase/functions/_shared/contactSchema.ts`
- Docs: `docs/DECISIONS.md` (D-038, D-039), `docs/UI-UX.md` (2.4 Motion), `docs/SDD.md` (2.1 tree, 2.2 motion row, 5.5 to 5.7, 5.9), `docs/SRS.md` (NFR-ACC-04, NFR-SEC-11 and their traceability rows), `docs/ARCHITECTURE.md` (4), `docs/BRIEF.md` (section 5), `README.md`, `CHANGELOG.md`

## 4. Changes Made

- Merged #14 (step 9) at the owner's request, then merged `main` into `feat/motion` (a merge commit, no force push): kept both decisions and both sets of changelog lines, and pointed `e2e/motion.spec.ts` at the policy-checking fixture. On the merged branch, 132 unit tests and 131 end-to-end tests pass locally (29 skipped: live-stack tests run in CI only; header tests and some motion tests run in one project only); lint, typecheck and the bundle check are clean.
- Step 9: audit 0 vulnerabilities, signatures verified for all 275 packages, all 37 direct dependencies active within 12 months, no secrets in any commit in git history. In CI the real-database injection test passed and the bundle check covered the e2e build with 4 secret settings set. Running the suite under the policy found that Zod's check for `new Function` was reported as a violation on every page with a form.
- Motion: frames checked by eye (hero, card cascade, card hover swing, nav underline, language list, mobile menu). Fixed on the way: printing the menu included the contact form (FR-68).

## 5. Failed Attempts

- A page fulfilled by `page.route` cannot frame the local preview server: Chrome blocks it with `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`, whatever the headers. The framing test serves the other site from a second local server instead.
- `fake.requests` in `fakeSupabase.ts` holds paths only, without the query string; listen to `page.on('request')` to check full addresses.
- Importing from `zod/v4/core` in `main.tsx` pulls most of Zod into the first page (22 KB more).
- Motion tests: exits last 250ms, so checking `data-closing` or `data-leaving` from the test races the animation. `recordExit` in `motion.spec.ts` has the page note the animation when the exit starts. On a 1280 by 720 desktop the first menu card is below the fold, so it stays pending until scrolled to.
- Classes added from JavaScript are wiped when React rewrites `className` (item cards change class when stock changes), so the reveal state is a `data-reveal` attribute.
- JavaScript's `String.replace` reads `$$` in the replacement as a single `$`, and template literals in edit scripts turn `\n` into real line breaks. Use `split(from).join(to)` and check the result. Bash heredocs that hold JavaScript with backticks and quotes fail to parse: write such scripts to a file with an editor tool.
- React's lint rule `set-state-in-effect` flags state set from an effect, even after an `await`. Subscribe with `useSyncExternalStore` (scroll position, theme, consent) or set state in a promise callback.
- `getByText` on an FAQ question finds the text inside `<summary>`, which cannot take focus; target the `summary` element.
- jsdom has no `ResizeObserver`, `IntersectionObserver` or `matchMedia`; code using them must check that they exist.
- Still true: on Windows, run `npm run preview:e2e` in another terminal before `npm run test:e2e`, and stop the leftover Node process on port 4173 afterwards (`Get-NetTCPConnection -LocalPort 4173`). After `npm run build`, run `npm run build:e2e` again before the end-to-end tests: the preview server serves whatever is in `dist/`.

## 6. Next Steps

1. Merge the motion pull request (#12) once CI passes and the owner agrees after looking at it.
2. Step 10, hosting, caching, error tracking and monitoring, waits for the owner's choice of host (D-003). It translates `hosting/headers.ts` into the host's format, adds the Sentry ingest address to the policy, and runs `e2e/security.spec.ts`'s header checks against the host's preview deploy. Step 7 still waits for the owner.
3. When the site gets a real address, add it to the `contact` function's `ALLOWED_ORIGINS` secret, or the form refuses it.
4. Owner: answer PRD Q10 (FAQ) and Q9 (how long to keep contact messages); find a lawyer for the privacy policy and terms; test the m.me link on Android, iPhone and desktop (D-014); check live updates and the mobile motion on a real phone over mobile data (PRD S4); consider turning on secret scanning for non-provider patterns.
5. Every new migration: after CI passes, apply it to staging as in D-032, until step 10 automates it.
6. Before the menu passes 1,000 published items, page the item reads (ARCHITECTURE 6).
