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
   - `@patrimo/core` / workbook I/O / API route diffs: `make gauntlet` (test-removal guard + scoped mutation testing — CONSTRAINTS §27)
8. Checker: `make checker` (spawns an isolated `git worktree` via `scripts/role-worktree.sh` — plain git, no IDE/tool preference) using `docs/howto/maker-checker.md` + `docs/agent/scoring-rubric.md` (Fail if Layer 2 applied and RED evidence missing; Fail if Tier B missing teach-back / cadrage lock proof). The Checker writes only that branch's PROGRESS.md.
9. `make pr-check` before opening/updating the PR — replays `branch-ready`, requires RED evidence per checked-off case and a fresh, cited Checker Pass. CI's `harness` job replays it on every push.
10. Update `docs/agent/branches/<slug>/PROGRESS.md` (+ optional `docs/agent/runs/YYYY-MM-DD-slug.md`).
11. On merge: update root `FEATURES.md` matrix if platform status changed; append a row to `docs/agent/rework-log.md`.

Full gate-by-gate sequence: `docs/howto/feature-flow.md` (G0-G7).

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
| RED evidence (executed, not narrated) | `make red CASE="…" CMD="…"` |
| Gauntlet (test-removal guard + scoped mutation) | `make gauntlet` |
| Checker (isolated worktree) | `make checker` |
| PR readiness | `make pr-check` |
| Where am I in the flow? | `make flow` |

## Do not

- Declare done on lint/unit alone when layer 3 applies.
- Start Maker work on Tier B before Intent / LOCKED decisions / teach-back / `branch-ready`.
- Write production code for a Layer 2 behavior case before a real RED for that case.
- Expand into a second feature without updating the branch CONTRACT.
- Put feature focus in root `PROGRESS.md` (that file is for `main` only).
- Grade your own non-trivial work without a checker pass.
- Duplicate domain rules outside `@patrimo/core`.
- Treat `make next-feature` as a claim queue (deprecated → `platform-gaps` + branch contract).
- Treat full Spec-Driven Development as required (opt-in only; harness embeds cadrage-lock + RED → GREEN).

## Related (optional runtime)

Isolated ports / DinD for parallel worktrees / agents: root `Coastfile` +
`.agents/skills/coasts/SKILL.md` (also `.cursor/skills/coasts`, `/coasts`
command). Not part of DoD — do not require Coasts for verify / branch gates.
Classic `npm run dev` stays the default single-checkout path.

`make checker` always uses a plain `git worktree add --detach`
(`scripts/role-worktree.sh`) — no Orca/Coast/IDE preference, so it behaves
identically whichever agent or tool runs it and never hard-requires Orca
or Coasts.
