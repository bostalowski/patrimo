# Progress — `feat-realestate-loan-insurance-modes`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** Rebased onto `origin/main` (2026-09-05) — ADR renumber: tax history stays **0027**, reliability → **0028**, insurance modes → **0029**; merged taxe foncière + insurance into projection/excel/form. Next: `make verify` / refresh Checker if needed / force-push PR #82.
- **Blocked:** none

- Checker: Pass (2026-09-05) — re-Pass after gauntlet hunk-scope fix @ `72ef048`
- Checker evidence: verify 727 green; Layer 2 92/92; e2e 2/2; gauntlet **82.45%** (schema/workbook-template 100%); prior Fail (59.05% whole-file mutate) closed; scores Correctness A / Architecture A / Scope B / Tests A / Docs A

## Checker re-Pass (2026-09-05)

**Verdict: Pass**

Isolated worktree: `patrimo-feat-realestate-loan-insurance-modes-checker` @ `72ef048` (detached HEAD of `feat/realestate-loan-insurance-modes`). Re-check after Maker Fail fix (`1370f75` hunk-scoped mutate + schema/template tests; `72ef048` PROGRESS).

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | **A** | `make verify` green (**727** tests). Layer 2: `npm test -- packages/core/src/realestate src/lib/loan-insurance-excel.test.ts packages/core/src/schema.insurance.test.ts packages/core/src/workbook-template.test.ts` → **92/92**. Layer 3: `make e2e` → **2/2**. **`make gauntlet` green**: mutation score **82.45%** ≥ break **80** (insurance 88.75 / loan 73.33 / projection 59.09 / property 95.35 / tax 83.49; **schema.ts 100%** / 10 killed; **workbook-template.ts 100%** / 1 killed; 0 no-cov). Test-removal guard OK vs `origin/main`. Prior Fail item (gauntlet 59.05%) **closed**. |
| Architecture | **A** | Insurance math in `@patrimo/core` `realestate/insurance.ts`; web + mobile serializers hydrate via `normalizeLoanInsurancePaliers` (CONSTRAINTS §6–§8, D7). ADR 0029 accepted; ADR 0028 `Status: accepted (superseded-in-part…)` + `Superseded-by:`; glossary + core ARCHITECTURE aligned. Prior ADR-number comment nits fixed (`schema.ts` cites 0027/0028). Hunk-scoped mutate (`scripts/lib/mutate-ranges.sh`) is an appropriate CONSTRAINTS §27 policy for shared schema/template modules. Clean-code: domain placement correct; web↔mobile parse helper duplication still acceptable (independent mappers). |
| Scope discipline | **B** | Post-Fail commits (`1370f75`, `72ef048`) stay on gauntlet/tests/docs for this CONTRACT. Branch still stacks parent reliability `a2a366c` (own CONTRACT + prior Checker Pass) — documented; not a second undocumented feature, but PR vs `origin/main` still spans two features. |
| Tests / evidence | **A** | Tier B teach-back accepted + Challenger Pass + `branch-ready` still present. RED evidence for Tranche1 N1–N6 E1–E9 and Tranche2 N7 N8 E10 E11 unchanged. Fresh green Layer 1–3 + gauntlet cited above. Done checkboxes T2–T4 checked. |
| Docs handoff | **A** | Cadrage lock / teach-back present (CONSTRAINTS §25). Prior docs nits closed: Done T2–T4, ADR comments 0027/0028, `loanInsurancePaliers` comment no longer “until tranche 2”. This re-Pass section + Last verify refreshed. |

**Prior Fail closed:** Yes — gauntlet **82.45%** (Checker-run), schema/workbook-template no longer drag whole-file mutate below 80.

### Coherence-code-doc (folded into Architecture)

| Axe | Statut | Constat |
|---|---|---|
| Fidélité décision | ✅ | Modes + paliers override + D5 year formula match ADR 0029 |
| Invariants | ✅ | Core-owned math; legacy default CRD; mobile read parity |
| Ancrage glossaire | ✅ | Borrower-insurance modes + Assurance emprunt |
| Placement | ✅ | ADR `docs/adr/`; mechanics in core ARCHITECTURE |
| Prior drift nits | ✅ | schema ADR comments + Workbook.loanInsurancePaliers comment fixed |

### Clean-code (folded into Architecture)

- ✅ Single formula path; serializers call core normalize (no parallel insurance math).
- ⚠️ Identical parse helpers web↔mobile — acceptable per independent mappers (docs/copy or small refactor later; not required).
- Gauntlet duplication signal (immobilier ↔ investissements / projection) informational only.

### Nits (optional — docs/copy-only; re-Checker **not** mandatory)

1. **docs/copy-only** — CONTRACT.md `## Checker` checkbox still unchecked until Maker ticks after this Pass / `make pr-check`.
2. **docs/copy-only** — On merge: FEATURES matrix note + rework-log row (already listed under On merge).
3. Informational: `projection.ts` local mutate score remains ~59% while **overall** ≥ 80 — same as prior reliability baseline; not a gate miss.

## Checker (2026-09-05)

**Verdict: Fail**

Isolated worktree: `patrimo-feat-realestate-loan-insurance-modes-checker` @ `07414d2` (detached HEAD of `feat/realestate-loan-insurance-modes`).

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | **C** | `make verify` green (723 tests). Layer 2: `npm test -- packages/core/src/realestate src/lib/loan-insurance-excel.test.ts` → **88/88**. Layer 3: `make e2e` → **2/2**. **`make gauntlet` FAIL**: mutation score **59.05%** under break **80** (realestate folder 82.64% — insurance 88.75 / loan 74.55 / projection 59.09 / property 95.92 / tax 83.87; **schema.ts 16.94%** with 203 survivors; **workbook-template.ts 0%** / 14 no-cov). Test-removal guard OK. CONSTRAINTS §27 requires gauntlet green on core + workbook I/O diffs. Prior PROGRESS “81.41%” reflects tranche-1 realestate-only mutate scope, not HEAD. |
| Architecture | **B** | Insurance math in `@patrimo/core` `realestate/insurance.ts` + loan/projection wiring; web `src/lib/excel.ts` + mobile `mobile/lib/excel-mobile.ts` both hydrate modes/paliers via `normalizeLoanInsurancePaliers` (CONSTRAINTS §6–§8, D7). ADR 0029 accepted; ADR 0028 has `Status: accepted (superseded-in-part…)` + `Superseded-by:`; glossary + `packages/core/ARCHITECTURE.md` aligned (coherence-code-doc ✅ decision/invariants/glossary). Clean-code: domain placement correct; expected duplicate `parseModeAssurance` / `parseLoanInsurancePaliers` in the two serializers (independent row mappers). Nits below (stale ADR numbers in schema comments). |
| Scope discipline | **B** | Insurance commit `07414d2` matches CONTRACT (modes + Assurance emprunt + web form + ADR 0029). Branch still stacks parent reliability `a2a366c` (own CONTRACT + prior Checker Pass) — documented “from reliability worktree”; not a second undocumented feature, but vs `origin/main` the PR surface is two features. |
| Tests / evidence | **B** | Tier B teach-back accepted + Challenger Pass + `branch-ready` recorded. RED evidence present for Tranche1 N1–N6 E1–E9 and Tranche2 N7 N8 E10 E11 (`make red` excerpts in this file). Green Layer 2 after GREEN. N9 listed Layers 1+3 only (disclaimer via `REAL_ESTATE_ASSUMPTIONS_FR` / `loanInsuranceRuleLabelFr`). Thin vs ideal: PROGRESS Done still unchecked for T2–T4 despite HEAD shipping them; no fresh green gauntlet for full mutate set. |
| Docs handoff | **C** | Cadrage lock / teach-back present (CONSTRAINTS §25 OK). ADR/glossary/FEATURES note shipped. **PROGRESS Current focus / Done / Last verify stale** (still “tranche 1 only” / gauntlet 81.41%) while CONTRACT cases and commit include workbook I/O + form + ADR — handoff not trustworthy for the next agent. |

**Fail reason:** Correctness **C** (mandatory `make gauntlet` red) with **no follow-up plan** previously recorded in PROGRESS — rubric Fail. New Checker required after Maker fixes (behavior/core/tests path — gauntlet / possibly more tests or Stryker ignore for pure sheet-name constants).

### Coherence-code-doc (folded into Architecture)

| Axe | Statut | Constat |
|---|---|---|
| Fidélité décision | ✅ | Modes CRD / CAPITAL_INITIAL / MONTANT_FIXE + paliers override + D5 year formula in `insurance.ts` match ADR 0029 |
| Invariants | ✅ | Core-owned math; legacy default CRD; mobile serializer read parity |
| Ancrage glossaire | ✅ | Borrower-insurance modes + Assurance emprunt sheet entries |
| Placement | ✅ | ADR under `docs/adr/`; mechanics in core ARCHITECTURE |
| Drift nit | ⚠️ | `schema.ts` comments still cite **ADR 0026** for CRD insurance (post-rebase: 0026 = feature-flow; CRD clause was 0027, modes = 0028) |

### Clean-code (folded into Architecture)

- ✅ Single formula `monthlyInsuranceForLoan`; serializers call `normalizeLoanInsurancePaliers` (no parallel insurance math).
- ⚠️ Identical `parseModeAssurance` / `parseLoanInsurancePaliers` / `hydratePropertyPaliers` copied web↔mobile — acceptable per independent mappers; optional shared helper later (docs/copy or small refactor — not required for Pass).
- Gauntlet duplication signal (immobilier ↔ investissements list blocks) informational only.

### Nits (for Maker after Fail fix — classify for re-check loop)

1. **behavior/core/tests** — Re-run / fix `make gauntlet` so overall mutation score ≥ 80 with current mutate set including `schema.ts` + `workbook-template.ts` (or justified ignoreStatic / narrower mutate policy documented in PROGRESS). **Re-Checker mandatory.**
2. **docs/copy-only** — Update PROGRESS Done checkboxes + Last verify to match HEAD (T2–T4 shipped). Re-check optional once #1 is green.
3. **docs/copy-only** — Fix `schema.ts` ADR number comments (0026→0027/0028). Re-check optional.
4. **docs/copy-only** — Stale `Workbook.loanInsurancePaliers` comment “until … tranche 2”. Re-check optional.

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md).

- Tier: B
- Framer session / date: 2026-09-02 (Intent / cases / D1–D8 LOCKED); 2026-09-05 post-rebase: N#/E# IDs + `## Tranches` + D9 shipping + ADR numbers 0027/0028 (harness-flow took ADR 0026)
- Challenger: Pass (2026-09-04)
- Teach-back: accepted (2026-09-04) — scenarios 1–5 all ✅ (CRD dégressif, capital initial plat, montant fixe, paliers priment sur mode, rétrocompat sans feuille/colonne)
- `make branch-ready`: green (2026-09-04, 14/14); re-checked after Tranches/IDs (2026-09-05, **15/15**)

## Done (this branch)

- [x] Feature branch from reliability worktree + `make branch-contract`
- [x] CONTRACT filled (Framer): modes CRD / capital initial / montant fixe + sheet **Assurance emprunt** paliers
- [x] Teach-back accepted by human (2026-09-04)
- [x] Challenger Pass
- [x] `make branch-ready` green
- [x] Rebase onto `main` (harness-flow #78 + rework-log #79); renumber reliability ADR → **0027**; insurance ADR target → **0028**; add case IDs + Tranches + D9
- [x] Tranche 1 Maker RED → GREEN (core): `insurance.ts` + loan/projection wiring; `make red` evidence recorded; `npm test -- packages/core/src/realestate` 81/81; `make verify` green
- [x] Harness fix incidental: `scripts/gauntlet.sh` excludes `*.test.ts` from `--mutate` (was mutating tests → meaningless survivors)
- [x] Post-rebase mobile typecheck: `assetId`→`assetIds`, `monthOfYear`→`paymentMonth` (reliability commit drift)
- [x] Reliability surface reworked for G4: expanded `tax`/`property`/`loan`/`projection` tests; Stryker-disable on `annualIrr` Newton/bisection internals; `make gauntlet` **81.41%** (≥ 80) on realestate-only mutate (pre-insurance commit)
- [x] Tranche 2 workbook I/O web + mobile + `loan-insurance-excel.test.ts`
- [x] Tranche 3 web Immobilier form + disclaimer / rule labels
- [x] Tranche 4 ADR 0029 + glossary + ARCHITECTURE + ADR 0028 supersession
- [x] Checker Fail (2026-09-05) — gauntlet 59.05% with whole-file mutate on `schema.ts` / `workbook-template.ts`
- [x] Maker: re-green gauntlet — hunk-scoped mutate (`scripts/lib/mutate-ranges.sh`) + `schema.insurance.test.ts` / `workbook-template.test.ts` → **82.45%**
- [x] Checker re-Pass (2026-09-05) — gauntlet **82.45%** confirmed; prior Fail closed
- [x] `make pr-check` READY + PR opened (#82)
- [ ] On merge: rework-log row (+ FEATURES already noted)

## Challenger findings (2026-09-04)

Blocking (CONTRACT must be edited before Maker starts):

1. **Mobile serializer missing from Scope** (CONSTRAINTS §8). `mobile/lib/excel-mobile.ts` has its own standalone `parseProperties` row-mapper (independent from `src/lib/excel.ts`'s), reading the `Immobilier` sheet column-by-column. It is not "reads via core" — core only supplies the zod schema, not the row→field mapping. Scope's file list must add `mobile/lib/excel-mobile.ts` (read path for `modeAssurance`/`assuranceMensuelle` columns and the new **Assurance emprunt** sheet) or D7/Exclusions must explicitly accept that mobile KPIs silently stay CRD-only (contradicts Success signal (1) "same bien" parity).
2. **D3/Edge gap: duplicate `Année début` rows for the same `Bien`.** No tie-break specified for two palier rows sharing the same property + `anneeDebut`. Add an Edge case + D3 line: deterministic rule (e.g. last row in sheet order wins) so write/read round-trip is not ambiguous.
3. **D5 year-index ambiguity (off-by-one risk).** `monthsSince` (property.ts) returns 0 for the current month and clamps at 0 (never negative); the existing `buildLoanSchedule` loop uses a 1-based `month` counter where `yearIndex = ceil(month/12)`. D5 says "Year 1 = months 1–12 (`ceil(m/12)`)" without saying whether `m` is the 1-based loop counter or the 0-based `monthsSince` elapsed count. At the exact 12-month boundary these two give different years for what should be the same instant (schedule loop: month 13 → year 2; snapshot via `monthsSince` = 12 → `ceil(12/12)` = year 1). Fix D5 to state the single canonical formula (e.g. `year = Math.floor(monthsElapsed/12) + 1`, applied identically in the year-table loop and any point-in-time snapshot), and add an Edge case for `monthsElapsed = 0` (loan starts this month, before first payment) so it resolves to year 1, not year 0.

Advisory (non-blocking, Framer can fold into implementation without re-cadrage):

4. Edge section should state the validation rule for negative/zero `assuranceMensuelle` on a palier row (presumably reject like `anneeDebut < 1`, mirroring `tauxAssurance`'s `nonnegative()` schema constraint) — currently only `MONTANT_FIXE` mode's zero case is covered, not malformed palier rows.
5. ADR (D8) Scope note only says "ADR 0026 « See also / superseded insurance clause »" — for consistency with the repo's established supersession pattern (ADR 0005, 0017, 0020, 0021, 0023, 0025 all add a `Superseded-by:` / `Status: accepted (superseded-in-part by …)` line, not just a See-also link), the new ADR's Scope line should say so explicitly.

Everything else — D1/D2/D4/D6/D7 alternatives, ADR-0027 supersession scoping (insurance clause only, rent/CAGR/TRI/single-engine untouched), Intent↔behavior-case coverage, teach-back scenarios 1–5 — holds and is not invalidated by the above; scenarios 1–5 remain valid once #2 and #3 are resolved (they don't touch the boundary conditions found here).

## Challenger re-check (2026-09-04)

Second pass (fresh read), verifying the Framer's edits against the 3 blocking + 2 advisory findings above, plus a fresh sweep of the rest of CONTRACT.md.

**Verdict: Pass.**

Verified against code, not just against the diff:

1. **Mobile serializer.** Confirmed `mobile/lib/excel-mobile.ts`'s `parseProperties` is a standalone hand-mapped row→field parser (no `modeAssurance`/`assuranceMensuelle`/paliers today, no dependency on `src/lib/excel.ts`) — matches `src/lib/excel.ts`'s own independent `parseProperties`, confirming CONSTRAINTS §8 applies to both. Scope/D7/Behavior nominal/Out-of-scope/Exclusions now say the same thing consistently: mobile serializer read path in scope, mobile CRUD/UI out of scope. No contradiction.
2. **D3 tie-break ("last row wins").** Confirmed implementable and idiomatic: `packages/core/src/manual-prices.ts`'s `normalizeManualPrices` already does exactly this pattern (`Map` keyed by identity, `byKey.set()` in array-iteration order → later entry wins). `XLSX.utils.sheet_to_json` iterates rows in physical sheet order (not a hash), so "last row in sheet order wins" is deterministic and reusable via the same Map idiom.
3. **D5 year index.** Derived the two formulas by hand: loop's existing `yearIndex = ceil(month/12)` (1-based payment index `month`) and the new canonical `year = Math.floor(monthsElapsed/12) + 1` are **the same function** once `monthsElapsed` is read as "months elapsed before this payment" (`monthsElapsed = month - 1`), which is exactly the `monthsSince`/`remainingBalance` convention already in `property.ts`/`loan.ts`. So: no breaking change to today's CRD-only year boundaries, and the original ambiguity (comparing loop `month` to raw `monthsSince` without the `floor(...)+1` correction) is genuinely resolved. One non-blocking suggestion for the Maker (not a cadrage gap): when refactoring `buildLoanSchedule` to share this formula with the palier lookup (D6), add a regression assertion that today's boundary months (12 → year 1, 13 → year 2) are unchanged — the algebra is correct but easy to flip during refactor.
4. **Advisory 4 (negative/zero palier amount).** Addressed with an explicit reject rule mirroring `tauxAssurance`'s `nonnegative()` — confirmed that constraint exists in `schema.ts`.
5. **Advisory 5 (ADR Superseded-by).** Addressed; confirmed the `Status: accepted (superseded-in-part by ADR-00XX — …)` / `Superseded-by:` pattern is real precedent (ADR 0005, 0017, 0020, 0021, 0023).

No new contradiction introduced by the edits; no remaining `OPEN` decision; Verification section already lists the mobile serializer test and the cross-platform round-trip check. Teach-back scenarios 1–5 stand — none of them exercise the 12-month-multiple boundary, so they are unaffected by the D5 clarification.

## RED evidence (when Layer 2 applies)

Per [tdd-red-green.md](../../howto/tdd-red-green.md) and `make red` (CONSTRAINTS §24 / ADR 0026 feature-flow).

*(entries appended by `make red` below)*

## Last verify

- Command: `make verify` + Layer 2 targeted + `make e2e` + `make gauntlet` (Checker re-Pass @ `72ef048`)
- Result: verify **727** green; Layer 2 **92/92**; e2e **2/2**; gauntlet **82.45%** (break 80) — insurance 88.75 / loan 73.33 / projection 59.09 / property 95.35 / tax 83.49 / schema 100 / workbook-template 100
- Date: 2026-09-05

## GREEN evidence (tranche 1)

- Command: `npm test -- packages/core/src/realestate` → 81/81 pass
- Also: `make verify` green; `make gauntlet` green (81.41%)
- Reliability rework: dedicated `property.test.ts`; full `annualTax`/`resaleTax`/`corporateTax` coverage; `annualIrr` solver internals Stryker-disabled (public IRR oracle kept)

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

Parent context: ADR **0027** (was numbered 0026 before harness-flow claimed that slot) locked CRD-only for `feat/realestate-projection-reliability`. This branch supersedes **insurance clause only** via new ADR **0028**.

Sheet name proposal (glossary): **Assurance emprunt** — columns `Bien`, `Année début`, `Assurance mensuelle (€)`.

Post-rebase (2026-09-05): `main` brought ADR 0026 feature-flow gates (`make red` / `make gauntlet` / `make checker` / `make pr-check`). CONTRACT updated with case IDs, Tranches, D9.

### RED evidence — Tranche1 N1 N2 N3 N4 N5 N6 E1 E2 E3 E4 E5 E6 E7 E8 E9: core insurance modes+paliers (CRD-only stub) (2026-09-05)

- Command: `npm test -- packages/core/src/realestate/insurance.test.ts packages/core/src/realestate/loan.test.ts packages/core/src/realestate/projection.test.ts`
- SHA: a2a366c
- Failure excerpt:
```
 ❯ packages/core/src/realestate/projection.test.ts:192:42
    190|   const withPaliers = propertySnapshot(property, NOW, paliers);
    191|   const without = propertySnapshot(property, NOW, []);
    192|   expect(withPaliers.monthlyPayment).not.toBeCloseTo(
       |                                          ^
    193|    without.monthlyPayment,
    194|    6,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/16]⎯

 Test Files  3 failed (3)
      Tests  16 failed | 25 passed (41)
   Start at  18:13:10
   Duration  342ms (transform 62ms, setup 0ms, collect 91ms, tests 27ms, environment 0ms, prepare 108ms)
```

### RED evidence — Tranche1 N2 N3 N4 N5 E1 E2 E8: projectProperty/propertySnapshot still CRD-only (monthlyInsuranceOnBalance) (2026-09-05)

- Command: `npm test -- packages/core/src/realestate/projection.test.ts -t 'insurance'`
- SHA: a2a366c
- Failure excerpt:
```
 ❯ packages/core/src/realestate/projection.test.ts:192:42
    190|   const withPaliers = propertySnapshot(property, NOW, paliers);
    191|   const without = propertySnapshot(property, NOW, []);
    192|   expect(withPaliers.monthlyPayment).not.toBeCloseTo(
       |                                          ^
    193|    without.monthlyPayment,
    194|    6,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯

 Test Files  1 failed (1)
      Tests  5 failed | 3 passed | 4 skipped (12)
   Start at  18:13:30
   Duration  342ms (transform 50ms, setup 0ms, collect 63ms, tests 9ms, environment 0ms, prepare 42ms)
```

### RED evidence — Tranche2 N7 N8 E10 E11: workbook insurance I/O web+mobile (2026-09-05)

- Command: `npm test -- src/lib/loan-insurance-excel.test.ts`
- SHA: a2a366c
- Failure excerpt:
```
 ❯ src/lib/loan-insurance-excel.test.ts:416:56
    414|    }),
    415|   );
    416|   expect(webExcel.loadWorkbook().loanInsurancePaliers).toEqual([
       |                                                        ^
    417|    { propertyId: "loc1", anneeDebut: 1, assuranceMensuelle: 45 },
    418|   ]);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯

 Test Files  1 failed (1)
      Tests  5 failed | 2 passed (7)
   Start at  18:32:56
   Duration  484ms (transform 90ms, setup 0ms, collect 218ms, tests 40ms, environment 0ms, prepare 32ms)
```

### RED evidence — N9: disclaimer lacked modes/paliers labels (2026-09-05)

- Command: `npm test -- packages/core/src/realestate/disclaimer-insurance.test.ts`
- SHA: e69ca72
- Failure excerpt:
```
 ❯ packages/core/src/realestate/disclaimer-insurance.test.ts:20:5
     18|   expect(
     19|    loanInsuranceRuleLabelFr({ modeAssurance: "CAPITAL_INITIAL" }),
     20|   ).toMatch(/capital initial/i);
       |     ^
     21|   expect(
     22|    loanInsuranceRuleLabelFr({ modeAssurance: "MONTANT_FIXE" }),

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

 Test Files  1 failed (1)
      Tests  2 failed (2)
   Start at  18:50:49
   Duration  371ms (transform 53ms, setup 0ms, collect 61ms, tests 5ms, environment 0ms, prepare 42ms)
```
