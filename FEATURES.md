# Features

Living **capability matrix** (what exists on web vs mobile). Detail: [docs/overview/platforms.md](docs/overview/platforms.md).

Status: `done` | `partial` | `todo` | `absent`

**Scoped work does not live here.** Create a feature branch, then `make branch-contract` → `docs/agent/branches/<slug>/CONTRACT.md`. See [docs/agent/branches/README.md](docs/agent/branches/README.md). Inventory of gaps: `make platform-gaps`.

## Shared workbook surfaces

| Feature | Web/Electron | Mobile | Notes |
|---|---|---|---|
| Local Excel file | done | done | |
| Google Drive workbook | partial | done | Web: Drive Desktop mount path |
| Accounts CRUD + delete rules | done | done | `@patrimo/core` deletion |
| Assets CRUD + delete rules | done | done | |
| Transactions CRUD | done | done | |
| Historical price sync | done | done | |
| Manual prices (workbook) | done | done | ADR 0002 |
| Budget | done | done | |
| DCA plans | done | done | |
| Emergency fund health | done | done | ADR 0005 |
| Portfolio risk badges | done | done | ADR 0006 |
| Geographic allocation | done | done | ADR 0008–0011 |
| Diversification targets | done | done | ADR 0012 |
| Next-euro plan | done | absent | ADR 0015; web Dashboard + Diversification |
| CSV import | done | absent | |
| Real estate | done | partial | Mobile read-only |
| Fiscalité | done | partial | Mobile realized only |
| Fees | done | partial | |
| Projection | done | partial | |
| Retirement profile | done | partial | |
| Financial goals (Objectifs) | done | absent | Sheet round-trip only on mobile; ADR 0014 |
| Benchmarks | done | absent | |
| Sector allocation | done | done | ADR 0013; Diversification + asset/account views |

## Agent / harness (meta)

| Feature | Status | Notes |
|---|---|---|
| CONSTRAINTS + AGENTS router | done | |
| Colocated ARCHITECTURE.md | done | stubs under `docs/architecture/` |
| `make verify` + CI | done | lint scoped to core+src |
| Three-layer DoD + CI e2e | done | `make verify-full`; CI `e2e` job |
| Branch CONTRACT + PROGRESS | done | `docs/agent/branches/<slug>/`; `make branch-contract` |
| Sprint contract template | done | branches `_templates` + [sprint-contract.md](docs/agent/sprint-contract.md) pointer |
| Maker / checker howto | done | `docs/howto/maker-checker.md` |
| `make platform-gaps` / `branch-status` / `branch-ready` | done | replaces global `next-feature` queue |
| Agent loop howto | done | level 1–2; branch contract as goal |
| Root PROGRESS (`main` only) | done | feature focus lives on the branch |
| Playwright workbook smoke | done | `make e2e` / `make verify-full` |
| Agent run logs | done | `docs/agent/runs/` (optional beside branch PROGRESS) |
| Cold-start map script | done | `make cold-start`; branch or root PROGRESS |
| Mobile lint in verify gate | todo | when mobile lint debt paid down |
| Scheduled autonomous loop (cron/`/loop`) | absent | optional; see agent-loop.md level 2 |

## How to use

1. Pick a gap (`make platform-gaps` or product intent) → `git checkout -b feat/…`
2. `make branch-contract` — fill CONTRACT (scope / verify / exclusions)
3. `make branch-ready` must pass
4. Implement; update `docs/agent/branches/<slug>/PROGRESS.md`; run required DoD layers
5. [Checker pass](docs/howto/maker-checker.md) on non-trivial product work
6. PR: merge; update this matrix if platform status changed
