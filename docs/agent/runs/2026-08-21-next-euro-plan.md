# Sprint contract: Next-euro plan (variante 2)

## Scope

- [x] One behavior: read-only next-euro action plan (issue #49 variante 2) — web/Electron
- [x] Files / packages:
  - `packages/core` — `buildNextEuroPlan`, shared `contributionToKey`
  - `src/components/next-euro-plan-card.tsx` + Dashboard / Diversification pages
  - ADR 0015, glossary, FEATURES, ARCHITECTURE topic note

## Verification

- Layer 1: `make verify` — pass 2026-08-21 (maker); checker re-ran lint/typecheck/unit 2026-08-21
- Layer 2: `npm test -- packages/core/src/next-euro-plan` + card RTL — pass (maker + checker)
- Layer 3: `make e2e` — pass (maker); checker re-ran 2026-08-21 → 2 passed

## Exclusions

- Not in this sprint: DCA/transaction mutations; budget `épargne+restant`; mobile UI; goals→envelope routing; disclaimer; `Allocation cible` / `suggestTargetPlanFromDca`
- Do not refactor unrelated modules

## Checker

- [x] Fresh session Pass 2026-08-21 — [scoring-rubric.md](../scoring-rubric.md)
- Result: **Pass** (Correctness B→A after layer-3 re-run; Architecture A; Scope A; Tests B; Docs A)
- Notes (non-blocking): no dedicated e2e assertion for “Prochain euro”; mixed look-through pause vs P2 catch-up untested; action `hold` unused

## Maker notes

- Implemented P1 EF → P2 band catch-up → P3 residual DCA → pause steps.
- Pool euros exclusive across overlapping geo/CRYPTO axes.
- Mobile left `absent` by design.
