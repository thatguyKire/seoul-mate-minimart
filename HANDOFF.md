# Handoff

Last updated: 2026-10-22

## 1. Goal

Build the Seoul-Mate Minimart menu catalog website described in [docs/BRIEF.md](docs/BRIEF.md), following its implementation order (section 7). Security is the top priority.

## 2. Current State

- Steps 1 to 6 and 8 are done: requirements, design (approved by the owner), repository setup, database, the public catalog, the staff panel at `/admin`, and the remaining site features.
- Motion design (owner's request, 2026-10-22, D-038): on a desktop with a mouse, the hero rises in, sections and menu cards fade up as they scroll into view, and cards lift and swing on hover. Touch screens get tap-driven motion only (mobile menu, FAQ, banner, press feedback, theme cross-fade, thank-you check). The colors are unchanged. The owner relaxed the brief's motion rule for this; the brief, NFR-ACC-04 and UI-UX were updated to match.
- Step 8 came in two pull requests: part 1 (#8) and part 2 (#9, contact form, `contact` Edge Function D-037, staff messages page). The function runs on staging (version 2, token check off) with `ALLOWED_ORIGINS=http://localhost:5173` and `CONTACT_IP_SALT`, set by the owner in the dashboard because Supabase paused saving secrets through the connector on 2026-10-19. A test message ("Staging test", safe to delete) is on staging.
- The repository's `CLAUDE.md` (#11) holds the owner's commit and PR rules: no attribution trailers or lines, short imperative summaries, no force pushes or history rewrites unless asked. On 2026-10-22 the owner had every co-author line removed from `main`'s history and force-pushed (all commit IDs changed).
- Step 7, the Messenger bot, waits for the owner (D-004).
- Public site's initial JavaScript is 133.2 KB of 170 KB; the staff panel, the legal pages and the contact form are their own chunks.
- Database: five migrations, 97 pgTAP assertions. Staging (`vebcdxmhoeksxnlyrmqf`, free plan, Tokyo) has all five and the sample data ([D-032](docs/DECISIONS.md#d-032-staging-migrations-applied-through-the-supabase-connector-until-step-10)).
- Staging has one staff account, the owner's (eriklmao000@gmail.com, `require_mfa` off), added on 2026-10-19.
- FAQ entries are drafts written from known store facts and marked `todo`; a build with `VITE_APP_ENV=production` fails until the owner approves or replaces them (PRD Q10).
- Privacy policy and terms are drafts awaiting a lawyer (PRD S7) and fluent reviewers for Filipino and Korean (D-008). Before launch, check that they still match what the site does: Sentry (step 10), the host, any analytics provider, and the contact message retention (PRD Q9, 180 days for now).
- Deferred by the owner: hosting ([D-003](docs/DECISIONS.md#d-003-hosting-deferred)) and the Messenger bot ([D-004](docs/DECISIONS.md#d-004-messenger-bot-deferred)).

## 3. Active Files

- Motion: `src/features/motion/` (`motion.ts` with `startMotion`, `reveal`, `revealEach`, `motionMs`; `motion.css`; `motion.test.ts`), tokens and the reduced-motion rule in `src/index.css`, component motion beside each component's styles (`home.css`, `catalog.css`, `layout.css`, `site.css`), `src/print.css`, `e2e/motion.spec.ts`, `reducedMotion: 'reduce'` in `playwright.config.ts`
- Contact: `supabase/functions/_shared/contactSchema.ts`, `supabase/functions/contact/`, `src/features/contact/ContactForm.tsx`, `src/features/admin/pages/MessagesPage.tsx`, `e2e/contact.spec.ts`, `e2e/live-stack.spec.ts`
- Theme: `public/theme-init.js`, `src/features/theme/`, dark tokens under `:root[data-theme='dark']` in `src/index.css`
- Consent and UTM: `src/features/consent/` (`consent.ts`, `utm.ts`, `CookieBanner.tsx`), started in `src/main.tsx`
- Layout: `src/components/FloatingStack.tsx`, `MobileMenu.tsx`, `ScrollProgress.tsx`, `usePageTitle.ts`, `Footer.tsx`, `src/features/site/site.css`
- Docs: `docs/UI-UX.md` (2.4 Motion, design rules), `docs/DECISIONS.md` (D-038), `docs/SRS.md` (NFR-ACC-04 and its traceability row), `docs/SDD.md` (2.1 tree, 2.2 motion row), `docs/BRIEF.md` (section 5), `CHANGELOG.md`

## 4. Changes Made

- Motion: 115 unit tests (7 new) and 120 end-to-end tests at phone and desktop sizes pass locally, including 11 in `motion.spec.ts` (rich desktop, phones, reduced motion, axe after every reveal, printing before scrolling). Frames checked by eye: hero, card cascade, card hover swing, nav underline, language list, mobile menu.
- Fixed on the way: printing the menu included the contact form (FR-68); `.contact` is now hidden in print and checked in `site.spec.ts`.
- Merged #9 (step 8 part 2) and #11 (`CLAUDE.md`) at the owner's request; rewrote `main`'s messages and force-pushed with the owner's approval.
- Step 8: theme, banner, legal pages, FAQ, print layout, icons, contact form and function, staff messages page; checked on staging that a forged `X-Forwarded-For` cannot dodge the contact rate limit (SDD 3.2).

## 5. Failed Attempts

- JavaScript's `String.replace` reads `$$` in the replacement as a single `$`, and template literals in edit scripts turn `\n` into real line breaks. Use `split(from).join(to)` and check the result. Bash heredocs that hold JavaScript template literals can fail to parse: write such scripts to a file with an editor tool.
- React's lint rule `set-state-in-effect` flags state set from an effect, even after an `await`. Subscribe with `useSyncExternalStore` (scroll position, theme, consent) or set state in a promise callback.
- Motion tests: exits last 250ms, so checking `data-closing` or `data-leaving` from the test races the animation. `recordExit` in `motion.spec.ts` has the page note the animation when the exit starts. On a 1280 by 720 desktop the first menu card is below the fold, so it stays pending until scrolled to.
- Classes added from JavaScript are wiped when React rewrites `className` (item cards change class when stock changes), so the reveal state is a `data-reveal` attribute.
- `getByText` on an FAQ question finds the text inside `<summary>`, which cannot take focus; target the `summary` element.
- jsdom has no `ResizeObserver`, `IntersectionObserver` or `matchMedia`; code using them must check that they exist.
- Still true: on Windows, run `npm run preview:e2e` in another terminal before `npm run test:e2e`, and stop the leftover Node process on port 4173 afterwards (`Get-NetTCPConnection -LocalPort 4173`).

## 6. Next Steps

1. Merge the motion pull request once CI passes and the owner agrees.
2. Step 9, security hardening: headers and CSP (SDD 5.5) in the host-neutral config file, dependency audit, bundle secret scan, injection tests. The theme cross-fade (View Transitions) and `style.setProperty` for reveal delays need no CSP exceptions. Step 7 still waits for the owner.
3. When the site gets a real address, add it to the `contact` function's `ALLOWED_ORIGINS` secret, or the form refuses it.
4. Owner: answer PRD Q10 (FAQ) and Q9 (how long to keep contact messages); find a lawyer for the privacy policy and terms; test the m.me link on Android, iPhone and desktop (D-014); check live updates and the mobile motion on a real phone over mobile data (PRD S4).
5. Every new migration: after CI passes, apply it to staging as in D-032, until step 10 automates it.
6. Before the menu passes 1,000 published items, page the item reads (ARCHITECTURE 6).
