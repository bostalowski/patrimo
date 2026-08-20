# Features

Living scope list for agents. Work **one** open item at a time. Capability detail: [docs/overview/platforms.md](docs/overview/platforms.md).

Status: `done` | `partial` | `todo` | `absent`

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
| CSV import | done | absent | |
| Real estate | done | partial | Mobile read-only |
| Fiscalité | done | partial | Mobile realized only |
| Fees | done | partial | |
| Projection | done | partial | |
| Retirement profile | done | partial | |
| Financial goals (Objectifs) | done | absent | Sheet round-trip only on mobile; ADR 0014 |
| Benchmarks | done | absent | |
| Sector allocation | done | todo | Confirm UI parity in platforms.md |

## Agent / harness (meta)

| Feature | Status | Notes |
|---|---|---|
| CONSTRAINTS + AGENTS router | done | |
| Colocated ARCHITECTURE.md | done | stubs under `docs/architecture/` |
| `make verify` + CI | done | lint scoped to core+src |
| PROGRESS handoff | done | |
| Playwright workbook smoke | done | `make e2e` / `make verify-full` |
| Agent run logs | done | `docs/agent/runs/` |

## How to use

1. Pick one `todo` / `partial` / `absent` row (or a howto `implement-*`).
2. Record it in [PROGRESS.md](PROGRESS.md).
3. Ship with tests + doc updates; mark status when done.
4. Do not start a second feature until verify is green and PROGRESS is updated.
