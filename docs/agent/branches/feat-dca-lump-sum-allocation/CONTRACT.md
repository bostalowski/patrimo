# Contract: DCA Exécution — Versement ponctuel + Actifs à alimenter

- Branch: `feat/dca-lump-sum-allocation`
- Slug: `feat-dca-lump-sum-allocation`
- Matrix row (FEATURES.md): DCA plans — web Exécution lump-sum + per-asset selection
- Cadrage tier: B (behavior)
- Challenger: recommended — reuses existing `computeDcaPlan` / `computeDcaExecution`; light core split helper only

## Intent

- Symptom (who / when / pain): L’utilisateur reçoit un capital ponctuel (bonus, vente, épargne accumulée) et veut l’investir en respectant ses plans DCA sans recalculer manuellement la part par enveloppe puis par titre. Exécution mensuelle permet déjà un override budget par plan, mais pas de montant total à ventiler ni de sélection de plans.
- Suspected cause (`fact`): Exécution est modélisée « mois par mois » — un budget par config, tous les plans affichés — sans mode « j’investis X € maintenant ».
- Lever: Section **Versement ponctuel** en tête de l’onglet Exécution : montant total + plans cochés → répartition inter-plans (pro-rata des montants mensuels sauvegardés) puis intra-plan via `computeDcaPlan` / `computeDcaExecution` existants.
- Success signal: Saisie de 2 000 € avec PEA + CTO cochés produit ordres par titre cohérents avec les cibles DCA, sans écriture workbook ; désactivation du mode revient au comportement Exécution mensuel actuel.
- Band-aid risk: Multiplier le budget mensuel par N mois ou forcer l’utilisateur à saisir chaque enveloppe à la main — ne couvre pas le cas « une somme à T » avec sélection de plans.

## Behavior cases

### Nominal

- [ ] If user enables **Versement ponctuel**, enters total amount > 0, and selects **one** DCA config, then that config receives 100 % of the total and execution lines match `computeDcaPlan` + `computeDcaExecution` with that amount (same algo as budget override today).
- [ ] If user enters total amount > 0 and selects **multiple** DCA configs, then inter-plan split is **pro-rata** on saved monthly `amount` (e.g. PEA 500 €/mois + CTO 300 €/mois, total 1 600 € → 1 000 € PEA + 600 € CTO), then per-plan asset split as above.
- [ ] If a DCA config is **not** checked, then its execution card is **hidden** (no order table for that plan).
- [ ] If lump-sum mode is **off** or total amount is empty/invalid, then Exécution behaves as today (saved monthly amounts + optional per-plan manual budget override).
- [ ] Min order, remainder, and rotation advice reuse existing `computeDcaExecution` behavior unchanged.

### Edge

- [ ] If **no** plan is checked while lump-sum mode is on with valid total, then show an explicit empty state (no crash, no orders).
- [ ] If a checked plan has saved monthly `amount === 0`, then it is **excluded from pro-rata**; if it is the only checked plan, show a warning and no orders.
- [ ] If user disables lump-sum mode, then lump-sum-derived amount overrides are **cleared** and budgets revert to saved monthly values.
- [ ] If user enables lump-sum then edits a per-plan budget field (D7), then that override wins for that plan (manual tweak after auto-split).
- [ ] Monthly DCA tilt (ADR 0022) is **not** applied in lump-sum mode — contributions follow saved DCA plan only.
- [ ] LIVRET configs may be checked explicitly; default selection excludes LIVRET (D5).

### Actifs à alimenter (intra-basket asset selection)

- [ ] If user **unchecks one asset** in a multi-asset basket, then that basket's budget is **reconcentrated on still-checked siblings only** — other baskets' contributions are unchanged (e.g. PEA 500 €/mois, World 75 % with 2 ETFs + EM 25 %; uncheck World ETF B → World ETF A gets full 375 €, EM still 125 €).
- [ ] If user unchecks assets with **zero holdings** in a basket, then remaining enabled assets split the basket budget **equally** (same rule as `splitWithinBasket` on the enabled subset).
- [ ] If user unchecks assets with **non-zero holdings**, then remaining enabled assets split the basket budget **proportionally to current values** (same rule as `splitWithinBasket` on the enabled subset).
- [ ] All assets default to **checked** (Alimenter ce mois-ci) on load; toggling recalculates execution immediately.
- [ ] Asset selection applies to **saved DCA path** (monthly budget and lump-sum); when monthly tilt is active, asset checkboxes are **hidden** (tilt already specifies per-asset euros).
- [ ] Asset selection works together with **Versement ponctuel** (lump-sum budget + per-asset filter).
- [ ] If **all assets in a basket** are unchecked, then show a warning for that plan and produce **no orders** for that basket's budget (remainder stays unallocated).

### Out of scope (asset selection)

- [ ] Explicitly not in this branch: persisting asset selection to workbook / DCA plan
- [ ] Explicitly not in this branch: applying asset selection when monthly tilt is active
- [ ] Explicitly not in this branch: mobile UI parity

### Out of scope (lump-sum)

- [ ] Explicitly not in this branch: workbook writes / persisting the lump-sum session
- [ ] Explicitly not in this branch: applying monthly diversification tilt to lump-sum
- [ ] Explicitly not in this branch: savings-capacity or EF amount suggestion (« combien investir »)
- [ ] Explicitly not in this branch: mobile UI parity
- [ ] Explicitly not in this branch: new workbook sheet or schema change
- [ ] Explicitly not in this branch: new Dashboard entry point

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | UI placement | **LOCKED** | Section **Versement ponctuel** at top of Investissements → Exécution tab | New tab; separate page — rejected (reuse Exécution surface) |
| D2 | Inter-plan split | **LOCKED** | Pro-rata on saved monthly `amount` among checked configs | Equal split; manual-only per plan — rejected |
| D3 | LIVRET | **LOCKED** | Included when explicitly checked (cash dépôt, no share lines) | Always excluded — rejected (multi-envelope consistency) |
| D4 | Zero monthly amount | **LOCKED** | Excluded from pro-rata; warn if sole checked plan | Equal share among checked — rejected |
| D5 | Default selection | **LOCKED** | All **investment** configs checked by default (`envelope !== LIVRET`); LIVRET unchecked | All checked including LIVRET — rejected (broker-first default) |
| D6 | Mobile | **LOCKED** | Web only this branch | Mobile parity — deferred |
| D7 | Post-split override | **LOCKED** | Per-plan budget fields remain editable after auto-split | Read-only after split — rejected |
| D8 | FR label | **LOCKED** | **Versement ponctuel** | « Investir une somme » — rejected (shorter, matches oneshot EF vocabulary) |
| D9 | Lump-sum off | **LOCKED** | Clear lump-sum overrides; revert to saved monthly budgets | Keep overrides — rejected (confusing mixed state) |
| D10 | Tilt interaction | **LOCKED** | Lump-sum ignores tilt; saved DCA only | Apply tilt to lump-sum — rejected (monthly pool semantics) |
| D11 | Asset checkbox placement | **LOCKED** | Column **Alimenter ce mois-ci** in each plan's execution table | Separate panel — rejected (inline with order line) |
| D12 | Intra-basket redistribution | **LOCKED** | Unchecked asset share reconcentrated **within same basket only**; other baskets unchanged | Redistribute to other baskets — rejected (would overweight EM) |
| D13 | Asset default selection | **LOCKED** | All assets checked by default | None checked — rejected (opt-out safer) |
| D14 | Asset selection persistence | **LOCKED** | Advisory only; not written to workbook | Persist per plan — deferred |
| D15 | Asset selection + tilt | **LOCKED** | Hide asset checkboxes when tilt active; tilt path unchanged | Filter tilt contributions — rejected (tilt is per-asset already) |
| D16 | Asset selection FR label | **LOCKED** | **Alimenter ce mois-ci** | « Inclure » — rejected (action-oriented) |

## Teach-back

- [x] Scenario 1: Plan PEA 400 €/mois (World 60 % / EM 40 %), portefeuille déséquilibré, versement ponctuel **800 €** sur PEA seul → ordres identiques à Exécution avec budget 800 €.
- [x] Scenario 2: PEA 500 €/mois + CTO 300 €/mois, les deux cochés, total **1 600 €** → 1 000 € PEA + 600 € CTO, puis répartition titres dans chaque enveloppe.
- [x] Scenario 3: Même setup, seul PEA coché, **1 600 €** → 100 % sur PEA.
- [x] Scenario 4: PEA min ordre 200 €, ligne sous seuil → reste + rotation comme Exécution actuel.
- [x] Scenario 5: Versement ponctuel désactivé → budgets mensuels sauvegardés, overrides ponctuels effacés.
- [x] Scenario 6: PEA 500 €/mois, World 75 % (ETF A + ETF B) + EM 25 %, décocher ETF B → ETF A reçoit 375 €, EM 125 €.
- [x] Scenario 7: Même plan, décocher tous les actifs World → avertissement panier World, EM inchangé à 125 €.
- [x] Scenario 8: Versement ponctuel 800 € sur PEA seul + décocher un ETF World → budget World reconcentré sur l'ETF coché, pas de changement inter-paniers.

## Scope

- [ ] Behaviors for this branch: (1) Advisory lump-sum split across selected DCA plans; (2) per-asset **Actifs à alimenter** checkboxes with intra-basket redistribution on web Exécution.
- [ ] Files / packages expected to change:
  - `packages/core/src/dca.ts` (+ tests) — `splitLumpSumAcrossDcaPlans`, `computeDcaPlan` optional `enabledAssetIds`
  - `src/app/investissements/dca-execution.tsx` (+ test) — Versement ponctuel + asset checkboxes
  - `docs/reference/glossary.md` — **Actifs à alimenter** term
  - `FEATURES.md` Notes on merge (DCA plans row)

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core/src/dca-lump-sum.test.ts packages/core/src/dca-asset-selection.test.ts src/app/investissements/dca-execution.test.tsx` — RED → GREEN per lump-sum + asset-selection cases
- Layer 3: `make e2e` (web UI change)
- Feature-specific: no workbook schema change; advisory read-only calculator

## Exclusions

- Not in this branch: mobile; tilt on lump-sum; workbook persistence; capacity/EF suggestion; Dashboard link
- **Follow-up (user request):** removed `DashboardExposureAlert` from web Dashboard (unrelated to lump-sum scope; breach detail on Diversification only)
- Do not refactor unrelated modules (monthly tilt, next-euro, diversification)

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when Layer 2 applied; Tier B teach-back / cadrage lock recorded when Layer 2 applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) DCA plans Notes: web Exécution lump-sum (Versement ponctuel)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass if `Challenger: required`, then `make branch-ready` must pass before coding.
