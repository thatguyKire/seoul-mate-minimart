# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Each release has a matching git tag.

## [Unreleased]

### Added

- Requirements and design documents: brief, PRD, SRS, TRD, SDD, architecture, backend schema, app flows and decisions, with 15 diagrams.
- Project setup: Vite, React and TypeScript app skeleton with a placeholder page.
- Code quality: strict type-checked ESLint (including accessibility rules and bans on `console` and raw HTML), Prettier, TypeScript strict mode.
- Tests: Vitest with Testing Library for unit tests, Playwright for end-to-end tests on phone and desktop sizes.
- Production build check: fails on source maps, known secret patterns, or initial JavaScript over 170 KB gzipped.
- CI on GitHub Actions for every pull request, with actions pinned to commit hashes.
- Dependabot updates for npm packages and GitHub Actions.
- Database: tables for categories, items, staff, menu version, contact messages and rate limits, with Row Level Security on every table, cut-down privileges, audit triggers, live-update version bumps, a rate limiter, a photo storage bucket with path rules, and scheduled clean-up jobs.
- Sample menu data: four categories and twelve items, all flagged as samples.
- Database tests: 94 pgTAP assertions covering visitor, signed-in and staff access, the two-factor rule, rate limiting and constraints, run in CI against a local Supabase stack.
- Local Supabase settings: no public sign-up, 15-minute access tokens, stronger passwords, two-factor login, session limits.
- Public menu: published items by category with price, photo or "Photo coming soon", and stock written out on a shelf-tag strip; category filter in the address; skeleton cards while loading; a plain error with Messenger and phone links when the menu cannot load.
- Live availability: open pages update within seconds of a change, without a reload; while the live connection is down the page says so and checks every 10 seconds.
- Menu search as you type, across names, descriptions and categories, in the page language and English.
- English, Filipino and Korean, each under its own address (`/en/`, `/fil/`, `/ko/`), with a language menu, the browser's language on a first visit, and the choice remembered. Filipino and Korean text are drafts awaiting review.
- Store information: opening hours for each day, address and phone with copy buttons, tap to call, and how to order.
- Layout: sticky header, mobile menu, skip link, floating Messenger button, footer; light and dark themes from the system setting; self-hosted Fredoka, Nunito and Noto Sans KR.
- End-to-end tests with a fake Supabase (live updates, dropped connection, errors, injection strings, languages, axe checks in both themes) and a CI test against a real local stack.
- Staff panel at `/admin`, loaded only there: login with a show-password toggle and one message for every refusal; accounts that are not staff are logged straight out; optional two-factor login with an authenticator app; logout after 60 minutes without activity or 12 hours after login.
- Items: a one-tap in-stock switch, "Mark all out of stock" and delete behind a confirmation, reordering, and a form with English, Filipino and Korean text, category, price, photo and menu visibility, with inline errors, an error summary and a saving spinner.
- Photos: checked by their first bytes and size, then resized to three widths in the browser and saved as WebP or JPEG with all metadata, including location, removed.
- Categories: add, rename in three languages, reorder, and delete, refused in plain words while a category still has items.
- `npm run db:staff`: creates a staff login on the local Supabase stack only.

### Changed

- Items record their photo format, so the menu asks for the right files (migration `20261019120000_photo_format.sql`).
