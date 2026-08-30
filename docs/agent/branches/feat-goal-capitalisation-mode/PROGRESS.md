# Progress — `feat-goal-capitalisation-mode`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — assessment copy shows pension nette when overlap (follow-up after Checker Pass); ready to commit / PR / merge
- **Blocked:** none
- **Note:** prior Checker Pass (2026-08-29) covered capitalisation/overlap; pension display follow-up needs a light re-check on that slice only before merge claim

## Checker (2026-08-29) — independent re-check

**Verdict: Pass**

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | A | Re-ran `make verify` → 563/563; `npm test -- packages/core/src/financial-goals.test.ts src/lib/financial-goals-excel.test.ts` → 38/38; `make e2e` → 2/2. Teach-back 400k / 1.2M / 300k / CAPITAL_AT_DATE in `financial-goals.test.ts`. Callers (`objectifs/page`, Projection alignment) pass profile without `withdrawalRate` into goals path. |
| Architecture | A | `requiredCapitalToday` / pension overlap / sticky defaults in `@patrimo/core`; web+mobile excel adapters only; schema + `workbook-template` headers; ADR 0023 + see-also on 0014. |
| Scope discipline | A | Mobile = parse/serialize only (no Objectifs UI); exclusions (Projection interest card, stochastic, etc.) untouched. |
| Tests / evidence | A | RED evidence below (core + sticky toggle + excel serialize) still present; Layer 1 + Layer 2 + Layer 3 green on this pass. |
| Docs handoff | A | Tier B teach-back / Challenger / `branch-ready` recorded; glossary / excel-workbook / ADR 0023. FEATURES matrix unchanged (expected). |

Notes: working tree still has uncommitted implementation vs cadrage-only commits on branch — **commit before merge**. CONTRACT behavior checkboxes still unchecked (cosmetic; Done list is complete).

Prior same-day Pass (Tests B→A after sticky + excel RED gap) superseded by this re-check.

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md).

- Tier: B
- Framer session / date: 2026-08-29 (Framer only, no production code)
- Challenger: Pass (2026-08-29) — holes closed in CONTRACT (mode≠math distincte ; taux fraction ; toggle symétrique ; pension > 0 ; migration legacy ; callers withdrawalRate)
- Teach-back: accepted (2026-08-29) — human confirmed all 5 scenarios (400k / 1.2M / 300k / legacy defaults / CAPITAL_AT_DATE unchanged)
- `make branch-ready`: **pass** (2026-08-29 Maker) — 14/14

### Challenger attack (2026-08-29)

Attacked then closed in CONTRACT (not Fail):

1. Mode vs formula — Intent talks « intérêts seuls » vs retrait but both teach-back scenarios use `annualNeed / rate`. Risk: Maker invents different math. → LOCKED: same formula; mode = defaults + copy only.
2. Workbook rate convention left to Maker — structuring hole on new column. → LOCKED: fraction `0.03` in Excel + model (like `Comptes.Taux`).
3. Mode toggle only specified Non→Oui (3 %→4 %), not reverse. → symmetric sticky-default rule.
4. « Pension renseignée » vs `0`. → defined and > 0.
5. Legacy workbooks get 3 % instead of old profile 4 % — capital jumps. → explicit migration accepted (teach-back #4).
6. Callers still passing profile `withdrawalRate` into goals/Projection alignment — named in decisions for Maker.

Symptom / cause / lever / exclusions / teach-back alignment: OK. No OPEN decisions remain.

## Done (this branch)

- [x] Feature branch `feat/goal-capitalisation-mode`
- [x] `make branch-contract` + Framer filled CONTRACT
- [x] Teach-back accepted (2026-08-29)
- [x] Challenger Pass (2026-08-29) + CONTRACT clarifications
- [x] `make branch-ready` pass (Maker)
- [x] Core schema + `requiredCapitalToday` / normalize / validate — RED→GREEN (teach-back + edges)
- [x] Excel web + mobile parse/serialize + legacy defaults
- [x] Web Objectifs editor (mode + taux sticky defaults) + assessment copy
- [x] Assessment copy: pension nette mensuelle affichée quand overlap (`pensionNetMonthlyApplied`)
- [x] Remove profile `withdrawalRate` from goals/Projection alignment path
- [x] ADR 0023 accepted + see-also ADR 0014; glossary; excel-workbook; financial-goals.md
- [x] `make verify` green
- [x] `make e2e` green (after Playwright Chromium install)
- [x] Sticky toggle unit tests + excel serialize RED evidence (Tests B→A)

## RED evidence (when Layer 2 applies)

Per [tdd-red-green.md](../../howto/tdd-red-green.md).

### Assessment pension display (follow-up)

- Case: overlap → `pensionNetMonthlyApplied` ≈ 2000; avant départ / CAPITAL_AT_DATE → 0; UI copy « déjà déduite »
- Command: `npm test -- packages/core/src/financial-goals.test.ts -t "exposes pension nette"`
- Failure reason (RED): `expected undefined to be close to 2000` (field absent on GoalAssessment)
- Date: 2026-08-29
- GREEN: same command — passed after `publicPensionNetMonthlyApplied` + assess field + goals-assessment copy

### Core capitalisation + pension overlap

- Case: teach-back intérêts seuls @64 + pension → 400k; @58 no pension → 1.2M; vivre sur capital @64 → 300k; pension=0; ignore profile withdrawalRate; normalize legacy Non+3%; validate rate bounds; assess incomplete still uses per-goal rate
- Command: `npm test -- packages/core/src/financial-goals.test.ts`
- Failure reason (RED, before production formula): still used profile `withdrawalRate` 4% and always subtracted pension → e.g. expected 400_000 got ~300_000; expected 1_200_000 got ~300_000 or 900_000; normalize left `drawOnCapital`/`capitalisationRate` undefined; validate accepted rate 0 / 0.11
- Date: 2026-08-29
- GREEN: same command — passed after schema fields + formula + pension overlap + normalize defaults + validation

### Sticky mode-toggle rate defaults (checker Tests gap)

- Case: Non→Oui with rate still 3% ⇒ 4%; Oui→Non with rate still 4% ⇒ 3%; custom rates kept
- Command: `npm test -- packages/core/src/financial-goals.test.ts -t rateAfterDrawOnCapitalToggle`
- Failure reason (RED, sticky disabled): expected 0.04 got 0.03 (Non→Oui); expected 0.03 got 0.04 (Oui→Non)
- Date: 2026-08-29
- GREEN: same command — 5/5 passed with `rateAfterDrawOnCapitalToggle` restored

### Excel round-trip / legacy

- Case: new columns round-trip (`Oui` + 0.04); legacy sheet without mode/rate → Non + 3%
- Command: `npm test -- src/lib/financial-goals-excel.test.ts -t "replaceWorkbook writes Objectifs"`
- Failure reason (RED, serialize omitted mode/rate columns): expected `drawOnCapital: true`, `capitalisationRate: 0.04` got defaults `false` / `0.03`
- Date: 2026-08-29
- GREEN: full file `npm test -- src/lib/financial-goals-excel.test.ts` — 5/5 (round-trip + legacy)

## Last verify

- Command (pension display follow-up): `make verify` → 564/564; `npm test -- packages/core/src/financial-goals.test.ts` → 34/34
- Result: green
- Date: 2026-08-29
