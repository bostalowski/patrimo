# Contract: Real-estate projection reliability & clarity

- Branch: `feat/realestate-projection-reliability`
- Slug: `feat-realestate-projection-reliability`
- Matrix row (FEATURES.md): Real estate (web done / mobile partial); Projection (web done / mobile partial)
- Cadrage tier: B (behavior)
- Challenger: required — structuring `@patrimo/core` realestate math (insurance, rent indexing, IRR) + mobile must consume core

## Intent

- Symptom (who / when / pain): Sur web et mobile, les projections immobilières sont lues comme des chiffres « exacts » alors qu’elles mélangent labels trompeurs (« rendement net » = cash-on-cash), hypothèses silencieuses (loyers constants, assurance sur capital initial), et une implémentation mobile divergente du core — l’utilisateur ne peut pas comparer ni faire confiance.
- Suspected cause (`fact`): Module `packages/core/src/realestate/*` sans tests ; métriques mal nommées ; assurance flat ; loyers non indexés ; CAGR présenté comme rendement annualisé ; mobile réimplémente une logique simplifiée ; seuils micro / déficit non signalés. (`fact` — revue concurrente 2026-09-02)
- Lever (where we act on the cause): Unifier le contrat produit (labels + hypothèses), brancher mobile sur `@patrimo/core`, corriger les formules structurantes (assurance CRD, indexation loyers, TRI), ajouter warnings fiscaux indicatifs, couvrir en tests RED → GREEN.
- Success signal (observable): (1) Web et mobile affichent les mêmes KPIs core pour un même bien/horizon ; (2) labels honnêtes + bloc hypothèses partagé ; (3) tests unitaires green sur loan/tax/projection pour les cas CONTRACT ; (4) `make verify` (+ e2e si UI web touchée).
- Band-aid risk (if we only treat the symptom): Renommer les labels sans unifier mobile ni corriger assurance/loyers laisserait des chiffres faux et divergents — confiance trompeuse.

## Behavior cases

### Nominal

- [ ] If mobile shows real-estate KPIs on **Projection › Immobilier** (`mobile/app/projection.tsx`) **and** Investissements › Immo (`mobile/app/investissements.tsx`), with the same workbook inputs and horizon as web, then equity, cash-flow, loan remaining, and yield labels come from `@patrimo/core` `projectProperty` / `propertySnapshot` — no parallel mobile formulas for those KPIs. (`mobile/app/index.tsx` already uses `computeNetWorth` → `currentEquity`; `mobile/app/fiscalite.tsx` has no foncier — out of this case.)
- [ ] If UI shows yield metrics (web Immobilier, web Projection, web Investissements, mobile Projection / Investissements › Immo), then gross yield stays « rendement brut » and the former « rendement net » is labeled as cash-on-cash after tax; CAGR and IRR (TRI) are labeled distinctly when shown.
- [ ] If projection runs for year `k` with rent index rate `r`, then year-k gross rent = year-0 gross rent × `(1+r)^(k)` (same multiplicative index for taxe foncière and charges non récup. ; gestion stays % of that year’s indexed rent).
- [ ] If web Projection overrides only « Revalo annuelle », then property value uses that override; rent/charges index at `rentIndexRate ?? override ?? property.revaloAnnuelle` — **default when a single revalo field exists: same rate for value and rents**. Disclaimer states this is not legal IRL.
- [ ] If loan insurance rate is set, then monthly insurance = remaining balance × (annualInsuranceRate / 12) (CRD-based), not principal × rate / 12. (`buildLoanSchedule` may stay flat this branch — document; projection path is CRD.)
- [ ] If apport > 0 and horizon > 0, then projection exposes both `cagr` (`(netIfSold/apport)^(1/horizon)-1`, rename from `annualizedReturn`) and `irr` (TRI) from **annual** cash-flow series: year 0 = −apport, years 1..n−1 = cashFlowAfterTax, year n = cashFlowAfterTax + resale netProceeds (share-adjusted). Distinct from portfolio daily XIRR.
- [ ] If web Immobilier / web Projection / mobile Projection / mobile Investissements › Immo is shown, then a shared assumptions disclaimer lists: indicative tax; rents/charges indexed at property revalo (not legal IRL) unless rent index 0; CRD insurance; sale simulated at horizon; detention SCI/DIRECT has no fiscal effect.

### Edge

- [ ] If annual rate is 0 % on the loan, then remaining balance declines linearly and insurance on CRD still applies when assurance rate > 0.
- [ ] If rent index rate is 0, then rents/charges stay constant (explicit opt-out of indexing). Mobile MUST NOT use silent `revaloAnnuelle || 0.02` fallback.
- [ ] If regime is `IR_MICRO` and `grossAnnualRent` > **15 000 €**, or `LMNP_MICRO` and `grossAnnualRent` > **77 700 €**, then UI shows a non-blocking warning (figures still computed in micro). Constants live in core helpers.
- [ ] If regime is `IR_REEL` and for any projected year `min(priorDeficit, netBeforeDeficit) > 10 700 €` (indicative annual global-imputation ceiling), then UI shows a non-blocking warning; `annualTax` amounts unchanged (full deficit still carried inside the property model).
- [ ] If `RESIDENCE_PRINCIPALE`, then gross rent is 0, labels use « coût mensuel » not locative yield, and disclaimer notes RP PV exemption as user hypothesis.
- [ ] If apport = 0, then CAGR and TRI are hidden or shown as n/a (not 0 pretending to be a return).

### Out of scope

- [ ] Explicitly not in this branch: full IFI engine; household progressive IR barème; CSG déductible nuance; surtaxe PV > 50 k€; SCI IS liquidation modeling beyond current flat-tax-on-distribution heuristic; Excel schema new columns for insurance mode (single CRD model only); mobile CRUD immobilier; changing workbook sheet names/enums.

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 — Labels | How to present « rendement net » | LOCKED | Rename to cash-on-cash after tax; keep gross yield; show CAGR and TRI with distinct labels | Keep misleading « rendement net »; replace with NOI-only and drop cash-on-cash |
| D2 — Mobile | Source of projection math | LOCKED | Mobile consumes `@patrimo/core` realestate projection/snapshot for KPIs | Keep simplified mobile formulas with « estimation » badge only |
| D3 — Insurance | Assurance emprunteur base | LOCKED | Always on remaining balance (CRD); no workbook toggle in this branch | Flat on initial principal; user toggle flat vs CRD |
| D4 — Rent index | Loyers / charges over horizon | LOCKED | Index gross rent, taxe foncière, charges non récup. via `rentIndexRate` option (default = property `revaloAnnuelle`; web single « Revalo » field drives both value and rents unless a separate rent-index control is added later). Gestion = % of indexed rent. `rentIndexRate = 0` freezes rents/charges. Not legal IRL — disclaimer required. No new workbook column. | Separate IRL field in workbook; never index (document only) |
| D5 — Returns | CAGR vs TRI | LOCKED | Expose `cagr` + `irr` on `RealEstateProjection` (rename `annualizedReturn` → `cagr`); UI shows both when apport > 0; annual IRR not portfolio XIRR | TRI only; CAGR only |
| D6 — Fiscal warnings | Micro ceilings / déficit plafond | LOCKED | Non-blocking UI warnings; core exports indicative constants: micro-foncier **15 000 €**, micro-BIC **77 700 €**, déficit foncier imputation globale **10 700 €/an**; helpers detect breach; **do not change tax amounts** in this branch | Auto-switch micro→réel; hard-cap deficit in annualTax |
| D7 — Detention | SCI / DIRECT | LOCKED | Keep field as UI metadata; disclaimer states no fiscal effect | Map detention→regime automatically |
| D8 — Retirement CF | Which year for monthlyRealEstateNet | LOCKED | Keep last projected year ÷ 12; document in disclaimer/ARCHITECTURE | Switch to year-1 or average (deferred) |
| D9 — Docs | ADR? | LOCKED | Short accepted ADR documenting indicative model + decisions D1–D8; update glossary yield terms + core ARCHITECTURE realestate note | Docs-only in UI strings without ADR |

## Teach-back

- [ ] Scenario 1: Bien locatif IR réel, apport 50 k€, horizon 20 ans, `revaloAnnuelle` = 2 % (un seul champ revalo). À l’année 10 : valeur du bien × 1,02^10 **et** loyer brut × 1,02^10 (pas l’IRL légal) ; assurance du mois sur CRD ; mobile Projection **et** Investissements › Immo affichent la même équité / cash-flow année 1 que le web (via core).
- [ ] Scenario 2: Même bien, écran Immobilier web : « Cash-on-cash après impôt » (pas « Rendement net ») + « Rendement brut » ; disclaimer : revente simulée à l’horizon, SCI/DIRECT sans effet fiscal, indexation loyers = revalo bien.
- [ ] Scenario 3: Crédit taux 0 %, assurance 0,3 % : CRD linéaire ; assurance mensuelle décroît avec le CRD ; tests unitaires le vérifient.
- [ ] Scenario 4: `IR_MICRO`, loyer annuel brut 16 000 € (> 15 000 €) : calcul reste micro ; warning non bloquant. `IR_REEL` avec imputation déficit simulée > 10 700 € une année : warning, impôt modèle inchangé.
- [ ] Scenario 5: Apport 40 k€, horizon 15 ans : UI Projection affiche **CAGR** et **TRI** (flux annuels −apport / CF / CF+revente) ; si apport = 0, pas de faux rendement à 0 %.

## Scope

- [x] One behavior for this branch: Make real-estate projections reliable and understandable — honest labels, shared core on web+mobile, CRD insurance, rent indexing, CAGR+TRI, indicative fiscal warnings, tests, ADR/docs.
- [x] Files / packages expected to change:
  - Core: `packages/core/src/realestate/{projection,loan,tax,property}.ts` + new `*.test.ts`; `packages/core/ARCHITECTURE.md`
  - Docs: new ADR (D9), `docs/reference/glossary.md`, platforms / FEATURES on merge
  - Web: `src/app/immobilier/page.tsx`, `src/app/projection/realestate-projection.tsx`, `src/app/investissements/investissements-client.tsx` (yield labels), `src/lib/realestate/*` if re-exports/helpers
  - Mobile: `mobile/app/projection.tsx`, `mobile/app/investissements.tsx` (must use core; remove parallel CRD / `revalo \|\| 0.02`)

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core/src/realestate` (and any colocated `*.test.ts`) — behavior cases above as RED → GREEN slices
- Layer 3: `make e2e` (web Immobilier / Projection UI copy + disclaimer paths)
- Feature-specific: manual spot-check one property web vs mobile same numbers for equity and year-1 cash-flow

When Layer 2 applies, makers follow [tdd-red-green.md](../../howto/tdd-red-green.md) (CONSTRAINTS §24).
Tier B cadrage: [cadrage-lock.md](../../howto/cadrage-lock.md) (CONSTRAINTS §25) before Maker.

## Exclusions

- Not in this branch: IFI, barème IR foyer, CSG déductible, surtaxe PV, SCI IS liquidation fine, workbook new insurance-mode column, mobile immobilier CRUD, envelope projection changes
- Do not refactor unrelated modules (`fiscalite.ts` enveloppes, DCA, goals)

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when Layer 2 applied; Tier B teach-back / cadrage lock recorded when Layer 2 applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed (mobile Projection / Real estate partial → closer to core parity for read projection)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass if `Challenger: required`, then `make branch-ready` must pass before coding.
