# Contract: Per-goal capitalisation mode + pension overlap

- Branch: `feat/goal-capitalisation-mode`
- Slug: `feat-goal-capitalisation-mode`
- Matrix row (FEATURES.md): **Financial goals (Objectifs)** — web already done; no matrix status change expected (behavior deepen of existing row)
- Relates: [ADR 0014](../../../adr/0014-financial-goals.md) (supersede capitalisation / pension / rate parts via new ADR on ship)
- Cadrage tier: **B** (behavior)
- Challenger: **required** — new workbook columns + structuring `@patrimo/core` capitalisation / pension-overlap invariant + ADR supersession

## Intent

- Symptom (who / when / pain): Sur Objectifs, le capital requis pour un revenu à un âge donné est capitalisé à un **taux de retrait global 4 %** (profil retraite, non éditable en UI). Ça ne correspond pas à « vivre sur les intérêts sans toucher au capital », et le taux n’est pas réglable **par objectif**. La pension publique est **toujours** soustraite pour tout objectif revenu, même si l’âge cible est **avant** l’âge de départ du profil (ex. objectif 58 ans, départ 64 ans) — alors que la pension n’est pas encore disponible.
- Suspected cause (`fact`): ADR 0014 fixe `requiredFromTarget = annualGap / withdrawalRate` avec `withdrawalRate` sur `retirement-profile.json` (défaut 0.04) et `annualGap` qui soustrait toujours `pensionNet`, sans comparer `targetAge` à `targetRetirementAge`.
- Lever (where we act on the cause): Persister **par objectif** le mode de capitalisation + le taux ; n’inclure la pension que quand l’objectif **recoupe** l’âge de départ ; documenter dans un ADR qui supersède le contrat capitalisation d’ADR 0014.
- Success signal (observable): Sur Objectifs, chaque objectif revenu montre / édite mode + taux ; le capital requis change quand on bascule intérêts-seuls vs retrait, et la pension n’entre dans le calcul **que** si `âge cible ≥ âge départ profil` et pension renseignée. Round-trip feuille `Objectifs` web + mobile.
- Band-aid risk (if we only treat the symptom): Exposer seulement le `withdrawalRate` global du profil sans mode « intérêts seuls » ni règle d’âge — on garderait un seul levier ambigu et on continuerait à compter la pension trop tôt.

## Behavior cases

### Nominal

- [ ] If un objectif `RETIREMENT_INCOME` a **vivre sur le capital = Non** (intérêts seuls) et un taux saisi (ex. 3 %), then `requiredFromTarget = annualNeed / rate` avec `annualNeed` = revenu annuel cible (moins pension nette **seulement** si overlap — voir edge).
- [ ] If le même objectif bascule **vivre sur le capital = Oui** avec taux 4 %, then le capital requis utilise ce taux (retrait) ; défauts à la création : mode Non + taux 3 % ; si l’utilisateur passe en Oui sans retoucher le taux, appliquer le défaut 4 % **uniquement** quand le taux était encore le défaut intérêts-seuls (3 %) — sinon conserver la saisie libre.
- [ ] If pension publique estimée est renseignée sur le profil **et** `goal.targetAge >= profile.targetRetirementAge`, then la pension nette (`brut × PENSION_BRUT_TO_NET_APPROX`) est soustraite du besoin annuel avant capitalisation (comme aujourd’hui quand elle est prise en compte).
- [ ] If Objectifs est sauvegardé puis rechargé (web Excel + mobile parse), then les colonnes mode / taux round-tripent ; absence des nouvelles colonnes sur un classeur ancien ⇒ défauts (intérêts seuls, 3 %).

### Edge

- [ ] If `goal.targetAge < profile.targetRetirementAge` (ex. 58 vs 64) **ou** pension non renseignée, then **ne pas** soustraire la pension : capitaliser 100 % du revenu cible.
- [ ] If après soustraction pension le besoin annuel ≤ 0, then `requiredToday = 0` et progrès stock = 1 (déjà couvert).
- [ ] If type = `CAPITAL_AT_DATE`, then mode / taux / pension **n’influencent pas** `requiredFromTarget` (= `targetAmount`) ; les champs mode/taux peuvent être absents ou ignorés à la normalisation.
- [ ] If taux saisi ≤ 0 ou hors borne [0, 0.10] (hors 0), then validation refuse la sauvegarde (même esprit que `withdrawalRate` profil actuel, max 10 %) ; 0 exclus pour éviter division.

### Out of scope

- [ ] Explicitly not in this branch: UI mobile Objectifs (reste gap plateforme) ; second éditeur de scénario sur Projection ; stochastic ; enveloppes exclusives par objectif ; changer la carte Projection « sans toucher au capital » (reste dérivée des rendements enveloppes) ; recalculer le taux par défaut depuis les enveloppes Projection.

## Product decisions

Status: **LOCKED** = cadrage for this branch · **OPEN** = must answer before coding.

| Decision | Status | Choice | Alternatives considered |
|---|---|---|---|
| Scope of rate/mode | **LOCKED** | Mode + taux **par objectif** (feuille `Objectifs`), pas sur le profil retraite. | Un seul `withdrawalRate` profil (status quo) — rejeté : pas assez fin. |
| Default draw-on-capital mode | **LOCKED** | **Vivre sur le capital = Non** (intérêts seuls / capital préservé en nominal au sens du taux). | Défaut Oui (SWR 4 %) — rejeté : contraire à l’intention utilisateur. |
| Default capitalisation rates | **LOCKED** | Saisie libre bornée `]0, 0.10]` ; défaut **3 %** en intérêts seuls ; défaut **4 %** en mode vivre sur le capital. À la création d’un objectif revenu : Non + 3 %. | Un seul défaut 4 % pour les deux modes ; dériver le taux des rendements Projection — rejetés (simplicité / ADR 0014 interdit un second scénario Projection dédié aux objectifs). |
| When public pension counts | **LOCKED** | Inclure pension nette **ssi** pension renseignée **et** type revenu **et** `targetAge >= targetRetirementAge`. | Égalité stricte d’âge seulement ; flag « Inclure pension » par objectif — rejetés (trop étroit / UI inutile si l’âge suffit). |
| Workbook columns | **LOCKED** | Ajouter sur `Objectifs` : `Vivre sur le capital` (`Oui`/`Non`, vide ⇒ `Non`) → `drawOnCapital` boolean (default false) ; `Taux capitalisation` (nombre — **Maker : une convention unique** fraction `0.03` ou pourcent `3`, documentée ADR + excel-workbook ; vide ⇒ défaut selon mode). | Garder le taux seulement dans `retirement-profile.json` — rejeté. |
| Profile withdrawalRate vs goals | **LOCKED** | **Ne plus** alimenter le calcul Objectifs. Champ profil peut rester en schema pour compat lecture mais Objectifs ignore ; pas d’obligation d’UI profil dans cette branche. | Continuer à fallback sur le profil si cellule taux vide — rejeté (double source). |
| Documentation / ADR | **LOCKED** | Nouvel ADR **accepted on ship** qui supersède le bloc « Required capital / withdrawalRate / pension always » d’ADR 0014 ; append-only see-also sur 0014 ; MAJ glossary + `packages/core/financial-goals.md` + excel-workbook. | Éditer ADR 0014 in place — rejeté (déjà accepted / en prod). |
| Web vs mobile surfaces | **LOCKED** | Web : éditeur Objectifs + assessment copy. Mobile : parse/serialize des nouvelles colonnes uniquement (pas d’UI Objectifs). | UI mobile Objectifs — exclu (gap existant). |

## Teach-back

Human acceptance recorded in PROGRESS (`Teach-back: accepted`).

- [ ] **Intérêts seuls + overlap pension :** Profil départ 64 ans, pension brute telle que nette ≈ 2 000 €/mois. Objectif revenu 3 000 €/mois à **64** ans, vivre sur le capital = Non, taux 3 %. → Besoin annuel = (3 000 − 2 000) × 12 = 12 000 € ; capital requis = 12 000 / 0.03 = **400 000 €**.
- [ ] **Avant la retraite (pas de pension) :** Même profil. Objectif revenu 3 000 €/mois à **58** ans, Non, 3 %. → Pas de pension dans le calcul ; capital = 36 000 / 0.03 = **1 200 000 €**.
- [ ] **Vivre sur le capital :** Objectif 3 000 €/mois à 64 ans, Oui, 4 %, même pension nette 2 000 €. → Capital = 12 000 / 0.04 = **300 000 €**.
- [ ] **Classeur ancien :** Ligne Objectifs sans les nouvelles colonnes. → Normalisation : `drawOnCapital = false`, taux 3 % ; comportement intérêts seuls.
- [ ] **Capital à date inchangé :** Objectif `CAPITAL_AT_DATE` 200 000 €. → `requiredToday = 200 000` quel que soit le profil / mode / taux éventuels.

## Scope

- [ ] **One behavior:** capital requis des objectifs revenu = `annualNeed / perGoalRate`, avec mode intérêts-seuls vs retrait **par objectif**, et pension seulement si l’âge cible recoupe l’âge de départ du profil.
- [ ] Files / packages expected to change (indicative):
  - `packages/core` — `schema.ts` (`FinancialGoal`), `financial-goals.ts` (+ tests), `financial-goals.md`
  - `src/lib/excel.ts`, `mobile/lib/excel-mobile.ts`, tests excel goals
  - `src/app/objectifs/goals-editor.tsx`, `goals-assessment.tsx` (copy mode/taux/pension)
  - callers qui passent encore `withdrawalRate` du profil pour Objectifs
  - `docs/adr/00xx-…`, glossary, `docs/reference/excel-workbook.md`, see-also ADR 0014

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core/src/financial-goals` (+ excel round-trip tests touchés) — slices = Behavior cases (nominal + edge) ; **RED → GREEN** par cas
- Layer 3: `make e2e` — workbook I/O Objectifs (nouvelles colonnes) / API goals si couvert
- Feature-specific:
  - Créer objectif revenu → défauts Non + 3 % ; capital = annual / 0.03 (sans pension si âge < départ)
  - Âge ≥ départ + pension → soustraction visible dans le besoin
  - Basculer Oui + 4 % → capital recalculé
  - Reload workbook → champs persistés
  - `CAPITAL_AT_DATE` inchangé

When Layer 2 applies, makers follow [tdd-red-green.md](../../howto/tdd-red-green.md) (CONSTRAINTS §24).
Tier B cadrage: [cadrage-lock.md](../../howto/cadrage-lock.md) (CONSTRAINTS §25) before Maker.

## Exclusions

- Not in this branch: mobile Objectifs UI ; Projection alignment rate editor ; changing Projection « revenus sans toucher au capital » card formula ; auto-sync taux depuis enveloppes ; stochastic ; exclusive envelopes per goal ; emergency-fund / down-payment goal types ; forcing UI for profile `withdrawalRate`
- Do not refactor unrelated modules

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when Layer 2 applied; Tier B teach-back / cadrage lock recorded when Layer 2 applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) only if matrix wording needs a note (likely unchanged — still « done » web / « absent » mobile UI)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)
- [ ] ADR new + see-also on 0014 ; glossary Financial goal bullets for `drawOnCapital` / rate / pension overlap

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass (`Challenger: required`), then `make branch-ready` must pass before coding.

**Framer note:** décisions verrouillées avec l’humain (2026-08-29) : par objectif ; défauts Non / 3 % / 4 % ; overlap `targetAge >= targetRetirementAge`. En attente : validation teach-back (scenarios ci-dessus) + Challenger Pass avant Maker.
