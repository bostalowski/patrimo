# Contract: Inclure l’immobilier dans les projections (défaut ON, décochable)

- Branch: `feat/projection-include-realestate`
- Slug: `feat-projection-include-realestate`
- Matrix row (FEATURES.md): Projection (web done / mobile partial) — deepen web; Real estate (web done)
- Cadrage tier: B (behavior)
- Challenger: recommended — booléen `includeRealEstate` dans `@patrimo/core` + surface Projection web ; pas de nouvelle feuille workbook ni d’ADR (D9). Skip Challenger noté en PROGRESS si non lancé.

## Intent

- Symptom (who / when / pain): Sur Projection web, l’utilisateur voit un patrimoine **financier** (onglet « Par enveloppe ») et un onglet Immobilier à part. Les loyers nets entrent déjà dans le bloc « revenu mensuel à la retraite », mais **sans contrôle**. Le capital / la courbe enveloppes **n’incluent pas** le patrimoine net immobilier. Impossible d’avoir une vue patrimoine total par défaut, ni d’exclure l’immobilier d’un scénario « financier seul ».
- Suspected cause (`fact`): `EnvelopeProjection` agrège uniquement `projectEnvelopesWithOverflow` ; `buildRetirementSources` ajoute toujours l’équité / cash-flow locatif des biens non-`RESIDENCE_PRINCIPALE` sans flag ; pas de case UI. (`fact` — lecture code 2026-10-05)
- Lever (where we act on the cause): Option `includeRealEstate` (défaut **true**) dans le cœur retraite / agrégation Projection ; case à cocher partagée sur Projection web qui bascule capital consolidé + loyers + courbe.
- Success signal (observable): (1) Par défaut, Projection « Par enveloppe » affiche un total / courbe qui **inclut** le patrimoine net immobilier projeté (biens retenus) ; (2) le bloc revenu retraite inclut les loyers nets quand la case est cochée ; (3) décocher retire équité + loyers des totaux / courbe / décomposition, sans toucher à l’onglet Immobilier what-if ; (4) tests core + UI ciblés green ; `make verify` + `make e2e`.
- Band-aid risk (if we only treat the symptom): Ajouter une case qui ne coupe que le libellé « Loyers nets » sans retirer l’équité du capital / de la courbe — l’utilisateur croirait avoir exclu l’immobilier alors qu’il reste dans les totaux.

## Behavior cases

### Nominal

- [x] N1: If Projection web charge avec au moins un bien locatif (non-`RESIDENCE_PRINCIPALE`) et la case « Inclure l’immobilier » est **cochée** (défaut), then le capital / total consolidé « Par enveloppe » inclut la somme des équités projetées des biens retenus, et le bloc revenu retraite inclut `monthlyRealEstateNet` dans la décomposition et les totaux.
- [x] N2: If l’utilisateur **décoche** « Inclure l’immobilier », then capital / courbe consolidée = financier seul ; loyers nets absents de la décomposition et des totaux revenu retraite ; les chiffres financiers (enveloppes, pension) restent inchangés.
- [x] N3: If l’utilisateur **recoché** la case, then les totaux / courbe / loyers reviennent aux valeurs « inclus » sans recharger la page.
- [x] N4: If aucun bien retenu (pas de propriétés, ou seulement `RESIDENCE_PRINCIPALE`), then la case reste visible (défaut cochée) ; totaux = financier seul ; pas de ligne « Loyers nets » fantôme.

### Edge

- [x] E1: If `includeRealEstate: false` est passé à `buildRetirementSources` (ou helper d’agrégation équivalent), then `realEstateEquityNominal` / `realEstateEquityReal` / `monthlyRealEstateNet` = 0 et `totalNominal` / `totalReal` = totaux financiers seuls — même avec des biens en entrée.
- [x] E2: If `includeRealEstate` est omis / `true` (défaut API), then comportement actuel d’inclusion des biens non-`RESIDENCE_PRINCIPALE` (équité + cash-flow) est conservé pour les callers retraite.
- [x] E3: If horizon retraite = 0 ou projection bien sans années, then avec include ON le cash-flow mensuel reste le snapshot année courante (règle ADR 0028 déjà en place) ; avec include OFF, cash-flow = 0.

### Out of scope

- [ ] Explicitly not in this branch: persistance workbook / nouvelle colonne Immobilier ; changer les formules `projectProperty` / assurance / TRI (ADR 0028–0029) ; CRUD immobilier ; parité mobile Projection (case + agrégation) — deferred ; onglet Immobilier what-if par bien (reste indépendant) ; IFI / fiscal engine ; inclure l’immobilier dans GoalsAlignment / Objectifs capitalisation.

## Product decisions

Status: **LOCKED** = cadrage for this branch · **OPEN** = must answer before coding.

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | Mécanique de livraison (tranches) | LOCKED | Une PR ouverte ; tranches = commits / groupes de commits reviewés incrémentalement sur la même branche | PRs empilées (merge avant tranche suivante) — rejeté pour ce scope (une surface UI) |
| D2 | Surfaces touchées | LOCKED | Une case partagée Projection web (barre au-dessus des onglets) pilotant (a) courbe + total consolidé enveloppes + immobilier et (b) loyers + part immobilier du capital du bloc revenu retraite. Onglet Immobilier what-if **inchangé**. | Case uniquement sur le bloc retraite (loyers) — rejette le besoin « dans les projections » capital/courbe. Deux cases capital vs loyers — rejeté (trop complexe). |
| D3 | Quels biens quand include ON | LOCKED | Garder le filtre actuel retraite : **exclure** `RESIDENCE_PRINCIPALE` (équité + cash-flow) ; n’agréger que les régimes locatifs / investissement. Disclaimer / copy le dit. | Inclure aussi l’équité résidence principale dans la courbe (loyers 0) — plus proche dashboard `computeNetWorth`, rejeté pour rester aligné retraite. Toggles par bien — hors scope. |
| D4 | Défaut UI + API | LOCKED | `includeRealEstate` défaut **`true`** (case cochée à l’arrivée). | Défaut false — contredit « par défaut ». |
| D5 | Persistance du choix | LOCKED | **Session UI seulement** (`useState`) — pas de workbook, pas de `config.json`, pas de `localStorage` cette branche. | `localStorage` ; champ profil retraite ; cellule workbook — différés. |
| D6 | Forme de la trajectoire immo dans la courbe | LOCKED | Ajouter l’équité projetée année par année (`projectProperty` → `years[].equity` ou équivalent core) à la série consolidée (nominal et réel, comme la courbe financière). | Seulement un KPI final sans courbe — trop faible. Série recalculée hors core — rejeté (CONSTRAINTS domaine). |
| D7 | API core | LOCKED | Étendre `buildRetirementSources` (et tout helper d’agrégation courbe partagé) avec `includeRealEstate?: boolean` défaut `true`. Pas de duplication des règles d’exclusion résidence principale hors core. | Flag UI-only sans param core — rejeté (CONSTRAINTS §6–§7). |
| D8 | Mobile | LOCKED | **Hors scope** cette branche (matrix Projection mobile reste partial). | Parité Expo — follow-up. |
| D9 | Documentation | LOCKED | Pas de nouvel ADR : booléen + UI documentés dans `packages/core/ARCHITECTURE.md` + entrée glossary « Projection include real estate ». | ADR obligatoire — rejeté (pas de nouvelle feuille ni invariant fiscal). |

## Teach-back

Human acceptance recorded in PROGRESS (`Teach-back: accepted`).

- [x] Scenario 1: Deux biens locatifs, équité projetée à 10 ans = 80 k€ + 40 k€, loyers nets agrégés = 900 €/mois. Arrivée sur Projection → case cochée ; total consolidé = financier + 120 k€ ; décomposition retraite montre « Loyers nets » 900 €.
- [x] Scenario 2: Même portefeuille, l’utilisateur décoche « Inclure l’immobilier » → total consolidé = financier seul ; plus de ligne loyers ; pension + intérêts enveloppes inchangés. Recoche → 120 k€ + 900 € reviennent.
- [x] Scenario 3: Uniquement une résidence principale (pas de locatif) → case cochée par défaut mais totaux = financier seul ; pas de loyers fantômes.
- [x] Scenario 4: `buildRetirementSources({ …, includeRealEstate: false })` avec biens locatifs → équité et `monthlyRealEstateNet` à 0 ; défaut / `true` → valeurs non nulles comme aujourd’hui.
- [x] Scenario 5: Onglet Immobilier what-if sur un bien reste utilisable et **identique** que la case globale soit cochée ou non.

## Scope

- [x] One behavior for this branch: Inclure l’immobilier (équité + loyers) dans les projections consolidées web par défaut, avec case pour l’exclure ; math d’agrégation dans `@patrimo/core`.
- [x] Files / packages expected to change:
  - Core: `packages/core/src/retraite.ts` (+ tests) ; éventuellement helper d’agrégation trajectoire dans `realestate/projection.ts` ou `projection.ts` ; `packages/core/ARCHITECTURE.md`
  - Web: `src/app/projection/projection-client.tsx`, `envelope-projection.tsx`, éventuellement `page.tsx` / charts ; e2e Projection si smoke UI
  - Docs: glossary + ARCHITECTURE ; pas d’ADR

## Verification

- `verify-static`: `make verify`
- `verify-behavior`: `npm test -- packages/core/src/retraite` (et tests agrégation trajectoire si extraits) + tests UI Projection ciblés si présents — cases N1–N4, E1–E3 en RED → GREEN
- `verify-e2e`: `make e2e` (UI Projection web : case + totaux)
- Screenshots: Projection « Par enveloppe » avec case cochée (total inclut immo) ; même écran décoché (financier seul) ; bloc revenu retraite avec/sans ligne loyers
- Feature-specific: ne pas casser l’onglet Immobilier what-if ni ADR 0028–0029

## Tranches

| # | Tranche | Behavior cases covered | Verify bands | PR / commit |
|---|---|---|---|---|
| 1 | Core flag `includeRealEstate` sur `buildRetirementSources` (+ tests agrégation) | E1 E2 E3 | `verify-static` `verify-behavior` | not yet shipped |
| 2 | Web : case UI + courbe / totaux enveloppes + bloc revenu + e2e / screenshots | N1 N2 N3 N4 | `verify-static` `verify-behavior` `verify-e2e` | not yet shipped |

## Exclusions

- Not in this branch: mobile parity ; persistance durable du toggle ; toggles par bien ; GoalsAlignment ; changement modèle `projectProperty` ; workbook schema
- Do not refactor unrelated modules

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when `verify-behavior` applied; Tier B teach-back / cadrage lock recorded when `verify-behavior` applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed (note Projection web : include-immobilier toggle)
- [ ] Append / refresh the [rework-log](../../rework-log.md) row **in this PR** via `make rework-log-stamp`; if overlap fires, human yes/no via `make rework-log-propose` (never silent auto-ack)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass if `Challenger: required`, then `make branch-ready` must pass before coding.
