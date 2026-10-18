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
