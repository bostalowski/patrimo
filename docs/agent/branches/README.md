# Branch contracts

Feature work is framed **on the feature branch**, not in a global queue.

| Path | Role |
|---|---|
| `docs/agent/branches/<slug>/CONTRACT.md` | Scope / verify / exclusions for this branch |
| `docs/agent/branches/<slug>/PROGRESS.md` | Focus / done / blocked for this branch only |
| Root [FEATURES.md](../../../FEATURES.md) | Capability matrix (web vs mobile) — shared inventory |
| Root [PROGRESS.md](../../../PROGRESS.md) | `main` handoff only (merged work, pointers) |

`<slug>` = current branch name with `/` → `-` (e.g. `feat/foo` → `feat-foo`).

## Commands

```bash
make branch-contract   # create CONTRACT + PROGRESS for the current branch
make branch-status     # print them (or tell you to create)
make platform-gaps     # list matrix rows still partial/absent/todo
```

Refuse `branch-contract` on `main` / `master` — create a feature branch first.

## Flow

1. `git checkout -b feat/…`
2. `make branch-contract` — edit CONTRACT (cadrage)
3. Agent session: read branch CONTRACT + PROGRESS (`make branch-status`)
4. Implement; update branch PROGRESS; three-layer DoD; checker
5. PR: merge code + this folder; update root FEATURES matrix if status changed

## WIP = 1

One active CONTRACT per branch. Do not expand scope mid-branch without updating CONTRACT exclusions.

Optional dated notes: still allowed under [../runs/](../runs/) for long sessions.
