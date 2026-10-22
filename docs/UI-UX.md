# UI and UX

| | |
|---|---|
| Status | 1.0 |
| Last updated | 2026-10-22 |

This document owns the **design**: tokens, components, their states, and how the design rules in [BRIEF.md, section 5](BRIEF.md#5-design-rules) are kept. Behavior and requirement IDs are in [SRS.md](SRS.md); how each part is built is in [SDD.md](SDD.md). The tokens live in `src/index.css`; component styles sit next to their components.

## 1. Direction

A Korean minimart's shelf, not a template. The one memorable element is the **item card drawn as a shelf price tag**: details on top, and a strip at the bottom with the price in large Fredoka numerals and the stock status written out beside it. Everything around it stays quiet: flat brand colors, left-aligned content, short functional transitions only.

- The hero says what the store sells, where it is, and how to order, in plain words.
- The staff panel is built for a phone at the counter: one column, large touch targets, one tap to change stock.
- No photos of products the store does not sell, no generated images: a neutral "Photo coming soon" placeholder until real photos exist.

## 2. Tokens

### 2.1 Color

Brand colors come from the store's Facebook banner ([D-018](DECISIONS.md#d-018-text-wordmark-until-a-logo-exists)). Dark tokens apply under `<html data-theme="dark">`.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--color-bg` | `#ffffff` | `#121733` | Page background |
| `--color-text` | `#1e2b5e` (navy) | `#f6eef3` | Body text, headings |
| `--color-text-muted` | `#4a5578` | `#c3c8dc` | Secondary text |
| `--color-band` | `#f9d3e3` (soft pink) | `#1b2247` | Hero and Visit us bands |
| `--color-accent` | `#c2326b` | `#f27ba8` | Primary buttons, links |
| `--color-strip` | `#1e2b5e` | `#f9d3e3` | Price strip of an in-stock item |
| `--color-strip-out` | `#e8eaf1` | `#2b335e` | Price strip of an out-of-stock item, with a hatch pattern |
| `--pink-500` | `#e8508a` | same | Large accents only: step numbers, current-page marks, progress bar, the letter mark |
| `--color-focus` | navy | soft pink | Focus outline |

Contrast (WCAG AA, NFR-ACC-03):

| Pair | Ratio | Rule |
|---|---|---|
| Navy on white | 13.4:1 | Text |
| Navy on soft pink | 9.9:1 | Text |
| White on `#c2326b` | 5.3:1 | Button text |
| Hot pink `#e8508a` on white | 3.5:1 | Large text and graphics only, never body text |
| `#f27ba8` on `#121733` | 6.8:1 | Dark theme links and buttons |

### 2.2 Type

| Role | Family | Notes |
|---|---|---|
| Headings, prices, wordmark | Fredoka (variable, weight axis) | Self-hosted ([D-013](DECISIONS.md#d-013-self-hosted-fonts)) |
| Body and interface | Nunito (variable) | |
| Korean text | Noto Sans KR (variable) | Loaded only for the character ranges a page uses. Korean breaks lines between words (`word-break: keep-all`) |

Scale: ratio 1.25 from 16px (`--step--1` 14px to `--step-4`, fluid up to 56px for the hero). Body line height 1.6; headings 1.04 to 1.15.

### 2.3 Shape and spacing

| Token | Value | Used for |
|---|---|---|
| `--radius-sm` | 4px | Tags |
| `--radius-md` | 6px | Buttons, inputs |
| `--radius-lg` | 8px | Cards, banner, dialogs |
| `--gutter` | 16px, 24px from 768px | Page side padding |
| `--header-height` | 64px | Sticky header; anchors scroll below it |

Breakpoints: 40rem (640px) for three menu columns and one-line staff rows, 48rem (768px) for wider sections, 52rem (832px) for the full header navigation, 64rem (1024px) for four menu columns.

### 2.4 Motion

Tokens from the [transitions.dev](https://transitions.dev) motion scale ([D-038](DECISIONS.md#d-038-richer-motion-on-desktop-tap-driven-motion-on-phones)). Shared keyframes and the scroll reveal are in `src/features/motion/`; each component's motion sits with its styles.

| Token | Value | Used for |
|---|---|---|
| `--duration-stagger` | 40ms | Gap between items in a cascade |
| `--duration-micro` | 80ms | Press feedback, the check's delay |
| `--duration-quick` | 150ms | Hover colors |
| `--duration-fast` | 250ms | Dropdown open, menu and banner exits, icon swap, chevrons, card lift |
| `--duration-medium` | 350ms | Banner entrance, theme cross-fade |
| `--duration-slow` | 400ms | Mobile menu entrance, FAQ answer, thank-you |
| `--duration-very-slow` | 500ms | Hero entrance, scroll reveals, the drawn check |
| `--ease-smooth-out` | cubic-bezier(0.22, 1, 0.36, 1) | Nearly everything that moves |
| `--ease-bounce` | cubic-bezier(0.34, 1.36, 0.64, 1) | Letter mark tilt, check pop |
| `--distance-micro` to `--distance-toast` | 4, 8, 12, 16px | Card lift, answer slide, reveals, banner |
| `--scale-medium`, `--scale-pop` | 0.97, 0.9 | Press and dropdown, pop-ins |

Where motion plays:

| Where | Desktop with a mouse | Touch screens |
|---|---|---|
| Hero | Lines rise in one after another, with a slight blur | None |
| Sections, category headings, item cards | Fade up once on scrolling into view, cascading | None |
| Category filter | The chosen category's cards come in afresh | None |
| Item card hover | Lifts, swings from its top edge like a hanging tag, photo leans in | None |
| Header | Underline slides under the hovered link; letter mark tilts; language list grows from its button | Same for the language list |
| Mobile menu | Slides in from the side, out a little faster | Same |
| FAQ | Answer slides down; the height eases where the browser can | Same |
| Privacy banner | Rises in; drops away before the choice is saved | Same |
| Buttons, back to top, Messenger button | Press feedback; the Messenger button rises on hover | Press feedback |
| Theme toggle | Page cross-fades between themes; the sun or moon spins in | Same |
| Contact thank-you | Rises in; the check draws itself | Same |

"Desktop with a mouse" is `(hover: hover) and (pointer: fine)`, also set as `html[data-motion="rich"]`. Starting states that hide something live only in keyframes or behind that attribute, so with motion off, or when printing, everything shows.

## 3. Components and states

Every interactive element has a hover style and the same style on `:focus-visible` (FR-67), plus a 3px focus outline.

| Component | States | Notes |
|---|---|---|
| Button | primary, secondary, quiet, danger, small, large; hover and focus; disabled; busy with a spinner and changed label | 4 to 8px corners, never pills. Primary actions at least 44px tall |
| Item card | in stock; out of stock (muted hatched strip, grayscale photo, "Out of stock" written out); sample tag; photo or placeholder; skeleton while loading | Stock is never shown by color alone (FR-04) |
| Category filter | current (filled, `aria-current`); scrolls sideways on phones | |
| Search | empty; results count; no results with a Messenger link | |
| Menu status | live (nothing shown); paused notice; error with Messenger, phone and Try again | |
| Language switcher | closed; open list with the current language marked | Each language named in itself |
| Theme toggle | light; dark (`aria-pressed`) | Icon only in the header, labeled in the mobile menu |
| Mobile menu | modal dialog with links, languages, theme | Escape and link taps close it |
| Floating stack | back to top (after one screen), Messenger button, privacy banner | One column, so they cannot overlap; its height keeps focused elements and the footer clear |
| Privacy banner | open on a first visit or from "Privacy choices"; Accept and Decline identical in size and style | Never takes focus or blocks the page |
| FAQ | closed; open; "Draft" tag outside production | Native `<details>` |
| Legal page | review notice, "English prevails" note, last updated date | Scroll progress bar under the header |
| Staff stock switch | on (knob right, check mark); off (knob left, label struck through); busy | `role="switch"` |
| Staff form | inline error; error summary that takes focus and links to fields; saved message; busy save button | |
| Confirm dialog | open with focus on Cancel; busy | Escape and Cancel change nothing |
| Photo field | current photo; new photo preview on a canvas; marked for removal; preparing; refused file | |

## 4. Design rules

How each rule from [BRIEF.md, section 5](BRIEF.md#5-design-rules) is kept, and what checks it.

| Never | Instead, here | Checked by |
|---|---|---|
| Purple gradients | Flat brand colors; the only pattern is the hatch on out-of-stock strips | Review |
| Pill-shaped buttons | 4 to 8px radii from the tokens | Review |
| Fake reviews, testimonials, metrics or counters | None anywhere; sample products are labeled "Sample" outside production and blocked from launch ([D-010](DECISIONS.md#d-010-sample-products-until-the-real-list-arrives)) | Review; sample labels in unit and end-to-end tests |
| Vague hero text | "Korean snacks, noodles and skincare in Masbate City", then how to order | Review |
| Emoji as icons | One drawn SVG icon set (`src/components/Icon.tsx`), 24px grid, 2px round strokes | Review |
| Em dashes in copy | Commas, colons, periods | `translations.test.ts`, `siteContent.test.ts`, `layout.spec.ts` |
| Cursor effects; entrances and scroll reveals on phones | The motion in [2.4](#24-motion): rich only on a desktop with a mouse, tap-driven on touch screens, all off under `prefers-reduced-motion` | `motion.spec.ts`, `motion.test.ts` |
| AI-generated photos or generic copy | "Photo coming soon" placeholders; plain, specific copy | Review |
| "Made with AI" tags | None in the interface or page metadata | Review |

## 5. Accessibility patterns

- Semantic landmarks, one `h1` per page, headings in order; the skip link is the first focusable element.
- Text in another language than the page, such as an English fallback on a Korean page, carries its own `lang` (NFR-ACC-05).
- Live regions announce "Copied", search result counts, saved messages and the paused notice.
- Dialogs are native modal `<dialog>` elements; the browser returns focus to the opener.
- Touch targets at least 24px, primary actions at least 44px (NFR-ACC-06).
- axe checks run on the public pages, legal pages and staff panel, in both themes (`layout.spec.ts`, `site.spec.ts`, `admin.spec.ts`).

## 6. Print

Printing the menu gives item names, prices and stock as one line each, grouped by category, in black on white whatever the screen theme. Everything else is hidden (FR-68, `src/print.css`).
