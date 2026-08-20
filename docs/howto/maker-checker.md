# Maker / checker

Harness practice from [Learn Harness Engineering — lecture 09](https://walkinglabs.github.io/learn-harness-engineering/fr/lectures/lecture-09-why-agents-declare-victory-too-early/): the agent that writes code is systematically too confident to grade its own work.

## Roles

| Role | Does | Must not |
|---|---|---|
| **Maker** | Implements one FEATURES item under a [sprint contract](../agent/sprint-contract.md); runs verify layers | Declare “done” without checker Pass on non-trivial product work |
| **Checker** | Fresh session (preferred) or explicit role switch; runs contract verify commands; scores with [scoring-rubric.md](../agent/scoring-rubric.md) | Implement the feature or “fix while reviewing” beyond tiny typo fixes |

Trivial doc-only or comment-only changes may skip checker. Anything touching `@patrimo/core`, workbook I/O, API routes, or user-visible behavior needs checker.

## Procedure

1. Maker writes sprint contract → implements → `make verify` (+ `make e2e` when layer 3 applies).
2. Maker updates PROGRESS / run log with commands run and results.
3. Open a **new** agent session (or clearly switch to checker). Paste the checker prompt from the rubric.
4. Checker records Pass/Fail in the run log. On Fail, maker opens a follow-up with WIP still = 1.
5. Only after Pass: mark FEATURES row updated and clear “in progress” in PROGRESS.

## Why a fresh session

Same-context self-review reuses the maker’s rationalizations. A cold checker sees only the contract, the diff, and command output — closer to an independent grade.
