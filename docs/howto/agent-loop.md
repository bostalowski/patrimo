# Agent loops

Builds on the session harness ([AGENTS.md](../../AGENTS.md)). Goal: move from “you prompt each step” to a small loop with a **goal**, **verification**, and **stop condition**.

Theory: [Learn Harness Engineering — lecture 13](https://walkinglabs.github.io/learn-harness-engineering/fr/lectures/lecture-13-loop-engineering/).

## Level 0 — cadrage lock (before Maker)

On a feature branch with Layer 2 behavior work:

```text
Goal: Lock the branch CONTRACT (Intent, behavior cases, decisions, teach-back).
Method: docs/howto/cadrage-lock.md — Framer → Challenger if required → human teach-back → make branch-ready.
Stop when: make branch-ready exits 0, OR blocked with reason in branch PROGRESS.md.
Do not write production code in this level.
```

Tier A (Layer 2 `n/a`): fill classic CONTRACT fields only, then `make branch-ready`.

## Level 1 — single goal (manual start)

In Cursor (or equivalent), start a session with:

```text
Goal: Complete the CONTRACT on the current feature branch (make branch-status).
Method: Follow AGENTS.md lifecycle — cadrage lock if not done → RED→GREEN when Layer 2 applies (docs/howto/tdd-red-green.md) → three-layer DoD → maker/checker.
Stop when: Checker Pass on the rubric, OR blocked with reason written in branch PROGRESS.md.
Do not expand into a second feature without updating the CONTRACT.
```

If there is no CONTRACT yet: create a feature branch, `make branch-contract`, run Level 0, then Level 1.

Then let the agent run until the stop condition. You stay outside the inner coding loop; you only review Pass/Fail and branch PROGRESS.

## Level 2 — scheduled nudge

Pick a recurring trigger (daily cron, Cursor `/loop`, or calendar reminder):

```text
Every run: make cold-start (optional) → make branch-status.
If on a feature branch with an open CONTRACT and no blocker, open a Level-0 session if branch-ready fails, else Level-1 for that CONTRACT only.
If on main with no branch work: stop (or list make platform-gaps for a human to pick).
```

Do **not** stuff a multi-hour implementation into `/loop` as a repeating identical prompt — loops without shared disk state restart from zero. State lives in branch CONTRACT/PROGRESS (+ optional run logs).

## Level 3 — maker ≠ checker automation

1. Maker worktree/session implements under the branch CONTRACT (after Level 0).
2. Separate checker session scores with [scoring-rubric.md](../agent/scoring-rubric.md).
3. Only merge / update FEATURES matrix on Pass.

Optional later: git worktrees for parallel agents; keep WIP = 1 **per branch** (each worktree has its own slug folder).

## Repo helpers

```bash
make branch-contract   # create CONTRACT + PROGRESS for current branch
make branch-status     # print them
make branch-ready      # cadrage gate (must pass before coding)
make platform-gaps     # matrix inventory (not a claim lock)
make cold-start        # map health (five questions)
make init              # setup + verify + branch status + gaps
```

## Stop conditions (machine-checkable)

Prefer:

- `make branch-ready` exit 0 before Maker
- `make verify` exit 0
- `make e2e` exit 0 when layer 3 applies
- Branch PROGRESS updated; FEATURES matrix updated on merge when status changes
- Checker rubric Pass recorded in branch PROGRESS or run log

Avoid stop conditions like “looks good” or “agent says done”.
