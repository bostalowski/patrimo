# Cold-start test

Harness health check from [Learn Harness Engineering — lecture 03](https://walkinglabs.github.io/learn-harness-engineering/fr/lectures/lecture-03-why-the-repository-must-become-the-system-of-record/).

## Automated map check

```bash
make cold-start
```

Scores 0–5 against file presence and anchors. Fix the map (not agent memory) on any miss. This does **not** replace a fresh-session human/agent test.

## Fresh-session procedure

1. Open a **fresh** agent session with **no** verbal project context.
2. Ask only using the repository:
   1. What is this system?
   2. How is it organized?
   3. How do I run it?
   4. How do I verify it?
   5. What is the current progress?
3. Score 0–5. Any miss is a map hole — fix CONSTRAINTS / AGENTS / ARCHITECTURE / PROGRESS / FEATURES.
4. Log the score and gaps in [PROGRESS.md](../../PROGRESS.md) or `docs/agent/runs/`.

Expected anchors: [AGENTS.md](../../AGENTS.md), [CONSTRAINTS.md](../../CONSTRAINTS.md), package `ARCHITECTURE.md` files, [PROGRESS.md](../../PROGRESS.md), three-layer DoD (`make verify` / `make e2e`), [FEATURES.md](../../FEATURES.md) open-work contracts.
