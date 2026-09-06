# Contract: Real-estate borrower insurance modes & schedule

- Branch: `feat/realestate-loan-insurance-modes`
- Slug: `feat-realestate-loan-insurance-modes`
- Matrix row (FEATURES.md): Real estate (web done / mobile partial); Projection (web done / mobile partial)
- Cadrage tier: B (behavior)
- Challenger: required — new workbook sheet + structuring `@patrimo/core` loan insurance math + ADR superseding ADR 0028 insurance clause

## Intent

- Symptom (who / when / pain): Sur un crédit immo, l’assurance emprunteur est parfois un **taux** (sur CRD ou sur capital initial), parfois un **montant en €** ; et ce montant peut **changer par paliers** au fil des années (barème âge, avenant). Aujourd’hui Patrimo n’expose qu’un `tauxAssurance` et calcule uniquement **CRD × taux / 12** (ADR 0028) — l’utilisateur ne peut pas coller son échéancier réel ni projeter une assurance qui monte.
- Suspected cause (`fact`): Schéma `Immobilier` = une seule colonne « Taux assurance » ; pas de mode ni de série temporelle ; décision ADR 0028 / branche reliability a volontairement exclu les colonnes mode. (`fact` — feedback produit + revue 2026-09-02)
- Lever (where we act on the cause): Étendre le modèle assurance dans `@patrimo/core` + workbook : **modes de calcul** (CRD / capital initial / montant fixe) et **paliers optionnels** (année de crédit → €/mois) consommés par `projectProperty` / `buildLoanSchedule` ; UI web pour saisir ; disclaimer à jour.
- Success signal (observable): (1) Même bien projette une assurance dégressive CRD, plate sur capital initial, forfait €, ou suivant des paliers saisis — **identiquement sur web et mobile** (le sérialiseur mobile, indépendant du web, doit lire les mêmes colonnes/feuille) ; (2) tests unitaires green sur lookup paliers + chaque mode ; (3) workbook round-trip (lecture/écriture feuille + colonnes) sur les deux sérialiseurs ; (4) `make verify` + `make e2e`.
- Band-aid risk (if we only treat the symptom): Afficher un helper « la prime baisse avec le CRD » sans modes/paliers laisserait faux les contrats groupe (prime plate) et les barèmes qui montent — confiance trompeuse sur cash-flow et TRI.

## Behavior cases

### Nominal

- [x] N1: If property `modeAssurance` is `CRD` (default) and `tauxAssurance` > 0, then monthly insurance = remaining balance × (`tauxAssurance` / 12) — same as ADR 0028 projection path.
- [x] N2: If `modeAssurance` is `CAPITAL_INITIAL` and `tauxAssurance` > 0, then monthly insurance = `montantEmprunte` × (`tauxAssurance` / 12) for every month while loan remaining > 0 (flat; does not follow CRD).
- [x] N3: If `modeAssurance` is `MONTANT_FIXE` and `assuranceMensuelle` > 0, then monthly insurance = that euro amount while loan remaining > 0 (flat).
- [x] N4: If the optional sheet **Assurance emprunt** has one or more paliers for a property id, then for credit-year `y` (`y = Math.floor(monthsElapsed / 12) + 1`, canonical formula — see D5) monthly insurance = amount of the palier with the greatest `anneeDebut` ≤ `y`; paliers **override** the formula mode for that property.
- [x] N5: If paliers exist and the last applicable palier is before year `y`, that last amount continues (step function; no drop to 0 until loan ends).
- [x] N6: If loan remaining is 0, monthly insurance is 0 regardless of mode or paliers.
- [x] N7: If web property form / Immobilier CRUD saves a property, then `modeAssurance`, `tauxAssurance`, and `assuranceMensuelle` round-trip through the `Immobilier` sheet; paliers round-trip through **Assurance emprunt**.
- [x] N8: If a workbook is opened on **mobile**, the mobile serializer (`mobile/lib/excel-mobile.ts`, which has its own independent row→field mapping — it does not go through `src/lib/excel.ts`) parses `modeAssurance`, `assuranceMensuelle`, and the **Assurance emprunt** sheet the same way as web, so mobile projection/KPIs match web for the same property (read-only — no new mobile CRUD, per D7).
- [x] N9: If projection / Immobilier / Investissements show loan payment assumptions, then disclaimer (or assumptions block) states which insurance rule applies (CRD / capital initial / forfait / calendrier paliers).

### Edge

- [x] E1: If no paliers for the property, formula mode applies (no error).
- [x] E2: If `modeAssurance` is `MONTANT_FIXE` and `assuranceMensuelle` is 0, insurance is 0 (do not fall back to `tauxAssurance`).
- [x] E3: If `modeAssurance` is `CRD` or `CAPITAL_INITIAL` and `tauxAssurance` is 0, insurance is 0 (ignore `assuranceMensuelle`).
- [x] E4: If paliers list has gaps (e.g. years 1 and 8 only), years 2–7 use year-1 amount; years ≥ 8 use year-8 amount.
- [x] E5: If palier `anneeDebut` < 1, treat as invalid on write/parse (reject or clamp per core validation — **reject** row / skip with no silent year 0).
- [x] E6: If palier `Assurance mensuelle (€)` is negative or 0, treat as invalid on write/parse and **reject** that row (mirrors `anneeDebut < 1`; mirrors `tauxAssurance`'s `nonnegative()` schema constraint) — no silent 0 € palier.
- [x] E7: If two palier rows share the same `Bien` + `Année début`, the **last row in sheet order wins** (later row overwrites the earlier one for that year); this is enforced identically on parse, so re-saving is idempotent (no duplicate accumulation).
- [x] E8: If property has paliers but empty `dateDebutCredit` / no loan (`montantEmprunte` = 0 or `dureeMois` = 0), insurance contribution stays 0 in projection.
- [x] E9: If `monthsElapsed` = 0 (the loan's first month, before its first payment), credit-year `y` resolves to **1** (`Math.floor(0/12) + 1 = 1`), not 0 — so a palier with `anneeDebut = 1` applies from month 1.
- [x] E10: If workbook lacks sheet **Assurance emprunt**, behave as empty paliers (backward compatible).
- [x] E11: If legacy workbook has only `Taux assurance` and no `Mode assurance` column, default `modeAssurance` = `CRD`.

### Out of scope

- [ ] Explicitly not in this branch: auto barème by borrower age; PDF/échéancier import; quotités 100/100 vs 50/50; multi-emprunteur; monthly (non-annual) palier rows; insurance inflation % without user paliers; mobile immobilier **CRUD/edit UI** for modes/paliers (mobile gets **read-only parity** — its own serializer `mobile/lib/excel-mobile.ts` must parse the new columns/sheet so projection/KPIs match web, but no new mobile input forms this branch); changing rent-index / CAGR / TRI rules from ADR 0028; IFI / fiscal engine beyond using the computed `loanInsurance` assiette.

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 — Modes | Which formula modes on the property | LOCKED | Enum `modeAssurance`: `CRD` \| `CAPITAL_INITIAL` \| `MONTANT_FIXE`; default `CRD` | CRD only (status quo ADR 0028); single overloaded field without enum |
| D2 — Fixed amount field | Where to store €/month | LOCKED | New Immobilier column **Assurance mensuelle (€)** → `assuranceMensuelle`; used only when mode is `MONTANT_FIXE` | Overload `tauxAssurance` with euros; one ambiguous « valeur assurance » column |
| D3 — Schedule storage | How to store year evolution | LOCKED | Optional workbook sheet **Assurance emprunt** with columns `Bien`, `Année début`, `Assurance mensuelle (€)` — sparse paliers (change rows only); on duplicate `Bien`+`Année début`, **last row in sheet order wins** (enforced on parse, so idempotent on re-save) | JSON in Notes; one column per year on Immobilier; full year-by-year mandatory rows |
| D4 — Precedence | Paliers vs formula mode | LOCKED | If ≥ 1 valid palier for the property → step lookup overrides mode; else formula from D1 | Explicit fourth mode `CALENDRIER` required before reading sheet; merge (max of formula and palier) |
| D5 — Year index | Credit-year definition | LOCKED | Single canonical formula, applied identically in `buildLoanSchedule`'s year loop and any point-in-time snapshot: **`year = Math.floor(monthsElapsed / 12) + 1`**, where `monthsElapsed` is the 0-based count of full months since `dateDebutCredit` (same convention as `monthsSince` in `property.ts`). `monthsElapsed = 0` → year 1 (not year 0). Palier lookup keys off that integer. | Calendar year; age of borrower; the pre-existing 1-based `ceil(month/12)` loop counter (rejected: disagrees with `monthsSince` at the 12-month boundary — off-by-one) |
| D6 — Loan schedule helper | `buildLoanSchedule` vs projection only | LOCKED | Both projection path and `buildLoanSchedule` / `monthlyInsurance*` helpers honor mode + paliers (single core API) | Projection only; leave schedule on first-month CRD snapshot |
| D7 — UI scope | Where to edit | LOCKED | Web property form: mode + taux + montant fixe; editable paliers table (add/remove rows). Mobile: no new CRUD this branch, but its **own serializer** (`mobile/lib/excel-mobile.ts`) must be updated to parse the new columns/sheet (read-only parity — mobile KPIs/projection consume the same data as web, they do not reimplement insurance math) | Mobile CRUD parity same branch; leaving mobile serializer untouched (rejected — Challenger found this silently drops modes/paliers on mobile, contradicting the success signal) |
| D8 — Docs | ADR / glossary | LOCKED | New accepted ADR **0029** superseding ADR **0028** **insurance clause only** (modes + paliers + precedence); ADR 0028 itself gets an explicit `Status: accepted (superseded-in-part by ADR-0029 — insurance clause)` / `Superseded-by:` line (mirroring ADR 0005/0017/0020/0021/0023/0025), not just a See-also link; glossary term for borrower-insurance modes / Assurance emprunt sheet; update core ARCHITECTURE | Edit ADR 0028 in place without supersession note (rejected — breaks append-only ADR history); UI strings only; plain See-also link without a Status/Superseded-by line (rejected — inconsistent with repo's established supersession pattern). Note: after rebase onto harness-flow, ADR 0026 is feature-flow gates; real-estate reliability is ADR 0028 — numbering updated here without changing product choices. |
| D9 — Tranche shipping | How tranches reach review | LOCKED | Incremental commits in **one open PR** (first tranche opens the PR; later tranches push onto the same branch) | Stacked PRs merged before the next tranche pushes |

## Teach-back

- [x] Scenario 1: Bien, emprunt 200 k€, mode `CRD`, taux 0,30 %. Mois 1 assurance = 200k × 0,003 / 12 ; après amortissement partiel, mois ultérieur avec CRD 100 k€ → assurance moitié. Aucun palier.
- [x] Scenario 2: Même emprunt, mode `CAPITAL_INITIAL`, taux 0,30 %. Assurance mensuelle = 50 € **constante** tant que le crédit court (ne suit pas le CRD).
- [x] Scenario 3: Mode `MONTANT_FIXE`, `assuranceMensuelle` = 42 €, taux saisi à 0,30 % ignoré. Assurance = 42 €/mois jusqu’à fin de crédit.
- [x] Scenario 4: Paliers sur le bien — année début 1 → 40 €, année début 10 → 55 €. Années de crédit 1–9 : 40 €/mois ; années ≥ 10 : 55 €/mois — **même si** le mode propriété est `CRD`. Fin de crédit → 0.
- [x] Scenario 5: Workbook sans feuille **Assurance emprunt** et sans colonne Mode : comportement = `CRD` + `tauxAssurance` (rétrocompat ADR 0028). Ajout de la feuille vide ne change rien.

## Scope

- [x] One behavior for this branch: Model borrower insurance as CRD rate, initial-capital rate, fixed €/month, or optional annual paliers override — core math + workbook I/O + web form + docs (ADR/glossary/ARCHITECTURE).
- [x] Files / packages expected to change:
  - Core: `packages/core/src/schema.ts`, `workbook-template.ts`, `realestate/loan.ts`, `realestate/projection.ts` (+ tests); possibly small `realestate/insurance.ts` helper; `ARCHITECTURE.md`
  - Docs: new ADR 0029 (D8), glossary, platforms note if needed; ADR 0028 gets an explicit `Superseded-by:`/`Status: accepted (superseded-in-part …)` line (not just See-also)
  - Web: `src/lib/excel.ts` (read/write), `src/app/immobilier/property-form.tsx` (+ list/projection copy if disclaimer), e2e if workbook smoke covers Immobilier
  - Mobile: **`mobile/lib/excel-mobile.ts`** — its independent `parseProperties` row-mapper must read `modeAssurance`/`assuranceMensuelle` columns and the **Assurance emprunt** sheet (read path only, no new CRUD/UI); verify projection/KPIs still consume core (no parallel insurance formula)

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core/src/realestate` (and any new insurance helper tests), plus `npm test -- mobile/lib/excel-mobile` (or existing mobile excel test path) for the mobile serializer's new column/sheet parsing — behavior cases above as RED → GREEN slices
- Layer 3: `make e2e` (workbook I/O + web Immobilier form paths)
- Feature-specific: round-trip one property with paliers in Excel → reload on **both** web and mobile serializers → same projection year-1 / year-10 insurance totals

When Layer 2 applies, makers follow [tdd-red-green.md](../../howto/tdd-red-green.md) (CONSTRAINTS §24).
Tier B cadrage: [cadrage-lock.md](../../howto/cadrage-lock.md) (CONSTRAINTS §25) before Maker.
Gates: [feature-flow.md](../../howto/feature-flow.md) (G0–G7; CONSTRAINTS §26–27).

## Tranches

Ship as incremental commits in one open PR (D9).

| # | Tranche | Behavior cases covered | Layers | PR / commit |
|---|---|---|---|---|
| 1 | Core insurance math (schema + `insurance.ts` + loan/projection) | N1 N2 N3 N4 N5 N6 E1 E2 E3 E4 E5 E6 E7 E8 E9 | 1+2 | Maker GREEN + gauntlet |
| 2 | Workbook I/O web + mobile serializers + template sheet | N7 N8 E10 E11 | 1+2+3 | Maker GREEN |
| 3 | Web Immobilier form + disclaimer copy | N9 | 1+3 | Maker GREEN |
| 4 | ADR 0029 + glossary + ARCHITECTURE + ADR 0028 supersession line | | 1 | Maker GREEN |

## Exclusions

- Not in this branch: age-auto barème, PDF import, quotités, multi-emprunteur, mobile insurance **CRUD/edit UI** (the mobile *serializer* read path is in scope, per Scope above), rent/TRI/label changes from reliability branch, fiscal engine changes beyond insurance assiette
- Do not refactor unrelated modules (envelopes, DCA, goals, livret rates)

## Checker

- [x] `make checker` (isolated worktree) will score with [scoring-rubric.md](../../scoring-rubric.md) — Fail then re-Pass 2026-09-05 (gauntlet hunk-scope fix)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when Layer 2 applied; Tier B teach-back / cadrage lock recorded when Layer 2 applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed (Real estate note: insurance modes + optional Assurance emprunt sheet)
- [ ] Append a row to [docs/agent/rework-log.md](../../rework-log.md)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass if `Challenger: required`, then `make branch-ready` must pass before coding.
