# Agent loops

Builds on the session harness ([AGENTS.md](../../AGENTS.md)). Goal: move from “you prompt each step” to a small loop with a **goal**, **verification**, and **stop condition**.

Theory: [Learn Harness Engineering — lecture 13](https://walkinglabs.github.io/learn-harness-engineering/fr/lectures/lecture-13-loop-engineering/).

## Level 1 — single goal (manual start)

In Cursor (or equivalent), start a session with:

```text
Goal: Complete exactly one open item from FEATURES.md (use `make next-feature`).
Method: Follow AGENTS.md lifecycle — sprint contract → implement → three-layer DoD → maker/checker.
Stop when: Checker Pass on the rubric, OR blocked with reason written in PROGRESS.md.
Do not start a second FEATURES item.
```

Then let the agent run until the stop condition. You stay outside the inner coding loop; you only review Pass/Fail and PROGRESS.

## Level 2 — scheduled nudge

Pick a recurring trigger (daily cron, Cursor `/loop`, or calendar reminder):

```text
Every run: make cold-start (optional) → make next-feature → if an open contract exists and PROGRESS has no blocker, open a Level-1 goal session for that item only.
```

Do **not** stuff a multi-hour implementation into `/loop` as a repeating identical prompt — loops without shared disk state restart from zero. State lives in PROGRESS + FEATURES + run logs.

## Level 3 — maker ≠ checker automation

1. Maker worktree/session implements under the contract.
2. Separate checker session scores with [scoring-rubric.md](../agent/scoring-rubric.md).
3. Only merge / mark FEATURES done on Pass.

Optional later: git worktrees for parallel agents; keep WIP = 1 per worktree feature.

## Repo helpers

```bash
make next-feature   # next open contract from FEATURES.md
make cold-start     # map health (five questions)
make init           # setup + verify + print PROGRESS + open contracts
```

## Stop conditions (machine-checkable)

Prefer:

- `make verify` exit 0
- `make e2e` exit 0 when layer 3 applies
- FEATURES row status updated
- Checker rubric Pass recorded in run log

Avoid stop conditions like “looks good” or “agent says done”.
