---
name: patrimo-harness
description: >-
  Run Patrimo agent sessions under the repo harness: load CONSTRAINTS, branch
  CONTRACT/PROGRESS, three-layer DoD, maker/checker handoff. Use when starting
  work in financial-graphs/Patrimo, claiming a feature done, initializing a
  session, or when the user mentions harness, verify-full, WIP, branch-contract,
  or cold-start.
---

# Patrimo harness skill

## Quick path

1. Read `CONSTRAINTS.md`, `docs/reference/glossary.md`.
2. `make branch-status` — read this branch’s CONTRACT + PROGRESS (on `main`, root PROGRESS + matrix only).
3. If no CONTRACT yet: feature branch → `make branch-contract` → fill scope / verify / exclusions.
4. Read colocated `ARCHITECTURE.md` for packages you touch.
5. Implement; never invent sheet names / enums / reserved IDs.
6. Verify:
   - Always: `make verify`
   - Behavior: targeted `npm test -- <path>`
   - Web UI / API / workbook I/O / settings: `make e2e` or `make verify-full`
7. Checker: fresh session using `docs/howto/maker-checker.md` + `docs/agent/scoring-rubric.md`.
8. Update `docs/agent/branches/<slug>/PROGRESS.md` (+ optional `docs/agent/runs/YYYY-MM-DD-slug.md`).
9. On merge: update root `FEATURES.md` matrix if platform status changed.

## Commands

| Intent | Command |
|---|---|
| Session init | `make init` |
| Create cadrage | `make branch-contract` |
| Show cadrage | `make branch-status` |
| Matrix gaps | `make platform-gaps` |
| Map health | `make cold-start` |
| Layer 1 | `make verify` |
| Layer 3 | `make e2e` |
| Full | `make verify-full` |

## Do not

- Declare done on lint/unit alone when layer 3 applies.
- Expand into a second feature without updating the branch CONTRACT.
- Put feature focus in root `PROGRESS.md` (that file is for `main` only).
- Grade your own non-trivial work without a checker pass.
- Duplicate domain rules outside `@patrimo/core`.
- Treat `make next-feature` as a claim queue (deprecated → `platform-gaps` + branch contract).
