# Handoff

Last updated: 2026-10-18

## 1. Goal

Build the Seoul-Mate Minimart menu catalog website described in [docs/BRIEF.md](docs/BRIEF.md), following its implementation order (section 7). Security is the top priority.

## 2. Current State

- Step 1 (requirements) and step 2 (design with all 15 diagrams from brief section 6.3) are approved by the owner (2026-10-18), and committed to `main`.
- Ready for step 3.
- Decisions D-001 to D-025 recorded. Open questions Q4 to Q10 remain in [PRD section 8](docs/PRD.md#8-open-questions); none block step 3.
- Deferred by the owner: hosting ([D-003](docs/DECISIONS.md#d-003-hosting-deferred)) and the Messenger bot ([D-004](docs/DECISIONS.md#d-004-messenger-bot-deferred)). Steps 7 and 10 wait for the owner's go-ahead.
- Repository: https://github.com/thatguyKire/seoul-mate-minimart (public). The owner approved committing the documents straight to `main`. From step 3 on, the brief's workflow applies: protected `main`, changes through pull requests that pass CI.

## 3. Active Files

- `docs/SDD.md`, `docs/ARCHITECTURE.md`, `docs/BACKEND-SCHEMA.md`, `docs/APP-FLOW.md` (step 2)
- `docs/BRIEF.md`, `docs/PRD.md`, `docs/SRS.md`, `docs/TRD.md`, `docs/DECISIONS.md` (step 1)
- `README.md`, `HANDOFF.md`

## 4. Changes Made

- Created the GitHub repository and pushed the initial commit. Removed an em dash from the repository description.
- Installed GitHub CLI 2.102.0 and logged in as `thatguyKire`, with git using that login.
- Saved the owner's brief with all placeholders filled in as `docs/BRIEF.md`, then added the owner's answers: street address, Friday and Saturday hours confirmed, cash and GCash, no logo.
- Wrote the step 1 and step 2 documents and checked that every internal link and anchor resolves.
- Installed Node.js 24.20.0 (LTS). Rendered all 15 diagrams with Mermaid 11.12 in headless Microsoft Edge (via playwright-core, no browser download): no syntax errors, light and dark themes. The rendering tool lives in the session scratchpad, not in the repo.
- Owner review page with all diagrams: https://claude.ai/artifact/A9EzTULr187orGF86kEAyo (private).

## 5. Failed Attempts

- `gh` was "not recognized" in the VS Code terminal right after installing it, because VS Code keeps the old PATH. Fix: fully quit and reopen VS Code, or call `C:\Program Files\GitHub CLI\gh.exe` directly.
- `winget` was not on PATH in the automation shell. Calling `%LOCALAPPDATA%\Microsoft\WindowsApps\winget.exe` directly worked.
- First drafts of diagrams 6 (architecture), 7 (entity relationships), 8 (component tree) and 11 (live update) rendered 2,000 to 3,000 pixels wide, unreadable when scaled to a page. Fixed by switching three flowcharts to top-down, the component tree to left-to-right, trimming the live-update sequence to five participants, and dropping the comment column from the ER diagram. The ER diagram stays wide because Mermaid lays out unconnected tables in one row.

## 6. Next Steps

1. Node.js is installed. Install Docker Desktop if possible (needed for the local Supabase stack). New terminals may need a restart to find `node` and `npm` on PATH.
2. Step 3: repository setup (lint, format, typecheck, CI, `.env.example`, branch protection on `main`).
