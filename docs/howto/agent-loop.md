# Agent loops

Builds on the session harness ([AGENTS.md](../../AGENTS.md)). Goal: move from “you prompt each step” to a small loop with a **goal**, **verification**, and **stop condition**.

Theory: [Learn Harness Engineering — lecture 13](https://walkinglabs.github.io/learn-harness-engineering/fr/lectures/lecture-13-loop-engineering/).

## Level 1 — single goal (manual start)

In Cursor (or equivalent), start a session with:

```text
Goal: Complete the CONTRACT on the current feature branch (make branch-status).
Method: Follow AGENTS.md lifecycle — CONTRACT → implement → three-layer DoD → maker/checker.
Stop when: Checker Pass on the rubric, OR blocked with reason written in branch PROGRESS.md.
Do not expand into a second feature without updating the CONTRACT.
```

If there is no CONTRACT yet: create a feature branch, `make branch-contract`, fill scope, then run Level 1.

Then let the agent run until the stop condition. You stay outside the inner coding loop; you only review Pass/Fail and branch PROGRESS.

## Level 2 — scheduled nudge

Pick a recurring trigger (daily cron, Cursor `/loop`, or calendar reminder):

```text
Every run: make cold-start (optional) → make branch-status.
If on a feature branch with an open CONTRACT and no blocker, open a Level-1 goal session for that CONTRACT only.
If on main with no branch work: stop (or list make platform-gaps for a human to pick).
```

Do **not** stuff a multi-hour implementation into `/loop` as a repeating identical prompt — loops without shared disk state restart from zero. State lives in branch CONTRACT/PROGRESS (+ optional run logs).

## Level 3 — maker ≠ checker automation

1. Maker worktree/session implements under the branch CONTRACT.
2. Separate checker session scores with [scoring-rubric.md](../agent/scoring-rubric.md).
3. Only merge / update FEATURES matrix on Pass.

Optional later: git worktrees for parallel agents; keep WIP = 1 **per branch** (each worktree has its own slug folder).

## Repo helpers

```bash
make branch-contract   # create CONTRACT + PROGRESS for current branch
make branch-status     # print them
make platform-gaps     # matrix inventory (not a claim lock)
make cold-start        # map health (five questions)
make init              # setup + verify + branch status + gaps
```

## Stop conditions (machine-checkable)

Prefer:

- `make verify` exit 0
- `make e2e` exit 0 when layer 3 applies
- Branch PROGRESS updated; FEATURES matrix updated on merge when status changes
- Checker rubric Pass recorded in branch PROGRESS or run log

Avoid stop conditions like “looks good” or “agent says done”.
