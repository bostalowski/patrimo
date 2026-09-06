# Progress — `feat-harness-checker-agent-isolation`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — Checker **Pass** (2026-09-06); ready to commit / PR when asked
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md).

- Tier: B
- Framer session / date: 2026-09-06 (this branch)
- Challenger: Pass (2026-09-06)
- Teach-back: accepted (2026-09-06)
- Challenger notes: human design critique — worktree alone does not isolate; constraint is the agent; prefer subagent spawn over same-session paste
- Teach-back notes: human directed implementation (“modifies pour aller dans cette direction”) on scenarios 1–4
- `make branch-ready`: exit 0 (2026-09-06)

## Done (this branch)

- [x] CONTRACT filled (Tier B) + branch-ready
- [x] ADR 0030 + CONSTRAINTS §22/§27 + maker-checker / feature-flow / agent-loop / AGENTS / skill / scoring-rubric / FEATURES
- [x] `role-worktree.sh` AGENT ISOLATION mandate + N1 test (RED → GREEN)
- [x] Layer 1 `make verify` green (2026-09-06)
- [x] Layer 2 `npm test -- scripts/role-worktree.test.ts` green (7 tests)

## RED evidence (when Layer 2 applies)

Per [tdd-red-green.md](../../howto/tdd-red-green.md).

### RED evidence — N1 (2026-09-06)

- Command: `npm test -- scripts/role-worktree.test.ts -t "N1: mandates"`
- SHA: 711b2ec
- Failure reason: missing behavior — stdout lacked `AGENT ISOLATION (required)` / separate-agent mandate (worktree-only paste wording)
- Failure excerpt:
```
 ❯ scripts/role-worktree.test.ts:54:24
     expect(res.stdout).toMatch(/AGENT ISOLATION \(required\)/i);
```
- GREEN after: mandate block in `scripts/role-worktree.sh` + docs/ADR; full `role-worktree.test.ts` 7/7 pass

## Checker gate (pr-check)

- Checker: Pass (2026-09-06)
- Checker evidence: separate Task/subagent scored working tree; `make verify` exit 0; `npm test -- scripts/role-worktree.test.ts` 7/7; `make checker` stdout has AGENT ISOLATION mandate; RED N1 in PROGRESS; teach-back + Challenger Pass; ADR 0030 + CONSTRAINTS §22/§27 aligned (see Checker table below)

## Last verify

- Command: `make verify`
- Result: pass
- Date: 2026-09-06
- Layer 2: `npm test -- scripts/role-worktree.test.ts` — pass (7)

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

ADR number **0030** skips 0028–0029 intentionally (those numbers are used on parallel real-estate feature branches not yet on `main`).

## Checker (2026-09-06)

Separate agent review of Maker working tree at `/Users/bastien.ostalowski/Workspace/patrimo` on `feat/harness-checker-agent-isolation` (uncommitted vs HEAD `711b2ec`). Stale `../patrimo-feat-harness-checker-agent-isolation-checker` ignored as source of truth.

### Evidence run

| Check | Command / path | Result |
|---|---|---|
| Cadrage | `make branch-ready` | 15/15 Ready |
| Teach-back / Challenger | PROGRESS § Cadrage lock | Teach-back: accepted; Challenger: Pass (2026-09-06) |
| RED N1 | PROGRESS § RED evidence — N1 | Command + SHA `711b2ec` (= HEAD) + excerpt `AGENT ISOLATION (required)`; HEAD `scripts/role-worktree.sh` has no mandate (RED plausible) |
| Layer 2 | `npm test -- scripts/role-worktree.test.ts` | 7/7 pass |
| Layer 1 | `make verify` | exit 0 (lint 0 errors; typecheck; 698 tests) |
| N1 stdout | `make checker` | Prints `=== AGENT ISOLATION (required) ===`, separate-agent spawn, MUST NOT score, worktree cwd |
| N2 | `role-worktree.test.ts` Checker prompt + rubric | Prompt still single-sourced from `docs/agent/scoring-rubric.md` |
| N3 | publish-scope unit tests | PROGRESS-only publish unchanged |
| N4 | CONSTRAINTS §22/§27, maker-checker, skill, feature-flow, AGENTS | Agent isolation first; worktree = write sandbox |
| ADR | `docs/adr/0030-checker-agent-isolation.md` + 0026 Status/Superseded-by | Option C (agent + sandbox); no shell auto-spawn |
| Gauntlet | n/a | Diff does not touch `@patrimo/core` / workbook I/O / API routes |

### Score

| Dimension | Grade | Evidence |
|---|---|---|
| Correctness | A | `make verify` exit 0; Layer 2 7/7; `make checker` mandate matches N1; cases N1–N4 / E1–E3 covered by script + docs + tests |
| Architecture | A | ADR 0030 contract ↔ `scripts/role-worktree.sh` mandate; CONSTRAINTS §22/§27; plain-git sandbox (no IDE spawn); prompt not duplicated in script |
| Scope discipline | A | Diff files match CONTRACT expected list; exclusions respected (no auto-spawn) |
| Tests / evidence | A | RED N1 recorded then green targeted tests; N2/N3/E3 locked by existing tests |
| Docs handoff | A | Tier B teach-back + Challenger Pass + branch-ready; PROGRESS/ADR/FEATURES/skill/howtos aligned |

### Verdict

**Pass** (2026-09-06)

Note: `.worktrees/realestate-loan-insurance-modes/` is untracked noise unrelated to this CONTRACT — do not commit with this feature.
