# Handoff

Last updated: 2026-10-19

## 1. Goal

Build the Seoul-Mate Minimart menu catalog website described in [docs/BRIEF.md](docs/BRIEF.md), following its implementation order (section 7). Security is the top priority.

## 2. Current State

- Steps 1 to 6 are done: requirements, design (approved by the owner), repository setup, database, the public catalog, and the staff panel at `/admin`.
- Step 8 is split in two pull requests. Part 1 (this one) adds the theme toggle, privacy banner with UTM capture, privacy policy and terms in three languages, FAQ drafts, back to top, scroll progress, page titles, print layout, PNG icons and web manifest, and `docs/UI-UX.md`. Part 2 is the contact form, its Edge Function and the staff messages page.
- Step 7, the Messenger bot, waits for the owner (D-004).
- Public site's initial JavaScript is 131 KB of 170 KB; the staff panel and the legal pages are their own chunks.
- Database: five migrations, 97 pgTAP assertions. Staging (`vebcdxmhoeksxnlyrmqf`, free plan, Tokyo) has all five and the sample data ([D-032](docs/DECISIONS.md#d-032-staging-migrations-applied-through-the-supabase-connector-until-step-10)).
- Staging has one staff account, the owner's (eriklmao000@gmail.com, `require_mfa` off), added on 2026-10-19.
- FAQ entries are drafts written from known store facts and marked `todo`; a build with `VITE_APP_ENV=production` fails until the owner approves or replaces them (PRD Q10).
- Privacy policy and terms are drafts awaiting a lawyer (PRD S7) and fluent reviewers for Filipino and Korean (D-008). Before launch, check that they still match what the site does: Sentry (step 10), the host, any analytics provider, and the contact message retention (PRD Q9, 180 days for now).
- Deferred by the owner: hosting ([D-003](docs/DECISIONS.md#d-003-hosting-deferred)) and the Messenger bot ([D-004](docs/DECISIONS.md#d-004-messenger-bot-deferred)).

## 3. Active Files

- Theme: `public/theme-init.js`, `src/features/theme/`, dark tokens under `:root[data-theme='dark']` in `src/index.css`
- Consent and UTM: `src/features/consent/` (`consent.ts`, `utm.ts`, `CookieBanner.tsx`), started in `src/main.tsx`
- Layout: `src/components/FloatingStack.tsx` (back to top, Messenger, banner; publishes `--floating-space`), `ScrollProgress.tsx`, `usePageTitle.ts`, `Footer.tsx`, `src/features/site/site.css`, `src/print.css`
- Content: `src/features/legal/` (content in three languages, `LegalPage.tsx`), `src/features/faq/` (JSON per language, `FaqSection.tsx`)
- Icons: `public/` (favicon PNGs, Apple touch icon, `manifest.webmanifest`), `scripts/generate-icons.mjs`; FAQ production check in `vite.config.ts`
- Tests: `src/features/consent/consent.test.ts`, `src/features/site/siteContent.test.ts`, `e2e/site.spec.ts`
- Docs: `docs/UI-UX.md` (new), `docs/SRS.md` (6.1), `docs/SDD.md` (2.1 tree, 2.2), `docs/DECISIONS.md` (D-036), `README.md`, `CHANGELOG.md`

## 4. Changes Made

- Merged step 6 (#7) at the owner's request to move on, and made the owner's staging login a staff account.
- Step 8 part 1: everything listed in section 2; 97 unit tests and 99 end-to-end tests at phone and desktop sizes pass locally.
- Visual check of the banner, FAQ, legal pages, dark theme and print output; the banner was made more compact on phones.

## 5. Failed Attempts

- JavaScript's `String.replace` reads `$$` in the replacement as a single `$`, and template literals in edit scripts turn `\n` into real line breaks. Use `split(from).join(to)` and check the result.
- React's lint rule `set-state-in-effect` flags state set from an effect, even after an `await`. Subscribe with `useSyncExternalStore` (scroll position, theme, consent) or set state in a promise callback.
- `getByText` on an FAQ question finds the text inside `<summary>`, which cannot take focus; target the `summary` element.
- jsdom has no `ResizeObserver`; components using it must check that it exists.
- Still true: on Windows, run `npm run preview:e2e` in another terminal before `npm run test:e2e`, and stop the leftover Node process on port 4173 afterwards (`Get-NetTCPConnection -LocalPort 4173`).

## 6. Next Steps

1. Merge step 8 part 1 once CI passes and the owner agrees.
2. Step 8 part 2: contact form (FR-29 to FR-31) with the honeypot and consented UTM values, the `contact` Edge Function (SDD 3.2) with origin check, size limit, schema validation and the rate limit, the staff messages page (FR-32), tests, and deploying the function and its secrets to staging.
3. Owner: answer PRD Q10 (FAQ) and Q9 (how long to keep contact messages); find a lawyer for the privacy policy and terms; test the m.me link on Android, iPhone and desktop (D-014); check live updates on a real phone over mobile data (PRD S4).
4. Every new migration: after CI passes, apply it to staging as in D-032, until step 10 automates it.
5. Before the menu passes 1,000 published items, page the item reads (ARCHITECTURE 6).
