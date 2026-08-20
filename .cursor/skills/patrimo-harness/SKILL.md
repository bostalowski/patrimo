---
name: patrimo-harness
description: >-
  Run Patrimo agent sessions under the repo harness: load CONSTRAINTS/PROGRESS,
  one FEATURES item, sprint contract, three-layer DoD, maker/checker handoff.
  Use when starting work in financial-graphs/Patrimo, claiming a feature done,
  initializing a session, or when the user mentions harness, verify-full, WIP,
  sprint contract, or cold-start.
---

# Patrimo harness skill

## Quick path

1. Read `CONSTRAINTS.md`, `docs/reference/glossary.md`, `PROGRESS.md`.
2. `make next-feature` — take only that contract (WIP = 1).
3. Write a sprint contract from `docs/agent/sprint-contract.md`.
4. Read colocated `ARCHITECTURE.md` for packages you touch.
5. Implement; never invent sheet names / enums / reserved IDs.
6. Verify:
   - Always: `make verify`
   - Behavior: targeted `npm test -- <path>`
   - Web UI / API / workbook I/O / settings: `make e2e` or `make verify-full`
7. Checker: fresh session using `docs/howto/maker-checker.md` + `docs/agent/scoring-rubric.md`.
8. Update `PROGRESS.md` (+ optional `docs/agent/runs/YYYY-MM-DD-slug.md`).

## Commands

| Intent | Command |
|---|---|
| Session init | `make init` |
| Next scope | `make next-feature` |
| Map health | `make cold-start` |
| Layer 1 | `make verify` |
| Layer 3 | `make e2e` |
| Full | `make verify-full` |

## Do not

- Declare done on lint/unit alone when layer 3 applies.
- Start a second FEATURES open item in the same sprint.
- Grade your own non-trivial work without a checker pass.
- Duplicate domain rules outside `@patrimo/core`.
