# Sprint contract: Next-euro plan (variante 2)

## Scope

- [x] One behavior: read-only next-euro action plan (issue #49 variante 2) — web/Electron
- [x] Files / packages:
  - `packages/core` — `buildNextEuroPlan`, shared `contributionToKey`
  - `src/components/next-euro-plan-card.tsx` + Dashboard / Diversification pages
  - ADR 0015, glossary, FEATURES, ARCHITECTURE topic note

## Verification

- Layer 1: `make verify` — pass 2026-08-21
- Layer 2: `npm test -- packages/core/src/next-euro-plan` + card RTL — pass
- Layer 3: `make e2e` — pass

## Exclusions

- Not in this sprint: DCA/transaction mutations; budget `épargne+restant`; mobile UI; goals→envelope routing; disclaimer; `Allocation cible` / `suggestTargetPlanFromDca`
- Do not refactor unrelated modules

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited

## Maker notes

- Implemented P1 EF → P2 band catch-up → P3 residual DCA → pause steps.
- Pool euros exclusive across overlapping geo/CRYPTO axes.
- Mobile left `absent` by design.
