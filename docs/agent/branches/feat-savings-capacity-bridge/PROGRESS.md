# Progress — `feat-savings-capacity-bridge`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** copy clarity on savings-capacity card (plain language; no tooltip)
- **Blocked:** none

## Done (this branch)

- [x] Feature branch `feat/savings-capacity-bridge` from `main`
- [x] CONTRACT drafted (scope, product decisions, verify, exclusions)
- [x] Core: `computeSavingsCapacity` + unit tests (`packages/core/src/savings-capacity.ts`)
- [x] Web: Dashboard card; soft warnings on Investissements / DCA / Projection when `over_committed`
- [x] Mobile: Dashboard card
- [x] Docs: glossary, ADR 0017, `packages/core/savings-capacity.md`, ARCHITECTURE + adr index
- [x] Layer 1 `make verify` green
- [x] Layer 2 targeted savings-capacity + card/banner tests
- [x] Layer 3 `make e2e` green
- [x] Checker pass (2026-08-21)
- [x] UX copy: replace `réserve FU` with `… / mois pour atteindre 6 mois de dépenses` (no tooltip)

## Last verify

- Command: `npm test -- src/components/savings-capacity-card.test.tsx mobile/lib/savings-capacity-card.test.tsx` (8 pass) — copy/tooltip follow-up
- Prior: `make verify` (450) + `make e2e` (2) on feature implementation
- Result: pass (card tests)
- Date: 2026-08-21

## Checker findings (2026-08-21)

**Verdict: Pass with notes**

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | A | `make verify` 450/450; targeted 19/19; `make e2e` 2/2. Core matches locked product table (negative surplus, hide on revenus ≤ 0, EF 6/12, bands 0.8). |
| Architecture | A | Math only in `packages/core/src/savings-capacity.ts`; platforms call `summarizeBudget` revenus/dépenses (not `restant`/EPARGNE); no workbook sheet; export in `package.json` + `index.ts`. |
| Scope discipline | A | CONTRACT items only; exclusions held (no DCA mutation, no mobile soft warnings, no next-euro pool change). |
| Tests / evidence | A | Layer 1–3 re-run by checker; unit cases cover hide / EF reserve / over-commit / TRIMESTRIEL+ANNUEL / boundaries. |
| Docs handoff | B | Glossary + ADR 0017 + topic note + ARCHITECTURE present; FEATURES deferred to merge (ok). Glossary soft-warning line omits Investissements (ADR/code include it) — minor. |

**CONTRACT criteria**

| Criterion | Met? |
|---|---|
| Core `computeSavingsCapacity` + status bands | Yes |
| Dashboard card web + mobile | Yes (`src/app/page.tsx`, `mobile/app/index.tsx`) |
| Soft warnings web Investissements / DCA / Projection | Yes (`SavingsCapacityOverCommitBanner`) |
| Mobile warnings excluded | Yes (no mobile banner usage) |
| Docs glossary + ADR + topic note | Yes |
| No auto-resize DCA | Yes (banner copy + no write paths in diff) |

**Notes (not blockers for Pass)**

1. Implementation is still **uncommitted** (only cadrage commit `af5e85c` on branch) — commit before PR/merge.
2. On merge: add FEATURES.md row **Savings capacity**.
3. Optional: glossary soft-warning surfaces → mention Investissements to match ADR 0017.

**Fixes by checker:** none (report-only).

## On merge (remaining)

- [ ] Commit uncommitted implementation (if not already)
- [ ] Add FEATURES.md row **Savings capacity** (web `done`, mobile `done` Dashboard / soft warnings web-only)
- [x] Checker checkbox on CONTRACT
- [ ] Note PR link in root PROGRESS Done

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)
Issue: https://github.com/bostalowski/patrimo/issues/51
ADR: [0017-savings-capacity-bridge.md](../../../adr/0017-savings-capacity-bridge.md)
