# Technical Requirements

| | |
|---|---|
| Status | 1.0, approved by the owner on 2026-10-18 |
| Last updated | 2026-10-18 |

This document owns the **technical constraints**: stack and versions, third-party services, environments, and browser and device support. It refers to requirement IDs in [SRS.md](SRS.md) instead of restating them. Environment variable names are listed in the [README](../README.md) from step 3 on.

## 1. Stack and versions

Latest stable versions on 2026-10-18. The lockfile pins exact versions from step 3 on, and this table is updated whenever a major version changes.

| Area | Choice | Version | Notes |
|---|---|---|---|
| Tooling runtime | Node.js LTS | 24.x | Not installed on the development PC yet; needed before step 3 |
| Language | TypeScript | 6.0.x | Not 7.x, because typescript-eslint 8.71 supports TypeScript below 6.1 only ([D-015](DECISIONS.md#d-015-typescript-60-for-now)) |
| Build | Vite | 8.x | |
| UI | React, React DOM | 19.x | |
| Routing | React Router | 8.x | Language URL prefixes (FR-18) |
| Translation | i18next, react-i18next | 26.x, 17.x | Interface text in JSON files per locale |
| Input validation | Zod | 4.x | Same schemas in the browser and in server functions (NFR-SEC-09) |
| Backend | Supabase: Postgres, Auth, Realtime, Storage, Edge Functions | supabase-js 2.x, CLI 2.x | Edge Functions run on Deno, managed by Supabase |
| Error tracking | Sentry | @sentry/react 11.x | |
| Unit tests | Vitest | 5.x | |
| End-to-end tests | Playwright | 1.64.x | Includes axe accessibility checks (NFR-ACC-01) |
| Database tests | pgTAP through `supabase test db` | | RLS proofs (NFR-SEC-01 to NFR-SEC-03) |
| Lint and format | ESLint, typescript-eslint, Prettier | 10.x, 8.x, 3.x | |
| Fonts | Fontsource variable fonts: Fredoka, Nunito, Noto Sans KR | 5.x | Self-hosted ([D-013](DECISIONS.md#d-013-self-hosted-fonts)) |
| CI | GitHub Actions | | Lint, typecheck, tests, dependency audit |
| Dependency updates | Dependabot | | NFR-SEC-18 |

## 2. Third-party services

| Service | Used for | Plan | Notes |
|---|---|---|---|
| Supabase | Database, staff login, live updates, photo storage, server functions | Free to start | Free projects can be paused after a period of low activity; check the current terms before launch. The uptime check (NFR-REL-03) keeps the project active. |
| Sentry | Error tracking | Free developer plan to start | One user; check the event quota before launch |
| GitHub | Code, CI, secret scanning, push protection, Dependabot | Free | The repository is public: everything committed is visible to anyone |
| Meta | Messenger links (v1); Messenger Platform for the bot (Deferred) | Free | The bot needs a Meta developer app, Page admin rights and App Review for messaging permission ([D-004](DECISIONS.md#d-004-messenger-bot-deferred)) |
| Host | Serving the site | Deferred | Must meet section 2.1 |
| Analytics | Visits and Messenger taps after consent | Deferred | Chosen with the host; must load only after consent (FR-55) |

### 2.1 What the host must support

The host chosen under [D-003](DECISIONS.md#d-003-hosting-deferred) must:

1. allow commercial use on the chosen plan,
2. set custom response headers (NFR-SEC-11),
3. serve `index.html` for unknown paths, so links like `/ko/menu` work,
4. create a preview deploy for each pull request,
5. roll back to a previous deploy quickly (NFR-REL-05),
6. serve a custom domain over HTTPS.

| Candidate | Fit |
|---|---|
| Cloudflare Pages | Appears to meet all six on the free plan. Recommended; confirm when deciding. |
| Netlify | Meets the technical points; check the free plan's limits and terms. |
| Vercel | The free Hobby plan is for non-commercial use only, so a shop needs the Pro plan (paid, per member). |
| GitHub Pages | Cannot set custom headers (fails point 2) or make previews (point 4). |

## 3. Environments

| Environment | Frontend | Supabase | Used for |
|---|---|---|---|
| Local | Vite dev server | Local Supabase stack through the Supabase CLI (needs Docker Desktop) | Development and database tests |
| Preview | Per pull request, once a host is chosen | Separate staging project | Reviewing changes |
| Production | Host CDN, deployed from `main` only, once a host is chosen | Production project | The live site |

- If Docker Desktop cannot run on the development PC, database tests run in CI only, and local development uses the staging project.
- Staging and production never share keys or data.
- Sample products ([D-010](DECISIONS.md#d-010-sample-products-until-the-real-list-arrives)) exist only in local and staging data.

## 4. Browser and device support

| Group | Supported |
|---|---|
| Phones (main audience) | Chrome for Android, Samsung Internet, Safari on iOS, and the Facebook and Messenger in-app browsers on Android and iOS: latest two major versions |
| Desktop | Chrome, Edge, Firefox and Safari: latest two major versions |
| Screen width | 320 CSS pixels and up |
| Performance test device | Mid-range Android phone, real or emulated (Lighthouse's default mobile profile), over 4G (NFR-PERF-01) |

Constraints that follow:

- In-app browsers may block the Clipboard API. The copy buttons (FR-25) need a fallback that selects the text and tells the visitor to copy it.
- Browser storage may be unavailable, for example in private browsing. Language, theme and consent choices then fall back to the URL and system settings, and the page still works (FR-19, FR-56, FR-66).
- The site needs JavaScript. A `<noscript>` message shows the phone number and Messenger link.

## 5. Localization

| Topic | Constraint |
|---|---|
| Locales | `en` (default), `fil`, `ko`, as URL prefixes (FR-18) |
| Interface text | JSON files per locale in the repository |
| Item and category text | Stored per locale in the database, English required ([D-007](DECISIONS.md#d-007-item-text-is-stored-per-language)) |
| Prices | `Intl.NumberFormat` with currency `PHP` and `currencyDisplay: "narrowSymbol"`, so every locale shows ₱ |
| Dates and times | `Intl.DateTimeFormat` with time zone `Asia/Manila` (UTC+8, no daylight saving). The database stores times as `timestamptz` (UTC). |
| Fonts | Fredoka and Nunito have no Korean letters. The font stack falls back to Noto Sans KR, which loads only the character ranges a page uses. |

## 6. Other constraints

- Store facts have one source: [BRIEF.md, Project inputs](BRIEF.md#project-inputs). The code reads them from one config file (designed in `SDD.md`, step 2).
- Running costs: no budget is set yet ([PRD Q6](PRD.md#8-open-questions)). Free plans are preferred where they meet the requirements.
- Development PC: Windows 11 with Git and GitHub CLI. Node.js and Docker Desktop are not installed yet.
