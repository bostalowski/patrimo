# Branch contracts

Feature work is framed **on the feature branch**, not in a global queue.

| Path | Role |
|---|---|
| `docs/agent/branches/<slug>/CONTRACT.md` | Intent / cases / decisions / scope / verify / exclusions |
| `docs/agent/branches/<slug>/PROGRESS.md` | Focus / cadrage lock / done / blocked / RED evidence |
| Root [FEATURES.md](../../../FEATURES.md) | Capability matrix (web vs mobile) — shared inventory |
| Root [PROGRESS.md](../../../PROGRESS.md) | `main` handoff only (merged work, pointers) |

`<slug>` = current branch name with `/` → `-` (e.g. `feat/foo` → `feat-foo`).

## Commands

```bash
make branch-contract   # create CONTRACT + PROGRESS for the current branch
make branch-status     # print them (or tell you to create)
make branch-ready      # gate: cadrage filled (Tier B: Intent/decisions/teach-back)
make platform-gaps     # list matrix rows still partial/absent/todo
```

Refuse `branch-contract` / `branch-ready` on `main` / `master` — create a feature branch first.

## Flow

1. `git checkout -b feat/…`
2. `make branch-contract` — Framer fills CONTRACT ([cadrage-lock.md](../../howto/cadrage-lock.md): Tier A vs B)
3. Tier B: Challenger if required; human teach-back; lock decisions
4. `make branch-ready` — must exit 0 before Maker
5. Agent session: `make branch-status` then implement — when Layer 2 applies, **RED → GREEN** per behavior case ([tdd-red-green.md](../../howto/tdd-red-green.md)); update branch PROGRESS (incl. RED evidence); three-layer DoD; checker
6. PR: merge code + this folder; update root FEATURES matrix if status changed

## Tiers

| Tier | Layer 2 | Before coding |
|---|---|---|
| A | `n/a` | Classic scope / verify / exclusions |
| B | behavior cases | Intent + decisions LOCKED + teach-back accepted (+ Challenger if required) |

## WIP = 1

One active CONTRACT per branch. Do not expand scope mid-branch without updating CONTRACT exclusions.

Optional dated notes: still allowed under [../runs/](../runs/) for long sessions.
