# Product Requirements

| | |
|---|---|
| Status | 1.0, approved by the owner on 2026-10-18 |
| Last updated | 2026-10-18 |
| Source | [BRIEF.md](BRIEF.md) |

This document owns **why** the website exists and **for whom**. What the system must do is in [SRS.md](SRS.md), technical constraints are in [TRD.md](TRD.md), and the reasons behind each choice are in [DECISIONS.md](DECISIONS.md). Store facts (address, hours, phone, links) live in [BRIEF.md, Project inputs](BRIEF.md#project-inputs).

## 1. Background

Seoul-Mate Minimart is a Korean minimart in Masbate City, Philippines. It sells Korean snacks and drinks, beauty and skincare, instant noodles and household essentials. Its only online presence today is a Facebook Page, where customers ask staff through Messenger whether an item is in stock.

## 2. Problems

| # | Problem | Who feels it |
|---|---|---|
| P1 | Customers can't see what is in stock without messaging the store and waiting for a reply. | Customers |
| P2 | Staff answer the same "do you have this?" questions repeatedly. | Staff |
| P3 | Prices and photos are spread across Facebook posts, so the range is hard to browse or search. | Customers |
| P4 | Customers who prefer Filipino or Korean have no store information in their language. | Customers |

## 3. Users

| User | Wants to | Context |
|---|---|---|
| Shopper (English, Filipino or Korean speaker) | Check whether an item is in stock and what it costs, then order it | Usually on a phone, often arriving from a Facebook post, so the site opens inside the Facebook or Messenger in-app browser (assumption A1) |
| Staff | Keep the menu accurate: mark items in or out of stock, update prices and photos | On a phone at the counter, often while serving customers |
| Owner | Add or remove staff accounts, and trust that the site is accurate and secure | Uses the Supabase dashboard occasionally |

## 4. Goals

| # | Goal | Solves |
|---|---|---|
| G1 | A shopper can see whether an item is available right now, without messaging. | P1 |
| G2 | Fewer stock questions reach staff, because the answer is already on the site. | P2 |
| G3 | Shoppers can browse and search the whole range, with prices and photos. | P3 |
| G4 | The whole site works in English, Filipino and Korean. | P4 |
| G5 | Ordering is one tap away: every page leads to Messenger. | P1 |
| G6 | Staff can change an item's availability from a phone in seconds. | P2 |
| G7 | The site is secure and respects visitors' privacy. Security is the top priority. | All |

## 5. Scope

### 5.1 In scope for v1

| Feature | Requirements |
|---|---|
| Menu catalog with categories and live availability | [SRS 3.1](SRS.md#31-catalog) |
| Search | [SRS 3.2](SRS.md#32-search) |
| Language switcher: English, Filipino, Korean | [SRS 3.3](SRS.md#33-languages) |
| Store information and how to order | [SRS 3.4](SRS.md#34-store-information) |
| Messenger links and contact form | [SRS 3.5](SRS.md#35-contact) |
| FAQ | [SRS 3.6](SRS.md#36-faq) |
| Staff admin panel at `/admin` | [SRS 3.7](SRS.md#37-admin-panel) |
| Cookie consent, UTM capture, privacy policy, terms | [SRS 3.9](SRS.md#39-privacy-consent-and-legal) |
| Layout and display features from the brief | [SRS 3.10](SRS.md#310-layout-and-display) |
| Project documents from the brief, section 6 | [BRIEF.md, section 6](BRIEF.md#6-documentation) |

### 5.2 Deferred by the owner (2026-10-18)

| Item | Decision |
|---|---|
| Messenger bot: welcome reply, stock check, hand-off to staff ([SRS 3.8](SRS.md#38-messenger-bot-deferred)) | [D-004](DECISIONS.md#d-004-messenger-bot-deferred) |
| Hosting and deployment | [D-003](DECISIONS.md#d-003-hosting-deferred) |
| Analytics provider, chosen with hosting | [D-003](DECISIONS.md#d-003-hosting-deferred) |

The SRS still lists the bot requirements, marked Deferred, so the design leaves room for them.

### 5.3 Out of scope

- Online checkout and payment. Orders happen in Messenger ([D-011](DECISIONS.md#d-011-pickup-only-orders-through-messenger)).
- Delivery. Pickup only for now.
- Customer accounts and public sign-up ([D-001](DECISIONS.md#d-001-visitors-never-log-in-only-staff-do)).
- Stock quantities. An item is either available or out of stock ([D-012](DECISIONS.md#d-012-availability-is-yes-or-no-not-a-quantity)).
- Broadcast messages and stock alerts. Messenger only allows replies within 24 hours of a customer's last message.
- Connecting to a point-of-sale or inventory system.
- Customer reviews and ratings.

## 6. Success criteria

### 6.1 Ready to launch when

| # | Criterion |
|---|---|
| S1 | Every Must requirement in the SRS, except Deferred ones, passes its test in the [traceability matrix](SRS.md#6-traceability-matrix). |
| S2 | The brief's definition of done ([section 8](BRIEF.md#8-definition-of-done)) is met, apart from items that belong to deferred features. |
| S3 | A real staff member can mark an item out of stock in under 10 seconds, starting from the admin item list on their own phone. |
| S4 | FR-06 (live updates) passes on a real phone over mobile data. |
| S5 | No sample products remain ([D-010](DECISIONS.md#d-010-sample-products-until-the-real-list-arrives)). |
| S6 | Fluent speakers have reviewed all Filipino and Korean text ([D-008](DECISIONS.md#d-008-translations-are-reviewed-by-fluent-speakers)). |
| S7 | A lawyer or other qualified adviser has reviewed the privacy policy and terms ([D-009](DECISIONS.md#d-009-legal-pages-in-three-languages-english-prevails)). |

### 6.2 After launch

| # | Criterion | How it is measured |
|---|---|---|
| S8 | Fewer "is this in stock?" messages per week than before launch | The owner counts them for one week before launch (baseline) and again one month after |
| S9 | Visitors who tap a Messenger link | Analytics, once a provider is chosen ([D-003](DECISIONS.md#d-003-hosting-deferred)) |

## 7. Assumptions

| # | Assumption | If wrong |
|---|---|---|
| A1 | Most visitors use phones and arrive from Facebook, often inside its in-app browser. | Desktop gets more design attention; nothing breaks. |
| A2 | Staff have smartphones with mobile data or Wi-Fi at the store. | Staff need a shared device at the counter. |
| A3 | The menu stays at a few hundred items, well under 2,000, so search can run in the browser ([D-017](DECISIONS.md#d-017-search-runs-in-the-browser)). | Move search to the database. |
| A4 | Low running cost matters, so free plans are preferred where they meet the requirements. | Paid plans open more hosting options (Q6). |

## 8. Open questions

| # | Question | Needed for | Status |
|---|---|---|---|
| Q1 | What is the store's street address? | Store information, copy button, privacy policy | Answered 2026-10-18, see [BRIEF](BRIEF.md#project-inputs) |
| Q2 | Friday and Saturday are listed as closing at 2:00 PM, while every other day closes at 2:00 AM. Is that correct? | Opening hours, Messenger hand-off reply | Answered 2026-10-18: correct |
| Q3 | Which payment methods are accepted at pickup (cash, GCash, others)? | How to order, terms | Answered 2026-10-18: cash and GCash |
| Q4 | What is the real product list, with prices, categories and photos? | Replacing sample products | Open |
| Q5 | Who needs a staff account, and how many accounts? | Admin setup | Open |
| Q6 | What monthly budget is there for hosting and services? | Hosting decision | Open |
| Q7 | Will the site use its own domain name, for example seoulmateminimart.com? | Hosting, links, Messenger welcome message | Open |
| Q8 | Can the Facebook Page get a username, for a shorter Messenger link? | Messenger links | Open |
| Q9 | How long should contact form messages be kept? | Privacy policy, automatic deletion | Open |
| Q10 | Which questions and answers should the FAQ show? | FAQ | Open |
| Q11 | Is the original logo and banner artwork available as image files? | Exact brand colors, favicon | Answered 2026-10-18: no logo yet ([D-018](DECISIONS.md#d-018-text-wordmark-until-a-logo-exists)) |
