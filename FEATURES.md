# Features

Living scope list for agents. Work **one** open item at a time. Capability detail: [docs/overview/platforms.md](docs/overview/platforms.md).

Status: `done` | `partial` | `todo` | `absent`

Before coding an open row: write a [sprint contract](docs/agent/sprint-contract.md). Helper: `make next-feature`.

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

## Open work (contracts)

Executable verification for rows that are not fully `done` on both platforms. Pick **one** row; do not start another until verify is green and PROGRESS is updated.

| Feature | Status | Verify | Evidence when done |
|---|---|---|---|
| Sector allocation (mobile UI parity) | todo | `make verify`; `npm test -- packages/core`; confirm [platforms.md](docs/overview/platforms.md) matches UI; `make e2e` if web touched | platforms.md + FEATURES both `done`; PROGRESS note |
| Financial goals on mobile | absent | Follow [implement-financial-goals.md](docs/howto/implement-financial-goals.md); `make verify`; mobile typecheck already in verify | Mobile status → `done` or honest `partial`; ARCHITECTURE/mobile updated |
| Benchmarks on mobile | absent | `make verify`; manual smoke on mobile benchmarks screen if added | FEATURES mobile → `done`/`partial`; platforms.md |
| CSV import on mobile | absent | `make verify`; document gap or ship importer | FEATURES + platforms.md |
| Google Drive on web | partial | `make verify`; `make e2e` if settings/path UX changes | Web status → `done` or documented limits |
| Real estate mobile write | partial | `make verify`; mobile flows for create/edit if shipped | Mobile → `done` or still `partial` with note |
| Fiscalité mobile beyond realized | partial | `make verify`; tax remains indicative (CONSTRAINTS) | Mobile status + copy still indicative |
| Fees mobile parity | partial | `make verify`; core fee tests if math changes | FEATURES + platforms.md |
| Projection mobile parity | partial | `make verify`; see mobile projection howto if relevant | FEATURES + platforms.md |
| Retirement profile mobile | partial | `make verify` | FEATURES + platforms.md |

## Agent / harness (meta)

| Feature | Status | Notes |
|---|---|---|
| CONSTRAINTS + AGENTS router | done | |
| Colocated ARCHITECTURE.md | done | stubs under `docs/architecture/` |
| `make verify` + CI | done | lint scoped to core+src |
| Three-layer DoD + CI e2e | done | `make verify-full`; CI `e2e` job |
| Sprint contract + scoring rubric | done | `docs/agent/` |
| Maker / checker howto | done | `docs/howto/maker-checker.md` |
| Open-work verify contracts | done | this file |
| `make next-feature` / `make cold-start` | done | scripts + Makefile |
| Agent loop howto (level 1–2) | done | `docs/howto/agent-loop.md` |
| PROGRESS handoff | done | |
| Playwright workbook smoke | done | `make e2e` / `make verify-full` |
| Agent run logs | done | `docs/agent/runs/` |
| Cold-start map script | done | `make cold-start`; still run fresh-session test periodically |
| Mobile lint in verify gate | todo | when mobile lint debt paid down |
| Scheduled autonomous loop (cron/`/loop`) | absent | optional; see agent-loop.md level 2 |

## How to use

1. `make next-feature` (or pick one `todo` / `partial` / `absent` contract above).
2. Write a [sprint contract](docs/agent/sprint-contract.md); record focus in [PROGRESS.md](PROGRESS.md).
3. Implement; run required DoD layers; update docs with the code.
4. [Checker pass](docs/howto/maker-checker.md) on non-trivial product work.
5. Mark FEATURES status + evidence; do not start a second feature until verify is green and PROGRESS is updated.
