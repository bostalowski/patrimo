# Progress — `bostalowski-test-with-data`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — tranche 1 implemented
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md). Tier A: mark teach-back / Challenger `n/a`.

- Tier: A
- Framer session / date: 2026-09-06 (this session)
- Challenger: n/a — harness tooling, no ADR / new sheet / core math
- Teach-back: n/a — Tier A
- `make branch-ready`: pass (10/10, 2026-09-06)

## Done (this branch)

- [x] Committed fixture `data-fixtures/sample-portfolio.xlsx` (3 comptes, 2 actifs, ~14 transactions, manual prices) — fake demo data only.
- [x] `scripts/ensure-dev-data.mjs`: copies the fixture into the data dir and writes `data/config.json` only when no config exists yet; no-op otherwise.
- [x] Wired as `predev` and `preelectron:dev` in `package.json`. Not wired into `build` / `start` / `electron:build` / `electron:pack` / `make e2e` (Playwright calls `next dev` directly, bypassing npm lifecycle hooks).
- [x] Doc note in `docs/howto/local-dev-setup.md`.
- [x] Manual check: removed `data/config.json` + `data/*.xlsx`, ran `npm run dev` — predev auto-seeded, `GET /api/settings` → `configured:true, valid:true`, `/comptes` renders the 3 demo accounts. Re-running with `config.json` present leaves it untouched (verified via direct script run).

## RED evidence (when Layer 2 applies)

n/a — Tier A, Layer 2 not applicable (dev bootstrap script only, no domain/API/UI behavior change).

## Last verify

- Command: `npm run verify`
- Result: pass — 104 test files / 698 tests, lint + typecheck clean
- Date: 2026-09-06

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)
