# Maker / checker

Harness practice from [Learn Harness Engineering — lecture 09](https://walkinglabs.github.io/learn-harness-engineering/fr/lectures/lecture-09-why-agents-declare-victory-too-early/): the agent that writes code is systematically too confident to grade its own work.

## Roles

| Role | Does | Must not |
|---|---|---|
| **Maker** | Implements one branch [CONTRACT](../agent/branches/README.md); runs verify layers | Declare “done” without checker Pass on non-trivial product work |
| **Checker** | Fresh session (preferred) or explicit role switch; runs CONTRACT verify commands; scores with [scoring-rubric.md](../agent/scoring-rubric.md) | Implement the feature or “fix while reviewing” beyond tiny typo fixes |

Trivial doc-only or comment-only changes may skip checker. Anything touching `@patrimo/core`, workbook I/O, API routes, or user-visible behavior needs checker.

## Procedure

1. Maker fills branch CONTRACT → implements → `make verify` (+ `make e2e` when layer 3 applies).
2. Maker updates branch PROGRESS / optional run log with commands run and results.
3. Open a **new** agent session (or clearly switch to checker). Paste the checker prompt from the rubric.
4. Checker records Pass/Fail in the branch PROGRESS or run log. On Fail, maker continues with WIP still = 1 on that CONTRACT.
5. Only after Pass: update root FEATURES matrix if needed; clear “in progress” on the branch PROGRESS before merge.

## Why a fresh session

Same-context self-review reuses the maker’s rationalizations. A cold checker sees only the contract, the diff, and command output — closer to an independent grade.
