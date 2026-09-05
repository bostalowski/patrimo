# Progress — `bostalowski-rework-log-auto-detect`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** ship stamp + overlap gate
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md). Tier A: mark teach-back / Challenger `n/a`.

- Tier: A
- Framer session / date: 2026-09-05 (same session as Maker — Tier A harness)
- Challenger: n/a
- Teach-back: n/a
- `make branch-ready`: pending

## Done (this branch)

- [x] `scripts/lib/rework-log.mjs` — stamp / check-own / check-overlap
- [x] Wire `make pr-check` §5–6 + `make rework-log-stamp`
- [x] Tests: `scripts/rework-log.test.ts` + updated `pr-check.test.ts`
- [x] Migrate `rework-log.md` (Touched column); mark overlapping prior harness rows `Reworked?=yes`
- [x] ADR 0026 / AGENTS / feature-flow / templates / skill

## RED evidence (when Layer 2 applies)

n/a — Tier A

## Last verify

- Command: `npm test -- scripts/rework-log.test.ts scripts/pr-check.test.ts`
- Result: 12 passed
- Date: 2026-09-05

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)
