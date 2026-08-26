# Progress — `feat-dca-lump-sum-allocation`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — asset selection implemented; verify green
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md).

- Tier: B
- Framer session / date: 2026-08-26 (lump-sum); 2026-08-26 session 3 (asset selection D11–D16 + scenarios 6–8)
- Challenger: skipped (recommended only — extends existing DCA execution stack)
- Teach-back: accepted (2026-08-26, incl. scenarios 6–8 asset selection)
- `make branch-ready`: Pass (2026-08-26, re-run after asset selection cadrage)

## Done (this branch)

- [x] Branch `feat/dca-lump-sum-allocation` + `make branch-contract`
- [x] CONTRACT filled (Intent, cases, D1–D10 LOCKED, teach-back scenarios)
- [x] Human teach-back: all scenarios ✅ (2026-08-26)
- [x] `splitLumpSumAcrossDcaPlans` in `@patrimo/core/dca` + unit tests
- [x] **Versement ponctuel** UI in `dca-execution.tsx` + component tests
- [x] Glossary entry **Versement ponctuel (lump-sum)**
- [x] **Actifs à alimenter** — `computeDcaPlan` `enabledAssetIds`, `getEmptyBasketLabels`, UI checkboxes + tests
- [x] Glossary entry **Actifs à alimenter (execution asset selection)**
- [x] **Dashboard exposure alert removed** — `DashboardExposureAlert` unmounted from Dashboard; component + tests deleted (user request, out of CONTRACT scope)

## RED evidence (when Layer 2 applies)

Per [tdd-red-green.md](../../howto/tdd-red-green.md).

- **Core pro-rata:** `npm test -- packages/core/src/dca-lump-sum.test.ts` — module missing / export not found before `splitLumpSumAcrossDcaPlans` added → **GREEN** (6 tests)
- **UI lump-sum:** `npm test -- src/app/investissements/dca-execution.test.tsx` — no Versement ponctuel section, no pro-rata wiring → **GREEN** (9 tests incl. 6 new lump-sum cases)
- **Core asset selection:** `npm test -- packages/core/src/dca-asset-selection.test.ts` — `getEmptyBasketLabels` not exported; W1 contribution 0 when sibling unchecked (missing `enabledAssetIds`) → **GREEN** (7 tests)
- **UI asset selection:** `npm test -- src/app/investissements/dca-execution.test.tsx` — no Alimenter checkboxes, no empty-basket warning → **GREEN** (4 new cases, 15 total)

## Last verify

- Command: `make verify` + `make e2e`
- Result: Pass / Pass
- Date: 2026-08-26 (session 3 — asset selection)

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

Human cadrage session 2026-08-26: validated pro-rata inter-plans, LIVRET opt-in, web-only V1, saved DCA only (no tilt), Versement ponctuel section on Exécution.

## Checker (2026-08-26, session 2)

Independent checker session (fresh context). Scored with [scoring-rubric.md](../../scoring-rubric.md).

| Dimension | Grade | Evidence |
|---|---|---|
| Correctness | **A** | `make verify` Pass (542 tests, 83 files); `make e2e` Pass (2/2); layer 2: 17/17 targeted tests green (`dca-lump-sum.test.ts` 6 + `dca-execution.test.tsx` 11) |
| Architecture | **A** | `splitLumpSumAcrossDcaPlans` in `packages/core/src/dca.ts:411-458`; exported via `@patrimo/core/dca`; UI reuses `computeDcaPlan` / `computeDcaExecution` — no domain math duplication (CONSTRAINTS §6–7) |
| Scope discipline | **A** | Diff limited to CONTRACT files; no workbook schema, mobile, tilt-on-lump-sum, persistence, or unrelated refactors |
| Tests / evidence | **A** | RED evidence in PROGRESS; 6 core + 8 UI lump-sum cases green; cadrage lock + teach-back recorded |
| Docs handoff | **B** | PROGRESS + glossary updated; FEATURES.md deferred to merge per CONTRACT |

**Result: Pass**

Behavior case spot-check (code + tests):

- Nominal: single-plan 100% (`dca-lump-sum.test.ts:11-19`); pro-rata multi (core + UI); unchecked hidden; off/invalid → `lumpSumActive` gate reverts monthly path; min-order/rotation via unchanged `computeDcaExecution` path
- Edge: empty selection (`dca-execution.test.tsx`); zero monthly excluded + sole-plan warning (core + UI); D9 override clear; D7 manual override; D10 tilt suppressed; D5 LIVRET default unchecked
- Out of scope respected: advisory read-only, web-only, no tilt on lump-sum

Minor notes (non-blocking): CONTRACT verification lists `dca.test.ts` (file absent — `dca-lump-sum.test.ts` used); no UI test for explicit LIVRET check-in (D3) or lump-sum min-order edge (relies on existing execution path).
