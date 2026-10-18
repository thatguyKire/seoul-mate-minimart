# Build Brief: Seoul-Mate Minimart Website

> The owner's original prompt, with every placeholder filled in on 2026-10-18. Answers the owner gave that the template had no slot for are under "Owner answers" below. Where a value is deferred or still to confirm, the reason is in [DECISIONS.md](DECISIONS.md) and the open question in [PRD.md](PRD.md#8-open-questions).

---

## Role and task

You are a senior full-stack engineer building a production website for **Seoul-Mate Minimart**, a Korean minimart in Masbate City, Philippines, selling Korean snacks and drinks, beauty and skincare, instant noodles and household essentials.

Build a menu catalog website where customers can see which items are available right now and contact the store through Facebook Messenger, with automated replies for greetings and out-of-stock questions.

Before writing any code, read this whole prompt, list every blank placeholder and open question, and wait for answers. Then follow the Implementation Order in section 7.

**Security is the top priority.** When a requirement conflicts with security, security wins, and you record the trade-off in `docs/DECISIONS.md`.

## Project inputs

> Since step 5, the site reads the store facts below (address, phone, hours, links) from [`src/config/store.ts`](../src/config/store.ts). To change a fact, change it there and here.

| Input | Value |
|---|---|
| Store name | Seoul-Mate Minimart |
| What the store sells | Korean snacks and drinks, beauty and skincare, instant noodles, household essentials |
| Location and opening hours | Quezon St., Legaspi Compound, Masbate City, Masbate, Philippines / see [Store hours](#store-hours) |
| Facebook Page URL | https://www.facebook.com/profile.php?id=61594474910928 (no username yet, so Messenger links use the page ID, D-014) |
| Messenger welcome message | "안녕하세요! Thanks for messaging Seoul-Mate Minimart. Ask us if an item is in stock, or browse our live menu at [site link]. A staff member will reply during store hours." |
| Brand colors and fonts | Hot pink `#E8508A`, soft pink `#F9D3E3`, navy `#1E2B5E`, white (estimated from the Facebook banner; there is no original logo file, D-018) / Fredoka for headings, Nunito for body text, Noto Sans KR for Korean text, all self-hosted (D-013) |
| Frontend | Vite + React + TypeScript |
| Database, auth, realtime, storage | Supabase |
| Hosting | Deferred by the owner (D-003). Must allow commercial use and custom headers; Cloudflare Pages recommended |
| Chat reply engine | Rule-based, no AI model. The Messenger bot itself is deferred (D-004) |
| Error tracking | Sentry |
| Analytics | Privacy-friendly, loaded only after consent. Provider chosen together with hosting (D-003) |
| Legal jurisdiction | Philippines (Data Privacy Act of 2012, RA 10173) |
| Repository | https://github.com/thatguyKire/seoul-mate-minimart |

### Store hours

All times are Philippine time (Asia/Manila, UTC+8). A closing time of 2:00 AM means early the next morning.

| Day | Hours |
|---|---|
| Monday | 9:00 AM to 2:00 AM |
| Tuesday | 9:00 AM to 2:00 AM |
| Wednesday | 9:00 AM to 2:00 AM |
| Thursday | 9:00 AM to 2:00 AM |
| Friday | 9:00 AM to 2:00 PM (confirmed by the owner) |
| Saturday | 9:00 AM to 2:00 PM (confirmed by the owner) |
| Sunday | 9:00 AM to 2:00 AM |

| Contact | Value |
|---|---|
| Phone | 0939 126 5349 (international: +63 939 126 5349) |
| Messenger | https://m.me/61594474910928 |

### Owner answers (2026-10-18)

| Topic | Answer | See |
|---|---|---|
| Copy button targets | Store address and phone number | SRS FR-25 |
| Ordering | No delivery yet. Customers order through Messenger, pick up in store, and pay with cash or GCash | D-011 |
| Logo | No original logo file yet. The site uses a text wordmark until one exists | D-018 |
| Languages | English, Filipino and Korean, with a language button that switches the whole site | D-006 |
| Products | List not ready. Development uses clearly marked sample products, replaced before launch | D-010 |
| Welcome message | Approved as drafted above | |
| Fonts | Approved as above | D-013 |
| Hosting | Not now. Step 10 waits for the owner's go-ahead | D-003 |
| Messenger bot | Not now. Step 7 waits for the owner's go-ahead | D-004 |

---

## 1. Core features

### 1.1 Live menu catalog
- Visitors browse items by category: name, description, price, photo, availability.
- Availability updates live (realtime subscription) without a page reload.
- Out-of-stock items stay visible but are clearly marked as unavailable.

### 1.2 Who logs in
- **Visitors never log in.** The catalog is fully public and read-only.
- **Store staff log in** to an admin panel at `/admin` to edit items, prices, photos and availability. This is what keeps the menu "live".
- No public sign-up. The owner creates staff accounts directly in the database dashboard.
- Record this decision in `docs/DECISIONS.md`.

### 1.3 Messenger chat and automation
- The floating contact button and all contact links open `m.me/61594474910928`.
- A server-side Messenger webhook handles incoming messages:
  - **Welcome:** on a customer's first message or the Get Started button, reply with the welcome message from Project inputs. Also set the Messenger greeting text.
  - **Stock check:** when a customer asks about an item, look it up in the database. If it is out of stock, say so and suggest available items from the same category.
  - **Everything else:** tell the customer a staff member will reply during store hours, and leave the conversation for a human.
- Constraints:
  - Messenger only allows replies within 24 hours of the customer's last message. The bot replies to incoming messages. It does not broadcast stock alerts.
  - If an AI model is used, it answers only from the menu data passed to it, cannot change any data, and ignores instructions written inside customer messages (prompt injection). If the AI call fails, fall back to the rule-based reply.

---

## 2. Security (top priority)

Goal: no SQL injection, XSS, data tampering, leaked secrets or abuse of public endpoints. The threat model and trust boundary diagram live in `docs/SDD.md`.

### Database
- Row Level Security enabled on **every** table, deny by default.
- Anonymous role: `SELECT` only, on published menu data only. No insert, update or delete.
- Write access only for users listed in an `admins` table (being logged in is not enough).
- Never build SQL from strings. Use the client query builder or parameterized queries.
- Database functions take parameters, use `SECURITY INVOKER` unless a documented reason exists, and set a fixed `search_path`.
- The service role key never leaves the server.

### Secrets and the frontend build
- **Minifying does not hide secrets.** Treat everything sent to the browser as public. Only the public anon/publishable key ships to the client, and it is safe only because of RLS.
- Production build: minified, no public source maps (upload them privately to the error tracker only), no debug logging.
- `.env*` files are in `.gitignore`. Provide `.env.example` with variable names only. Enable secret scanning. No secrets anywhere in git history.

### Requests and input
- Validate every input on the server with a schema (type, length, allowed characters).
- Never render user-supplied content as raw HTML.
- Security headers: Content-Security-Policy (no inline scripts), Strict-Transport-Security, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, Permissions-Policy, `frame-ancestors 'none'`.
- CORS limited to the site's own origin.
- Admin forms protected against CSRF.
- Messenger webhook verifies the `X-Hub-Signature-256` header with the app secret and rejects anything unsigned or invalid. Page access token and app secret live only in server environment variables.
- Image uploads: admin only, JPG/PNG/WebP only, size limit, metadata stripped, storage bucket policies applied.
- Users see generic error messages. Details go only to the error tracker. No stack traces in responses.

### Admin login
- Generic "Wrong email or password" message, session expiry, optional MFA.

### Rate limiting
- Per-IP limits on admin login, contact form, search (if server-side), Messenger webhook and any AI call. Return `429` with `Retry-After`.
- Honeypot field on the public contact form.

### Dependencies
- Lockfile committed, dependency audit in CI, automated update PRs, no unmaintained packages.

---

## 3. Infrastructure

- **Version control:** Git at https://github.com/thatguyKire/seoul-mate-minimart. Protected `main` branch, changes via pull requests that must pass CI (lint, typecheck, tests, dependency audit). Conventional commit messages. Semver tags that match `CHANGELOG.md`.
- **APIs:** every endpoint (menu reads, admin writes, Messenger webhook, contact form) is specified in the interface design section of `docs/SDD.md`.
- **Hosting and deployment:** frontend served from the chosen host's CDN. Preview deploy per pull request, production deploys from `main` only. Environment variables set in the host dashboard. Rollback steps documented.
- **Caching:** hashed static assets cached long-term. HTML cached briefly. Menu availability is never served stale; it comes live from the database. Images optimized (WebP, responsive sizes, lazy loading).
- **Scaling:** static frontend on the CDN, stateless serverless functions, database connection pooling, indexes on the columns used for filtering and search.
- **Error tracking and monitoring:** Sentry on frontend and server functions, private source maps, personal data scrubbed, alerts on webhook failures, uptime check on the site.

---

## 4. UI features

Every feature works on mobile and desktop, in light and dark mode, and with keyboard only.

### Navigation and layout
- **Sticky header:** stays visible while scrolling and never covers anchored headings.
- **Mobile menu:** opens from a menu button on small screens, closes on Escape or link click, keeps focus inside while open.
- **Skip to content link:** first focusable element on every page, visible when focused.
- **Back to top button:** appears after one screen of scrolling.
- **Scroll progress bar:** thin bar under the header on long pages (menu, legal pages).
- **Floating contact button:** opens Messenger. Never overlaps the back to top button or the cookie banner.

### Display
- **Dark mode toggle:** follows the system setting by default, remembers the visitor's choice, no flash of the wrong theme on load, WCAG AA contrast in both themes.
- **Hover states:** on every interactive element, each with a matching `:focus-visible` style.
- **Loading states:** skeleton placeholders for menu cards and a small spinner inside buttons while submitting. No full-screen loaders.
- **Print stylesheet:** prints a clean menu (names, prices, availability) and hides navigation, buttons, banners and floating elements.

### Content
- **Site search:** searches item names, descriptions and categories as you type, with an empty-results state. Input is treated as plain text.
- **Expandable FAQ:** accessible accordion. Questions are written by the store; placeholders are marked TODO.
- **Last updated date:** shows when menu availability last changed (from the database), and on each legal page.
- **Copy button:** copies the store address or the phone number and confirms with "Copied".

### Forms and feedback
- **Form success and error states:** inline field errors, an error summary, a success message that replaces the form, submit button disabled while sending. Applies to the contact form and all admin forms.
- **Confirmation modals:** before destructive or bulk admin actions (deleting an item, marking all items out of stock). Escape cancels.
- **Password visibility toggle:** on the admin login password field, with an accessible label.

### Privacy, tracking and legal
- **Cookie banner:** short text, equally prominent Accept and Decline buttons, no analytics or non-essential cookies before Accept, choice remembered, links to the privacy policy.
- **UTM tracking:** capture `utm_source`, `utm_medium`, `utm_campaign`, `utm_term` and `utm_content` on landing, keep them for the session, attach them to analytics events and contact form submissions. Only after consent.
- **Privacy Policy page:** what is collected (analytics, contact form, Messenger), why, how long it is kept, third parties (Meta, host, error tracker), how to contact the store. Written for the Philippines (RA 10173) and marked as needing legal review.
- **Terms and Conditions page:** prices and availability can change, how orders via Messenger work, liability limits. Marked as needing legal review.
- **Favicon:** SVG favicon with PNG fallbacks, Apple touch icon and web manifest.

---

## 5. Design rules

| Never | Do instead |
|---|---|
| Purple gradients | Flat colors from the brand palette in Project inputs |
| Pill-shaped buttons | Buttons with a 4 to 8px corner radius |
| Fake reviews, testimonials, metrics or counters | Show only real information, or nothing |
| Vague hero text | Say what the store sells, where it is, and how to order |
| Emoji as icons | One consistent SVG icon set |
| Em dashes in any copy | Commas, colons or periods |
| Showy scroll animations or cursor effects | Short, functional transitions that switch off under `prefers-reduced-motion` |
| AI-generated photos or generic AI-sounding copy | Real store photos (neutral "Photo coming soon" placeholders until provided) and plain, specific copy |
| "Made with AI" tags or generator credits | No such tags anywhere in the UI or page metadata |

Accessibility target: WCAG 2.2 AA, semantic HTML.

---

## 6. Documentation

Each document has one job. Do not repeat content across documents; link to the one that owns it.

### 6.1 Documents

| File | Owns |
|---|---|
| `README.md` | What the project is, local setup, env variable names, scripts, how to deploy |
| `docs/PRD.md` | Why and for whom: users, problems, goals, scope, out of scope, success criteria |
| `docs/SRS.md` | What the system must do: numbered, testable requirements (see 6.2) |
| `docs/TRD.md` | Technical constraints: stack and versions, third-party services, environments, browser and device support. Refers to SRS requirement IDs instead of restating them |
| `docs/SDD.md` | How each part is built: module, interface, data and security design (see 6.2) |
| `docs/ARCHITECTURE.md` | High-level view: components, deployment, hosting, caching, scaling, error tracking |
| `docs/BACKEND-SCHEMA.md` | Tables, columns, indexes, RLS policies, database functions |
| `docs/UI-UX.md` | Design tokens, components, states, and the design rules in section 5 |
| `docs/APP-FLOW.md` | Step-by-step user flows: browsing, search, Messenger contact, admin editing |
| `docs/IMPLEMENTATION-PLAN.md` | Ordered v1 build steps, each with done criteria |
| `ROADMAP.md` | What comes after v1 |
| `CHANGELOG.md` | Released changes by version (Keep a Changelog format) |
| `docs/DECISIONS.md` | Each decision: date, context, choice, alternatives considered |
| `HANDOFF.md` | Snapshot for the next person or AI session (see 6.4) |

### 6.2 SRS and SDD contents

**`docs/SRS.md`** (structure based on ISO/IEC/IEEE 29148)
1. Introduction: purpose, scope, definitions
2. Overall description: actors, system context diagram, use case diagram, assumptions, constraints
3. Functional requirements: `FR-01`, `FR-02` and so on, one testable statement each, with priority (Must, Should, Could)
4. Non-functional requirements: security `NFR-SEC-xx`, performance `NFR-PERF-xx`, accessibility `NFR-ACC-xx`, privacy `NFR-PRIV-xx`, reliability `NFR-REL-xx`
5. External interfaces: Messenger Platform, database, hosting, error tracker, analytics
6. Traceability matrix: requirement ID, the SDD section that satisfies it, the test that verifies it

**`docs/SDD.md`** (structure based on IEEE 1016)
1. Design overview: links to `ARCHITECTURE.md` instead of repeating it
2. Module design: frontend components, admin panel, search, Messenger webhook, reply engine. Each module lists the SRS IDs it satisfies
3. Interface design: every endpoint with method, path, auth, rate limit, request and response schema, error codes
4. Data design: links to `BACKEND-SCHEMA.md`, plus the item state diagram
5. Security design: trust boundary diagram and a STRIDE threat model with a mitigation for each threat
6. Error handling and logging: what is logged, what users see, what is scrubbed
7. Key flows: the sequence and logic diagrams listed in 6.3

### 6.3 Diagrams

Draw every diagram in Mermaid, inside a fenced code block tagged `mermaid`, so it renders on GitHub and is version-controlled with the code. Each diagram lives in exactly one document (others link to it), has a heading and a one-sentence caption, and is updated in the same pull request as the code it describes.

| Diagram | Mermaid type | Lives in |
|---|---|---|
| System context: the site, visitors, staff, Meta Messenger, database, host, error tracker, analytics | `flowchart` | SRS |
| Use cases for Visitor, Messenger customer and Staff | `flowchart` (Mermaid has no use case type) | SRS |
| User flows: browse and search, Messenger contact, admin editing | `flowchart` | APP-FLOW |
| Components and deployment: CDN, frontend, serverless functions, database, third parties | `flowchart` | ARCHITECTURE |
| Entity relationships: tables, keys, relationships | `erDiagram` | BACKEND-SCHEMA |
| Frontend component tree | `flowchart` | SDD |
| Live availability update: staff toggles an item, database, realtime, visitor's screen | `sequenceDiagram` | SDD |
| Messenger message: Meta, webhook, signature check, rate limit, menu lookup, reply | `sequenceDiagram` | SDD |
| Admin login and item edit, including the RLS check | `sequenceDiagram` | SDD |
| Cookie consent, analytics loading and UTM capture | `sequenceDiagram` | SDD |
| Bot reply logic: welcome, stock check, human handoff, AI fallback | `flowchart` | SDD |
| Item states: published or hidden, available or out of stock | `stateDiagram-v2` | SDD |
| Trust boundaries: browser, CDN, functions, database, Meta, marking where validation, RLS and signature checks happen | `flowchart` with subgraphs | SDD |

### 6.4 HANDOFF.md

Sections, updated at the end of every work session:
1. **Goal**
2. **Current State**
3. **Active Files**
4. **Changes Made** (this session only; released changes go in `CHANGELOG.md`)
5. **Failed Attempts** (what was tried and why it did not work)
6. **Next Steps**

---

## 7. Implementation order

1. Ask about blank placeholders. Write `PRD.md`, `SRS.md`, `TRD.md` and the first entries in `DECISIONS.md`.
2. Write `SDD.md`, `ARCHITECTURE.md`, `BACKEND-SCHEMA.md` and `APP-FLOW.md` with all their diagrams from section 6.3. Stop and show me the diagrams for review before writing any code.
3. Repository setup: Git, `.gitignore`, `.env.example`, lint, format, typecheck, CI.
4. Database: schema, RLS policies, tests proving RLS works, seed data.
5. Public catalog: layout, menu, live availability, search.
6. Admin panel: login, item editing, availability toggle, confirmation modals.
7. Messenger webhook: signature check, welcome reply, stock replies, rate limits.
8. Remaining UI features, legal pages, cookie banner, UTM tracking, favicon.
9. Security hardening: headers, CSP, dependency audit, bundle secret scan, injection tests.
10. Hosting, caching, error tracking, monitoring.
11. Finish all docs, check every diagram still matches the code, complete the SRS traceability matrix, tag v1.0.0 in `CHANGELOG.md`, update `HANDOFF.md`.

## 8. Definition of done

- A test proves an anonymous user cannot insert, update or delete any row.
- No secrets in the built frontend bundle or in git history. No public source maps.
- SQL injection and XSS test strings in search and every form are handled as plain text.
- The Messenger webhook rejects requests with a missing or invalid signature.
- Every UI feature in section 4 passes on mobile and desktop, light and dark mode, keyboard only.
- Nothing from the "Never" column in section 5 appears anywhere on the site.
- Every SRS requirement has an SDD section and a passing test in the traceability matrix.
- Every diagram in section 6.3 exists, renders on GitHub and matches the built system.
- Every document in section 6 exists, and `HANDOFF.md` reflects the current state.
