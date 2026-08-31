# Contract: Multi-scénario pension publique (info-retraite)

- Branch: `feat/retirement-pension-scenarios`
- Slug: `feat-retirement-pension-scenarios`
- Matrix row (FEATURES.md): **Retirement profile** — deepen web (done → still done); mobile partial stays partial unless this branch adds parse of new fields only
- Relates: [ADR 0023](../../../adr/0023-goal-capitalisation-mode.md) (pension overlap à superséder en partie) ; [ADR 0014](../../../adr/0014-financial-goals.md) (horizon revenu : date seule)
- Cadrage tier: **B** (behavior)
- Challenger: required — structuring `@patrimo/core` pension resolution + nouvelle colonne Objectifs + ADR supersession overlap / horizon revenu

## Intent

- Symptom (who / when / pain): Sur info-retraite.fr l’utilisateur a **trois** estimations (âge légal / taux plein / taux plein automatique), chacune avec une **date** et un montant **brut**. Patrimo n’accepte qu’**un** couple âge + pension. Du coup Objectifs / Projection ne peuvent pas refléter le bon montant ni le bon horizon, et le % de progression d’un objectif revenu mensuel est faussé si la mauvaise pension (ou aucune / trop tôt) est appliquée.
- Suspected cause (`fact`): `RetirementProfile` = un seul `targetRetirementAge` + `estimatedPublicPension` ; overlap Objectifs = `targetAge >= targetRetirementAge` ([ADR 0023](../../../adr/0023-goal-capitalisation-mode.md)) ; Projection « revenu à la retraite » ancrée sur un seul horizon ; objectifs revenu ancrés sur un âge entier.
- Lever (where we act on the cause): Persister **jusqu’à trois scénarios officiels** (date exacte + brut) ; objectifs revenu sur **date cible seule** + choix explicite de pension ; select Projection du scénario actif (horizon + pension + brut/net/réel).
- Success signal (observable): Profil saisit les 3 lignes type info-retraite ; un objectif revenu a une **date** et un lien Aucune / scénario ; capital / progrès utilisent la pension nette **ssi** date objectif ≥ date scénario ; Projection select change date d’horizon du bloc retraite + montants (totaux en net).
- Band-aid risk (if we only treat the symptom): Garder un seul champ « meilleure estimation » ou trois montants sans date / sans lien Objectifs — on continuerait à mal dater la pension et à fausser le %.

## Behavior cases

### Nominal

- [ ] If le profil contient jusqu’à 3 scénarios typés chacun **renseigné** (`startDate` + `grossMonthly` ≥ 0), then round-trip `retirement-profile.json` conserve les trois ; slot incomplet = non renseigné (pas inventé).
- [ ] If un objectif `RETIREMENT_INCOME` a **pension publique = Aucune** (ou vide legacy), then **aucune** pension n’est soustraite — quel que soit le profil.
- [ ] If un objectif `RETIREMENT_INCOME` a une **date cible** + pension = type de scénario **renseigné**, **et** `targetDate` (jour civil Y-M-D) ≥ `startDate` du scénario, then soustraire `grossMonthly × PENSION_BRUT_TO_NET_APPROX` du besoin avant capitalisation ; assessment / copy exposent le net déduit ; progrès stock sur ce `requiredToday`.
- [ ] If sur Projection (bloc revenu retraite) l’utilisateur sélectionne un scénario renseigné, then horizon **de ce bloc** = `startDate` ; capital projeté du bloc utilise les années jusqu’à cette date ; pension = ce scénario (brut + net + réel) ; **totaux** = net / net déflaté (pas le brut) ; select = scénarios renseignés seulement. Ne change pas l’horizon Enveloppes / Immobilier ni GoalsAlignment.
- [ ] If le bloc Projection retraite affiche une pension, then on voit **brut**, **net approx**, et **réel** (net déflaté), libellés indicatifs.

### Edge

- [ ] If objectif lié **mais** `targetDate` &lt; `startDate` du scénario, then pension déduite = **0** ; copy peut signaler « avant le début de cette pension ».
- [ ] If objectif lié à un type **non renseigné** dans le profil, then traiter comme Aucune + warning UI si possible.
- [ ] If `RETIREMENT_INCOME` sans `targetDate` valide, then incomplete (pas d’overlap inventé ; validation refuse ou assessment incomplete).
- [ ] If `CAPITAL_AT_DATE`, then lien pension **n’influence pas** `requiredFromTarget` ; cellule pension peut rester vide.
- [ ] If `RETIREMENT_INCOME` lié + overlap + revenu cible mensuel ≤ pension nette, then `requiredToday = 0` et progrès stock = **1**.
- [ ] If profil legacy plat (`estimatedPublicPension` + `targetRetirementAge`) **avec** `birthDate`, then migration lecture : scénario `LEGAL_AGE` avec `grossMonthly = estimatedPublicPension` et `startDate` = anniversaire civil `birthDate + targetRetirementAge` (même jour/mois ; jour invalide → dernier jour du mois) ; `activeScenario = LEGAL_AGE`.
- [ ] If profil legacy **sans** `birthDate`, then scénario `LEGAL_AGE` avec montant seul (`startDate` absent = non renseigné) ; conserver `targetRetirementAge` en lecture jusqu’à ce que `birthDate` permette le recalcul de `startDate` (ou saisie manuelle de la date) ; ne pas inventer de date.
- [ ] If profil legacy avec `targetRetirementAge` **sans** `estimatedPublicPension`, then `LEGAL_AGE` avec `startDate` si `birthDate` sinon slot vide ; non renseigné tant que `grossMonthly` absent.
- [ ] If `activeScenario` pointe un type non renseigné (effacé), then normalisation : `activeScenario` vide ; Projection / Retraite sans scénario actif jusqu’à nouveau choix.
- [ ] If Objectifs legacy `RETIREMENT_INCOME` avec `targetAge` sans `targetDate` : si `birthDate` profil → `targetDate` = anniversaire civil `birthDate + targetAge` à la lecture/migration ; sinon incomplete jusqu’à saisie date. Nouveaux objectifs revenu : **date seule** (pas de saisie âge).
- [ ] If lecture Objectifs avec **âge et date** tous deux présents sur un revenu, then **`targetDate` gagne** pour toute math (ignorer l’âge).
- [ ] If écriture Objectifs `RETIREMENT_INCOME`, then cellule **`Âge cible` vide** ; `Date cible` requise.
- [ ] If aucun scénario renseigné, then bloc retraite Projection **et** surfaces Retraite (timeline « retraite visée », revenu durable, formulaire profil) : **pas d’horizon inventé** (pas de N années fixes, pas d’âge fantôme) — incomplete / copy « renseigner un scénario » ; pas de select utile ; pas de pension / pas de date « retraite visée » tant que `activeScenario` n’est pas un scénario **renseigné**.
- [ ] If comparaison de dates (overlap, horizons), then comparer **jour civil Y-M-D** uniquement (pas d’heure / timezone qui bascule le ≥).

### Out of scope

- [ ] Explicitly not in this branch: import PDF / API info-retraite ; moteur fiscal réel ; UI Objectifs mobile ; grille rendement×départ ; interpolation entre scénarios ; 4ᵉ scénario custom ; migrer le profil dans le workbook Excel.

## Product decisions

Status: **LOCKED** = cadrage for this branch · **OPEN** = must answer before coding.

| Decision | Status | Choice | Alternatives considered |
|---|---|---|---|
| Shape des estimations | **LOCKED** | Jusqu’à **3 scénarios** typés (`LEGAL_AGE`, `FULL_RATE`, `AUTOMATIC_FULL_RATE`), chacun : `startDate` + `grossMonthly` (brut €/mois ≥ 0). Libellés UI FR : âge légal / taux plein / taux plein automatique. | Un seul montant — rejeté. Liste libre N — rejeté. |
| Scénario « renseigné » | **LOCKED** | IFF `startDate` valide **et** `grossMonthly` défini (≥ 0, zéro autorisé). Sinon slot vide (hors select ; lien Objectifs → Aucune). | Date seule ou montant seul = renseigné — rejeté. |
| Quand la pension compte (temps) | **LOCKED** | Jour civil **Y-M-D** : `goal.targetDate ≥ scenario.startDate`. Plus de `targetAge >= targetRetirementAge`. | Overlap âge ADR 0023 — rejeté. Float `computeRetirementHorizon` pour overlap — rejeté. |
| Horizon Objectifs revenu | **LOCKED** | **Date seule** : `RETIREMENT_INCOME` exige `targetDate` (`Date cible`) ; **plus** de saisie/exigence `Âge cible` pour les nouveaux. Âge éventuel = affichage dérivé si naissance connue, pas source de vérité. | Anniversaire dérivé âge+naissance sans stocker la date — rejeté (humain : date seule). Garder âge + date — rejeté. |
| Objectifs — lien pension | **LOCKED** | Champ : **Aucune** \| codes scénario. Inclure = revenu de vie **total** (soustraire net du scénario). Défaut création = **Aucune**. | Auto par âge — rejeté. Défaut = scénario actif — rejeté. |
| Colonne Objectifs | **LOCKED** | Header exact : **`Pension publique`**. Cellules : vide ou `Aucune` ⇒ Aucune ; `LEGAL_AGE` ; `FULL_RATE` ; `AUTOMATIC_FULL_RATE`. Legacy sans colonne ⇒ Aucune. | Libellés FR en cellule — rejeté. Notes — rejeté. |
| Objectifs write revenu | **LOCKED** | `RETIREMENT_INCOME` : `Date cible` requise ; **`Âge cible` vide à l’écriture**. Si les deux présents à la lecture → `targetDate` gagne pour la math. | Garder âge en cellule — rejeté. |
| Projection — sélection | **LOCKED** | Select sur bloc revenu retraite ; **seul** endroit UI pour choisir `activeScenario` (pas de radio sur le formulaire profil) ; persisté ; change date/pension/capital **de ce bloc seulement**. Orphelin → `activeScenario` vide. | Auto-pick autre scénario — rejeté. Select session-only — rejeté. Un seul `years` page entière — rejeté. Radio doublon profil — retiré (humain 2026-08-31). |
| Projection — totaux | **LOCKED** | Afficher brut, net approx, réel (net déflaté). **Total mensuel** = intérêts nominal + **pension nette** + loyers. **Total réel** = intérêts réels + **pension nette déflatée** + loyers. Pas de brut dans les totaux. | Total en brut (status quo carte) — rejeté. |
| Horizon Projection sans scénario | **LOCKED** | **Aucun horizon inventé** : bloc incomplete ; copy « renseigner un scénario » ; pas de fallback N années / âge fantôme. | Horizon fixe 10 ans — rejeté. |
| Surfaces Retraite hors Projection | **LOCKED** | Même résolution que Projection : date/pension depuis `activeScenario` **renseigné** ; sinon pas de pension / pas de « retraite visée » inventée (formulaire profil, timeline, revenu durable, onglet Investissements). | Laisser cartes sur champs plats — rejeté. Hors scope — rejeté (humain). |
| Migration legacy profil | **LOCKED** | **Option A** : avec `birthDate`, scénario `LEGAL_AGE` = montant legacy + `startDate` anniversaire civil `birthDate + targetRetirementAge` ; `activeScenario = LEGAL_AGE`. Sans `birthDate` : montant seul + conserver `targetRetirementAge` en lecture jusqu’au recalcul ; `startDate` absent. | Ne pas inventer de date même avec naissance — rejeté (humain : A). Ignorer montant — rejeté. |
| Champs plats profil post-migration | **LOCKED** | UI n’édite plus `targetRetirementAge` / `estimatedPublicPension`. Après migration, **écriture** = `scenarios` + `activeScenario` (+ `birthDate`) seulement — **omit** les champs plats. Lecture : encore acceptés **une fois** pour migrer. Sans `birthDate`, `targetRetirementAge` peut rester en mémoire lecture jusqu’à dérivation de `startDate`. | Miroir permanent plats ↔ actif — rejeté. Garder édition UI des plats — rejeté. |
| Persistance profil | **LOCKED** | `retirement-profile.json` seulement (pas de feuille Excel Retraite). | Feuille workbook — exclu. |
| Documentation | **LOCKED** | Nouvel ADR (accepted on ship) supersède-en-partie overlap ADR 0023 **et** horizon revenu d’ADR 0014 (âge → date) ; MAJ glossary + docs. | Éditer 0014/0023 in place — rejeté. |

## Teach-back

Human acceptance recorded in PROGRESS (`Teach-back: accepted`). Scénarios alignés post-Challenger (date seule) — humain a reconfirmé les locks 2026-08-31.

- [x] **Trois saisies profil :** Scénarios âge légal / taux plein / auto (dates + bruts info-retraite). → Persistés ; select Projection propose les 3.
- [x] **Objectif avec taux plein :** Objectif revenu 3 000 €/mois, **date cible** ≥ 2054-04-01, pension = `FULL_RATE`, intérêts seuls 3 %. → Capitalise (3 000 − net) ; avec `Aucune` → capitalise 3 000.
- [x] **Avant la date du scénario :** Date cible **avant** 2054-04-01, lié `FULL_RATE`. → Pension déduite = **0**.
- [x] **Select Projection :** Âge légal → horizon + 2 966 brut/net/réel ; Auto → autre date/montant ; persisté ; totaux en net.
- [x] **Legacy :** Profil plat + birthDate → `LEGAL_AGE` renseigné + actif ; Objectifs sans colonne pension ⇒ Aucune ; ancien objectif âge-seul → date migrée si birthDate.

## Scope

- [ ] **One behavior:** multi-scénario pension (date + brut) ; Objectifs revenu en **date seule** + lien pension explicite ; select Projection retraite (portée bloc + totaux net) ; surfaces Retraite alignées sur `activeScenario`.
- [ ] Files / packages expected to change (indicative):
  - `packages/core` — `schema.ts`, `financial-goals.ts`, `retraite.ts` (+ tests)
  - `src/lib/store.ts`, API retirement-profile, UI `retraite` / `projection` / `objectifs` / investissements profil
  - `src/lib/excel.ts`, `mobile/lib/excel-mobile.ts`
  - ADR + glossary + ARCHITECTURE

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core/src/financial-goals packages/core/src/retraite` (+ excel goals) — Behavior cases ; **RED → GREEN**
- Layer 3: `make e2e` — UI / API profil + workbook Objectifs
- Feature-specific: 3 scénarios ; objectif date + lien ; select Projection ; legacy ; totaux net ; pas d’horizon inventé

When Layer 2 applies, makers follow [tdd-red-green.md](../../howto/tdd-red-green.md) (CONSTRAINTS §24).
Tier B cadrage: [cadrage-lock.md](../../howto/cadrage-lock.md) (CONSTRAINTS §25) before Maker.

## Exclusions

- Not in this branch: import info-retraite ; fiscalité personnalisée ; UI Objectifs mobile ; 3 colonnes sans select ; rendement×départ croisés ; 4ᵉ scénario ; profil dans Excel
- Do not refactor unrelated modules

## Checker

- [x] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md) — Pass 2026-08-31 (see PROGRESS)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when Layer 2 applied; Tier B teach-back / cadrage lock recorded when Layer 2 applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) if needed
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)
- [ ] ADR new + see-also ADR 0023 / 0014 ; glossary

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass (`Challenger: required`), then `make branch-ready` must pass before coding.

**Framer note (2026-08-31):** CONTRACT v3 réellement écrit sur disque : date seule ; migration A ; omit plats ; pas d’horizon inventé ; Retraite = activeScenario ; Objectifs write âge vide ; colonne + codes exacts. Re-Challenger #3bis — pas de Maker.
