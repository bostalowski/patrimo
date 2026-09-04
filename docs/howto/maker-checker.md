# Maker / checker

Harness practice from [Learn Harness Engineering — lecture 09](https://walkinglabs.github.io/learn-harness-engineering/fr/lectures/lecture-09-why-agents-declare-victory-too-early/): the agent that writes code is systematically too confident to grade its own work.

Cadrage (Framer / Challenger / teach-back) is a **separate** gate before Maker — see [cadrage-lock.md](cadrage-lock.md). Do not conflate “cadrage Pass” with “checker Pass”. This procedure is gate G5 in [feature-flow.md](feature-flow.md).

`make checker` (`scripts/orca-role.sh checker`, [ADR 0026](../adr/0026-feature-flow-cadrage-to-merge.md)) runs the Checker in a worktree separate from the Maker's — Orca-managed when available, a plain `git worktree` fallback otherwise — instead of a same-session role switch, and checks the Checker's diff touches only that branch's `PROGRESS.md`. Prefer it over "open a new chat and paste the prompt below" when you have worktree tooling available; the paste-prompt path below still works when you don't.

## Roles

| Role | Does | Must not |
|---|---|---|
| **Framer** | Locks Intent / cases / decisions on the branch CONTRACT | Write production code |
| **Challenger** | Attacks cadrage when required | Implement the feature |
| **Maker** | Implements one branch [CONTRACT](../agent/branches/README.md) after `branch-ready`; runs verify layers | Declare “done” without checker Pass on non-trivial product work; fill Tier B cadrage alone then code without teach-back |
| **Checker** | Fresh session (preferred) or explicit role switch; runs CONTRACT verify commands; scores with [scoring-rubric.md](../agent/scoring-rubric.md) | Implement the feature or “fix while reviewing” beyond tiny typo fixes |

Trivial doc-only or comment-only changes may skip checker. Anything touching `@patrimo/core`, workbook I/O, API routes, or user-visible behavior needs checker.

## Procedure

1. Framer fills branch CONTRACT (Tier B: [cadrage-lock.md](cadrage-lock.md)) → Challenger if required → teach-back → `make branch-ready` → when Layer 2 applies, Maker implements each case **RED → GREEN** ([tdd-red-green.md](tdd-red-green.md)) with RED evidence in branch PROGRESS → `make verify` (+ `make e2e` when layer 3 applies).
2. Maker updates branch PROGRESS / optional run log with commands run and results (including RED evidence when Layer 2 applied).
3. Open a **new** agent session (or clearly switch to checker). Paste the checker prompt from the rubric.
4. Checker records Pass/Fail in the branch PROGRESS or run log. On Fail, maker continues with WIP still = 1 on that CONTRACT. Missing RED evidence when Layer 2 applied is a Fail (or at best Tests = C with no Pass if Correctness is weak — see rubric). Missing Tier B teach-back / cadrage lock proof when Layer 2 applied is a Fail on Docs / Scope.
5. Only after Pass: update root FEATURES matrix if needed; clear “in progress” on the branch PROGRESS before merge.

## Why a fresh session

Same-context self-review reuses the maker’s rationalizations. A cold checker sees only the contract, the diff, and command output — closer to an independent grade.
