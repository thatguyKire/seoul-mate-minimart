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
