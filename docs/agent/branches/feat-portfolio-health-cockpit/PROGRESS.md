# Progress — `feat-portfolio-health-cockpit`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** maker complete — awaiting checker pass ([maker-checker](../../../howto/maker-checker.md))
- **Blocked:** none

## Done (this branch)

- [x] Feature branch `feat/portfolio-health-cockpit` from `main`
- [x] Filled [CONTRACT.md](./CONTRACT.md) — 5 pills, tone map, next-euro-first next-step, fees/mobile deferred
- [x] `make branch-ready` → 9/9
- [x] Core `buildPortfolioHealthCockpit` + tone helpers + unit tests
- [x] Web Dashboard `PortfolioHealthCockpitCard` + page wiring + `#performance` anchor
- [x] Docs: ADR 0018, glossary, core topic note, ARCHITECTURE, FEATURES, platforms
- [x] Layer 1–3 verification

## Last verify

- Command: `make verify` + targeted cockpit tests + `make e2e`
- Result: green (verify OK; cockpit 12+3 tests; e2e 2 passed)
- Date: 2026-08-24

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

Issue: https://github.com/bostalowski/patrimo/issues/52

Implementation:
- `packages/core/src/portfolio-health-cockpit.ts`
- `src/components/portfolio-health-cockpit.tsx`
- `docs/adr/0018-portfolio-health-cockpit.md`

Checker: fresh session should score with scoring-rubric against CONTRACT (no D on correctness; architecture ≥ B).
