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

Canonical path: `.agents/skills/patrimo-harness/` (symlinked as
`.cursor/skills/patrimo-harness` and `.claude/skills/patrimo-harness`).

## Quick path

1. Read `CONSTRAINTS.md`, `docs/reference/glossary.md`.
2. `make branch-status` — read this branch’s CONTRACT + PROGRESS (on `main`, root PROGRESS + matrix only).
3. If no CONTRACT yet: feature branch → `make branch-contract` → **Framer** fills Intent / behavior cases / decisions (Tier B) or marks `n/a` (Tier A). See `docs/howto/cadrage-lock.md`.
4. Tier B: Challenger if `Challenger: required`; human teach-back accepted in PROGRESS; then `make branch-ready` must pass before Maker.
5. Read colocated `ARCHITECTURE.md` for packages you touch.
6. Implement that CONTRACT only. When Layer 2 applies: per case **RED → GREEN** (`docs/howto/tdd-red-green.md`) — failing targeted test for the right reason before production code, record RED evidence in PROGRESS, then minimal production code. Never invent sheet names / enums / reserved IDs; never invent behavior absent from CONTRACT cases.
7. Verify:
   - Always: `make verify`
   - Behavior: targeted `npm test -- <path>` (after RED → GREEN when Layer 2 applies)
   - Web UI / API / workbook I/O / settings: `make e2e` or `make verify-full`
8. Checker: fresh session using `docs/howto/maker-checker.md` + `docs/agent/scoring-rubric.md` (Fail if Layer 2 applied and RED evidence missing; Fail if Tier B missing teach-back / cadrage lock proof). **Pass ≠ all A** (A or B on Correctness/Architecture is enough). Then apply the **re-check loop**:
   - **Fail** → Maker fixes → **new Checker mandatory**.
   - **Pass + docs/copy-only nits** applied by Maker → re-Checker optional; note skip in PROGRESS.
   - **Pass + nits** that change behavior / core math / tests / API / workbook I/O / user-visible KPIs → Maker fixes → **new Checker mandatory** before done.
9. Update `docs/agent/branches/<slug>/PROGRESS.md` (+ optional `docs/agent/runs/YYYY-MM-DD-slug.md`).
10. On merge: update root `FEATURES.md` matrix if platform status changed.

## Commands

| Intent | Command |
|---|---|
| Session init | `make init` |
| Create cadrage | `make branch-contract` |
| Show cadrage | `make branch-status` |
| Ready to code? | `make branch-ready` |
| Matrix gaps | `make platform-gaps` |
| Map health | `make cold-start` |
| Layer 1 | `make verify` |
| Layer 3 | `make e2e` |
| Full | `make verify-full` |

## Do not

- Declare done on lint/unit alone when layer 3 applies.
- Start Maker work on Tier B before Intent / LOCKED decisions / teach-back / `branch-ready`.
- Write production code for a Layer 2 behavior case before a real RED for that case.
- Expand into a second feature without updating the branch CONTRACT.
- Put feature focus in root `PROGRESS.md` (that file is for `main` only).
- Grade your own non-trivial work without a checker pass.
- Treat Checker Pass as “all dimensions A” — Pass allows B; do not infinite-loop on nits.
- After Checker **Fail**, declare done without a **new** Checker Pass.
- After Checker **Pass**, apply behavior/core/test/KPI fixes and declare done without a **new** Checker when the re-check loop requires one (`docs/howto/maker-checker.md`).
- Duplicate domain rules outside `@patrimo/core`.
- Treat `make next-feature` as a claim queue (deprecated → `platform-gaps` + branch contract).
- Treat full Spec-Driven Development as required (opt-in only; harness embeds cadrage-lock + RED → GREEN).

## Related (optional runtime)

Isolated ports / DinD for parallel worktrees / agents: root `Coastfile` +
`.agents/skills/coasts/SKILL.md` (also `.cursor/skills/coasts`, `/coasts`
command). Not part of DoD — do not require Coasts for verify / branch gates.
Classic `npm run dev` stays the default single-checkout path.
