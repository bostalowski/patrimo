# Progress

Session handoff for agents and humans. Update at end of every meaningful session.

## Current focus

- **In progress:** none — sector mobile parity maker done; awaiting checker
- **Blocked:** none

## Done (recent)

- [x] Sector allocation mobile UI parity (docs confirmation; UI already shipped) — [run log](docs/agent/runs/2026-08-21-sector-allocation-mobile.md)
- [x] Checker Pass on e2e isolation — [run log](docs/agent/runs/2026-08-21-e2e-isolation.md)
- [x] E2e isolation: dedicated :3100 + temp `FINGRAPHS_DATA_DIR` + `.next-e2e` distDir (no more overwrite of `./data/config.json`)
- [x] Checker Pass on next-euro plan (PR #56) — [run log](docs/agent/runs/2026-08-21-next-euro-plan.md)
- [x] Next-euro plan V1 (variante 2): `buildNextEuroPlan` + Dashboard/Diversification cards — ADR 0015
- [x] Three-layer DoD in CONSTRAINTS + AGENTS + Cursor harness rule
- [x] CI e2e job (Playwright Chromium) alongside verify
- [x] Sprint contract + scoring rubric + run-log template
- [x] Maker/checker + agent-loop howtos
- [x] FEATURES open-work contracts with verify/evidence columns
- [x] `make next-feature` / `make cold-start` / richer `make init`
- [x] Repo skill `.cursor/skills/patrimo-harness`
- [x] Cold-start map script score 5/5 (`make cold-start`)
- [x] Fresh-session cold-start logged → [docs/agent/runs/2026-08-20-cold-start.md](docs/agent/runs/2026-08-20-cold-start.md) (5/5)

## Next

- [ ] Checker pass on sector allocation mobile parity (docs-only sprint)
- [ ] Expand mobile lint into the verify gate when debt is paid down
- [ ] Optional: schedule a Level-2 agent loop (cron / Cursor `/loop`) per [docs/howto/agent-loop.md](docs/howto/agent-loop.md)
- [ ] `make next-feature` → Financial goals on mobile

## Last verify

- Command: `make verify` (424) + sector core tests (13)
- Result: pass — Sector allocation mobile parity (maker); checker still required
- Date: 2026-08-21

## Notes

Keep this file short. Detailed run notes go under `docs/agent/runs/`.
Sprint contracts: [docs/agent/sprint-contract.md](docs/agent/sprint-contract.md).
