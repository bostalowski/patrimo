# Progress — `feat-ef-surplus-recommendation`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — re-checker **Pass** (EF surplus + monthly DCA tilt); ready to commit/push/PR
- **Blocked:** none

## Done (this branch)

- [x] Product Q&A locked (cible Réglages, oneshot vs horizon, capacité = revenus−dépenses, protéger DCA investi, déduire DCA LIVRET, UI capacité + bandeau Prochain euro, baisse si sur-plan)
- [x] Branch + CONTRACT + PROGRESS created
- [x] `make branch-ready` Pass (9/9)
- [x] Core: `computeEmergencyFundSurplusRecommendation` + FR copy; wire into savings capacity + next-euro
- [x] Remove next-euro P1 pool steal (`emergency_fund` step kind gone)
- [x] Web: capacity card surplus line; Next-euro EF banner above DCA steps
- [x] Mobile: capacity card surplus line via shared copy
- [x] Docs: ADR 0020 accepted; glossary + topic notes; append-only links on 0015 / 0018 / 0019
- [x] Layer 1 `make verify` green
- [x] Layer 2 targeted core + card tests green
- [x] Layer 3 `make e2e` green (port 3120 — :3100 occupied)
- [x] Checker Pass (2026-08-24) — ADR 0020 scope
- [x] **Follow-up (same branch):** `buildMonthlyDcaTilt` + Exécution wiring + ADR 0021; card **Ajustement DCA du mois** (no “tilt” in UI); EF banner kept
- [x] Removed Savings capacity card/banners from web + mobile Dashboard / Investissements / DCA / Projection
- [x] Re-checker Pass (2026-08-24) — tilt + capacity hide + full L1/L2/L3

## Last verify

- Command: `make verify` + targeted vitest (8 files) + `FINGRAPHS_E2E_PORT=3120 FINGRAPHS_E2E_DIST_DIR=.next-e2e-3120 make e2e`
- Result: Layer 1 green (77 files / 512 tests); Layer 2 64/64; Layer 3 2/2 passed
- Date: 2026-08-24
- Note: do not commit port-specific `.next-e2e-3120` includes if Next auto-edits `tsconfig.json` during e2e

## Checker (2026-08-24) — re-pass (tilt + hide capacity)

- Role: distinct checker (not maker)
- Verdict: **Pass**
- Evidence re-run (checker):
  - `make verify` — green (512 tests)
  - targeted vitest — 8 files / 64 tests (`emergency-fund-recommendation`, `monthly-dca-tilt`, `next-euro-plan`, `next-euro-copy`, `savings-capacity*`, `next-euro-plan-card`, `investissements-client`)
  - `make e2e` on port 3120 — 2 passed (workbook critical path + settings)

### Rubric

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | A | L1–L3 green under checker. No `emergency_fund` steal; investment pool excludes LIVRET (`monthly-dca-tilt.ts`); EF oneshot/monthly/none + cap tested; Exécution consumes tilt via `computeDcaExecutionFromContributions`; capacity UI unmounted from `src/app` / `mobile/app` |
| Architecture | B | Math + FR copy in `@patrimo/core`; platforms render. ADR/glossary/topic-note drift fixed 2026-08-24. No workbook writes. |
| Scope discipline | B | CONTRACT follow-ups only; exclusions respected (no auto-resize DCA, no mobile Next-euro, health bands untouched) |
| Tests / evidence | A | Checker re-ran L1 + L2 + L3; commands recorded above |
| Docs handoff | B | This PROGRESS updated; FEATURES.md still deferred to merge (CONTRACT On merge). ADR wording nits below |

### CONTRACT checklist

| Scope item | Status |
|---|---|
| Surplus LIVRET advice; no investment DCA redirect | Pass |
| Core pure fn + wire next-euro / capacity + unit tests | Pass |
| Web: Next-euro EF banner above steps (capacity UI later hidden per follow-up) | Pass |
| Mobile: capacity card via shared copy (then hidden per follow-up; core kept) | Pass |
| Docs: ADR 0020 + 0021; glossary; topic notes; append-only links | Pass |
| Follow-up: `buildMonthlyDcaTilt` → Exécution; card **Ajustement DCA du mois** | Pass |
| Follow-up: Hide Savings capacity UI; core unused for now | Pass |

Feature-specific verify (spot-check):

| Criterion | Status |
|---|---|
| No LIVRET steal from investment pool | Pass (`does not steal…` + investment-only filter) |
| Oneshot when `gap ≤ availableCash` | Pass |
| Monthly à ajouter capped | Pass |
| `livretDca ≥ monthlyNeed` → no mets plus | Pass |
| Target/horizon from config | Pass |
| Same core euros for EF copy helpers | Pass |
| Tilt pool investment-only; verdicts; Exécution toggle | Pass |

### Findings (non-blocking — maker before / on PR)

1. ~~**ADR 0021 Consequences:** “Tilt DCA du mois” → **Ajustement DCA du mois**~~ — fixed 2026-08-24.
2. ~~**ADR 0020:** note capacity UI hidden; core kept for Next-euro banner~~ — fixed 2026-08-24 (+ glossary, topic notes).
3. **e2e hygiene:** `:3100` often occupied — use port 3120; revert any auto-added `.next-e2e-3120` `tsconfig` includes before commit (`.gitignore` already has `/.next-e2e*/`).
4. **On merge:** FEATURES.md matrix notes for Next-euro / Savings capacity (CONTRACT checkbox).

### Remaining before merge claim

- [x] Re-checker pass (tilt + capacity hide)
- [x] ADR wording nits (findings 1–2)
- [ ] On merge: FEATURES.md matrix notes

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

Supersedes next-euro P1 pool-steal (ADR 0015) with surplus-based LIVRET advice; health bands (ADR 0005) and EF config sheet (ADR 0018) unchanged. Monthly investment DCA adjustment → Exécution (ADR 0021).
