# Contract: Taxe foncière par année, prise en compte dans le résultat immobilier

- Branch: `bostalowski/ajout-taxe-foncière`
- Slug: `bostalowski-ajout-taxe-fonci-re`
- Matrix row (FEATURES.md): Real estate — web (done), mobile stays read-only/partial, no mobile UI change
- Cadrage tier: B (behavior)
- Challenger: required — new workbook sheet + structuring change to `@patrimo/core` real-estate math

## Intent

- Symptom (who / when / pain): un utilisateur avec un bien locatif voit sa taxe foncière augmenter chaque année dans la réalité, mais le simulateur Patrimo n'a qu'un seul montant fixe par bien (`Property.taxeFonciere`), utilisé identique sur tout l'horizon de projection — les charges d'exploitation et le résultat global à la revente sont donc sous-estimés au fil du temps.
- Suspected cause (`fact`): `packages/core/src/schema.ts` modélise `taxeFonciere` comme un `number` unique par bien (pas de série temporelle), et `realestate/property.ts#operatingForYear` + `realestate/projection.ts#projectProperty` réutilisent cette même valeur pour chaque année `k` de l'horizon.
- Lever (where we act on the cause): ajouter une source de vérité par (bien, année) pour la taxe foncière (nouvelle feuille du classeur, même pattern que `Prix manuels`/`ManualPrice`), et faire résoudre `operatingForYear`/`projectProperty` sur la valeur de l'année concernée au lieu de la constante `property.taxeFonciere`.
- Success signal (observable): pour un bien avec un historique de taxe foncière saisi, `projectProperty` déduit chaque année le bon montant (valeur connue de cette année, ou dernière valeur connue si l'année est postérieure à la dernière saisie), et `totalReturn`/`netIfSold` reflètent cette charge variable — sans rien casser pour un bien qui n'a pas encore d'historique saisi (il continue à utiliser l'ancien champ plat).
- Band-aid risk (if we only treat the symptom): si on se contente d'augmenter manuellement le seul champ `taxeFonciere` existant sans historiser, on perd la valeur des années passées et le calcul reste un instantané figé — pas de vraie série, pas de trace, et toute réouverture future du sujet repart de zéro.

## Behavior cases

Give each Nominal/Edge case a stable ID (`N1`… / `E1`…) — the `## Tranches` table references cases by ID only.

### Nominal

- [x] N1: Si un bien a des entrées de taxe foncière pour 2023 (850 €), 2024 (900 €), 2025 (950 €), alors pour l'année civile 2025 (voir D6 pour le mapping index↔année), `operatingForYear`/`projectProperty` utilisent 950 € (et non l'ancien champ plat `property.taxeFonciere`).
- [x] N2: Si l'horizon de projection dépasse la dernière année connue (dernière entrée = 2025 à 950 €, horizon incluant 2026–2029), alors chaque année 2026–2029 réutilise 950 € (dernière valeur connue), sans augmentation automatique.
- [x] N3: La feuille classeur dédiée (`SHEET_TAXE_FONCIERE`, colonnes `Bien` / `Année` / `Montant`) est lue et écrite par les deux sérialiseurs de plateforme (web + mobile) et round-trip sans perte via `parseWorkbook`/écriture.
- [x] N4: `propertySnapshot` expose un nouveau champ `currentPropertyTax` = la taxe foncière résolue pour l'année civile courante (D6) ; `netYield`/`monthlyCashFlowAfterTax` (qui dérivent de `operatingForYear` via `projectProperty`) reflètent aussi cette valeur résolue plutôt que le champ plat brut. (`annualTaxFoncier` reste l'impôt sur le revenu foncier — IR+PS/IS — et n'est PAS renommé ni réinterprété : c'est un champ distinct, déjà existant, qui ne représente pas la taxe foncière elle-même malgré son nom.)
- [x] N5: Les pages `src/app/immobilier/page.tsx` (ligne « Taxe foncière », actuellement `p.taxeFonciere * p.partDetenue`) et `src/app/fiscalite/page.tsx` (`taxeFonciere: property.taxeFonciere * property.partDetenue`) affichent `snapshot.currentPropertyTax` au lieu de lire `property.taxeFonciere` en direct — sinon le Success signal de l'Intent (le bon montant de l'année en cours visible quelque part) n'est observable nulle part dans l'UI. (Live reachable proof also on `/investissements` Immobilier tab + `/fiscalite` — see PROGRESS deviation 1.)

### Edge

- [x] E1: Si un bien n'a aucune entrée dans la nouvelle feuille (classeur existant non migré), alors `operatingForYear`/`projectProperty` utilisent `property.taxeFonciere` (champ plat existant) pour toutes les années — comportement inchangé, aucune perte de données, aucune migration forcée.
- [x] E2: Si des entrées existent mais qu'une année intermédiaire n'a pas de saisie explicite (ex. 2023 et 2025 saisis, pas 2024), alors l'année 2024 utilise la dernière entrée connue à une année ≤ 2024 (donc 2023 = 850 €), jamais 0 et jamais le champ plat.
- [x] E3: Si un bien a des entrées, mais qu'aucune n'est à une année ≤ l'année demandée (ex. seule 2026 est saisie et l'année demandée est 2025), alors on retombe sur `property.taxeFonciere` (champ plat) pour cette année précise — même règle de repli que « aucune entrée du tout », appliquée année par année plutôt que bien par bien.
- [x] E4: À la suppression d'un bien (`deleteProperty`), ses lignes dans la feuille `Taxe foncière` sont supprimées avec lui (pas de ligne orpheline référençant un `Bien` inexistant).
- [x] E5: Une saisie pour une année future (ex. montant déjà connu par avis d'imposition anticipé) est acceptée — contrairement à `ManualPrice`/`isFutureDate`, une année future n'est pas rejetée (D9) ; si elle existe, elle prime sur le carry-forward pour cette année-là.
- [x] E6: Deux lignes saisies pour le même (bien, année) : la plus récemment enregistrée gagne (normalisation à la lecture, « dernière ligne valable gagne », comme `normalizeManualPrices`) ; l'écriture directe (upsert) d'un doublon exact est plutôt un remplacement de la ligne existante que refusé (voir D8) — un classeur édité à la main avec un doublon ne doit jamais faire échouer tout le parsing.

### Out of scope

- [x] Ne touche pas `resaleTax()` / l'assiette de plus-value immobilière taxable (`PV_IMMO_IR_RATE`, abattements) — la taxe foncière n'est pas déductible du prix d'acquisition en droit fiscal français ; on ne simule pas ce raccourci.
- [x] Pas de taux d'augmentation automatique / lié à l'inflation ou à `revaloAnnuelle` pour les années futures sans saisie — carry-forward de la dernière valeur connue uniquement.
- [x] Pas d'import en masse / CSV de l'historique de taxe foncière.
- [x] Pas de suppression ni de migration du champ plat `Property.taxeFonciere` existant ni de la colonne `Taxe foncière` sur `Immobilier`.
- [x] Pas de nouvelle UI mobile (le module immobilier mobile reste en lecture seule). Note : `mobile/app/projection.tsx` recalcule aujourd'hui son propre cash-flow locatif en lisant `property.taxeFonciere` en direct, sans passer par `@patrimo/core` — cet écran ne bénéficiera donc PAS automatiquement de la résolution par année ; c'est une dette pré-existante, explicitement hors scope de cette branche (pas de garantie de parité mobile ici, cf. `platforms.md` : « Mobile — read-only »).

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | Stockage de l'historique | LOCKED | Nouvelle feuille classeur `Taxe foncière` (`SHEET_TAXE_FONCIERE`), colonnes `["Bien", "Année", "Montant"]`, une ligne par (bien, année) — même pattern que `Prix manuels`/`ManualPrice`. | Colonne texte/JSON unique sur `Immobilier` (rejeté : casse l'édition Excel directe, invente un format) ; une colonne par année sur `Immobilier` (rejeté : croissance de schéma non bornée). |
| D2 | Règle de projection pour années sans saisie | LOCKED | Carry-forward : réutilise la dernière valeur connue à une année ≤ année demandée ; pas de taux d'augmentation automatique. | Nouveau champ `tauxAugmentationTaxeFonciere` composé chaque année (rejeté par l'utilisateur) ; réutiliser `revaloAnnuelle` du bien (rejeté par l'utilisateur). |
| D3 | Sens de « plus-value » dans la demande | LOCKED | Le résultat global du simulateur à la revente (`totalReturn`/`netIfSold` dans `projectProperty`, via les charges d'exploitation → cash-flow), pas l'assiette fiscale légale de plus-value immobilière (`resaleTax`). | Injecter la taxe foncière cumulée dans `resaleTax()` (rejeté : non conforme au droit fiscal réel — la taxe foncière n'est pas déductible du prix d'acquisition pour la plus-value immobilière des particuliers ; présenterait une estimation indicative comme légalement exacte). |
| D4 | Compatibilité arrière | LOCKED | `Property.taxeFonciere` (champ + colonne `Immobilier` existants) reste inchangé dans le schéma et sert de valeur de repli quand un bien n'a aucune ligne dans la nouvelle feuille — zéro régression, zéro migration forcée. Dès qu'une ligne existe pour ce bien, la nouvelle feuille prend le dessus année par année. | Supprimer le champ plat et forcer une migration (rejeté : risque de perte silencieuse de valeur sur les classeurs existants) ; auto-créer une ligne à partir du champ plat à la première lecture (rejeté : mutation silencieuse du classeur en lecture). |
| D5 | UI de saisie (web) | LOCKED | Le formulaire du bien remplace le champ unique « Taxe foncière » par un tableau éditable « Taxe foncière par année » (ajouter / éditer / supprimer une ligne année+montant). Mobile : pas de changement d'écran (lecture seule, bénéficie du calcul core). | Garder un seul champ mais conserver un historique caché en arrière-plan (rejeté par l'utilisateur — moins explicite). |
| D6 | Mapping index de projection `k` → année civile | LOCKED | `calendarYear(k) = now.getUTCFullYear() + k - 1` (k=1 = année civile courante, cohérent avec `propertySnapshot` qui utilise `horizonYears: 1` pour ses métriques « actuelles » ; `now` déjà utilisé en UTC ailleurs dans `realestate/property.ts`, ex. `monthsSince`). Cette formule est une simplification indicative au même niveau que le reste du modèle (la boucle n'est pas calée sur l'année calendaire réelle du crédit, cf. `monthsElapsedLoan`), pas une garantie de facturation au jour près. | `now.getUTCFullYear() + k` (k=1 = année suivante) — rejeté : ferait pointer les métriques « actuelles » de `propertySnapshot` sur l'année suivante plutôt que l'année en cours. |
| D7 | Identité de la colonne `Bien` | LOCKED | `Bien` = `Property.id` (identifiant stable, immuable), jamais `Property.label` — même convention que `ManualPrice.assetId` vs `IMMOBILIER_HEADERS` qui sépare `ID` et `Libellé`. | Utiliser le libellé du bien (rejeté : casse au renommage du bien). |
| D8 | Mécanisme d'unicité (bien, année) | LOCKED | Pas de refine Zod bloquant sur tout le tableau au parse (un doublon dans un classeur édité à la main ne doit jamais faire échouer le parsing complet). À la lecture : normalisation « dernière ligne valable gagne » par clé `(bien, année)`, miroir de `normalizeManualPrices`. À l'écriture (upsert depuis l'UI) : remplacement de la ligne existante pour `(bien, année)`, miroir de `upsertManualPrice`/`assertPersistableManualPrice` — pas de rejet, un upsert sur une paire existante remplace le montant. | `.superRefine()` Zod rejetant tout classeur avec un doublon au parse (rejeté : régression de résilience par rapport au pattern `ManualPrice` existant, un classeur légèrement corrompu deviendrait totalement illisible). |
| D9 | Années futures saisies | LOCKED | Autorisées, contrairement à `ManualPrice` (`isFutureDate` ne s'applique pas ici) — un montant de taxe foncière futur peut être légitimement connu à l'avance (vote municipal, avis anticipé), contrairement à un prix de marché. Une entrée exacte pour l'année demandée prime toujours sur le carry-forward, y compris pour une année future. | Rejeter les années futures comme `ManualPrice` (rejeté : empêcherait un cas d'usage réel et n'apporte aucune garantie ici, la donnée n'étant pas un prix de marché). |
| D10 | Affichage du montant résolu dans l'UI existante | LOCKED | `PropertySnapshot` gagne un champ `currentPropertyTax` (taxe foncière résolue pour l'année civile courante, D6). `src/app/immobilier/page.tsx` et `src/app/fiscalite/page.tsx`, qui lisent aujourd'hui `property.taxeFonciere` en direct pour la ligne « Taxe foncière », sont rebranchés sur `snapshot.currentPropertyTax`. `annualTaxFoncier` (l'impôt sur le revenu foncier, calcul distinct) n'est pas renommé ni touché. | Ne pas toucher l'UI existante (rejeté : le Success signal de l'Intent — voir la valeur résolue de l'année en cours quelque part dans l'app — ne serait observable nulle part, les deux seuls affichages de « Taxe foncière » lisant le champ plat brut en direct, en contournant tout calcul core). |

## Teach-back

- [x] Scenario 1 : Bien "Appartement Lyon", taxe foncière saisie 2023=850€, 2024=900€, 2025=950€, `now` = un jour de 2025, horizon de projection = 5 ans. Résultat attendu (D6 : k=1 = année civile courante) : `years[0]` (k=1, année civile 2025) déduit 950€, et `years[1]` à `years[4]` (années civiles 2026 à 2029) déduisent chacune 950€ (pas d'augmentation automatique).
- [x] Scenario 2 : Bien "Studio Marseille" créé avant cette fonctionnalité, avec `taxeFonciere = 700€` et aucune ligne dans la nouvelle feuille. Résultat attendu : la projection déduit 700€ chaque année, exactement comme avant — aucune régression.
- [x] Scenario 3 : Bien "Maison Nantes", entrées 2022=600€ et 2024=680€ (2023 non saisi), `now` en 2023 (k=1 = année civile 2023). Résultat attendu : l'année 2023 déduit 600€ (dernière valeur connue ≤ 2023), pas 680€, pas 0€, pas la valeur du champ plat.
- [x] Scenario 4 : L'utilisateur saisit 950€ pour "Appartement Lyon" en 2025, puis ressaisit 960€ pour la même année 2025. Résultat attendu : la seconde saisie remplace la première (960€ reste, une seule ligne par bien/année) — pas de refus, pas de doublon silencieux, pas d'échec de lecture du classeur.
- [x] Scenario 5 : Aucun changement sur le calcul de plus-value fiscale à la revente (`resaleTax`) : deux biens identiques, l'un avec historique de taxe foncière saisi et l'autre sans, ont le même `capitalGainTax`/`grossPlusValue` — seul `totalReturn`/`netIfSold` (résultat global) diffère si les montants de taxe foncière diffèrent entre eux.
- [x] Scenario 6 : Bien "Appartement Lyon" (mêmes entrées que scénario 1), `now` = un jour de 2025. Résultat attendu : `propertySnapshot(property, now).currentPropertyTax` vaut 950€ (l'année civile courante, 2025) et la page `/immobilier` affiche « Taxe foncière : 950 € » (et non plus la valeur brute de l'ancien champ plat si celui-ci diffère) — `annualTaxFoncier` (impôt sur le revenu foncier) reste un champ séparé, non affecté par ce scénario. Live proof on `/fiscalite` (and Immobilier tab under `/investissements`) per PROGRESS deviation 1.

## Scope

- [x] One behavior for this branch: historiser la taxe foncière par année et l'utiliser (valeur de l'année, sinon dernière connue) dans le calcul du résultat immobilier annuel et du gain net à la revente.
- [x] Files / packages expected to change:
  - `packages/core/src/schema.ts` (nouveau type `PropertyTax` + `Workbook.propertyTaxes`)
  - `packages/core/src/workbook-template.ts` (nouvelle feuille `SHEET_TAXE_FONCIERE` + headers `["Bien", "Année", "Montant"]`)
  - `packages/core/src/property-taxes.ts` (nouveau module, miroir de `manual-prices.ts` : `normalizePropertyTaxes` (dernière ligne valable gagne), `upsertPropertyTax`/`assertPersistablePropertyTax` (remplace la ligne existante, pas de rejet doublon), `removePropertyTaxesForProperties` (cascade), `resolvePropertyTaxForYear(propertyTaxes, propertyId, year, fallback)` (entrée exacte > dernière entrée ≤ année > `fallback` = `property.taxeFonciere`))
  - `packages/core/src/realestate/property.ts` (`operatingForYear` accepte l'année civile résolue au lieu de lire `property.taxeFonciere` directement)
  - `packages/core/src/realestate/projection.ts` (calcule `calendarYear(k) = now.getUTCFullYear() + k - 1` dans la boucle et l'utilise pour résoudre la taxe foncière de chaque année ; `propertySnapshot` en hérite via son horizon de 1 an ; `PropertySnapshot` gagne le champ `currentPropertyTax` — D10)
  - Sérialiseurs web + mobile (lecture/écriture de la nouvelle feuille) — fichiers à identifier dans `src/` et `mobile/` au moment de l'implémentation
  - `src/lib/excel.ts` — `deleteProperty(id)` : ajoute la suppression en cascade des lignes `Taxe foncière` du bien (`deleteRow(SHEET_TAXE_FONCIERE, "Bien", id)`, même pattern imprératif que l'appel existant sur `SHEET_IMMOBILIER` ; pas de déplacement de la suppression de bien vers `packages/core/src/deletion.ts`, qui ne gère pas `Property` aujourd'hui — hors scope de cette branche, cf. Exclusions)
  - `src/` — formulaire du bien immobilier (remplace le champ unique par le tableau éditable)
  - `src/app/immobilier/page.tsx` (ligne ~139, « Taxe foncière ») et `src/app/fiscalite/page.tsx` (ligne ~66, `taxeFonciere:`) — lisent `snapshot.currentPropertyTax` au lieu de `property.taxeFonciere` en direct (D10)
  - `docs/adr/` — nouvelle ADR courte documentant la feuille + la règle de carry-forward + le mapping D6 (pattern proche de l'ADR manual-prices)
  - `packages/core/ARCHITECTURE.md` / `docs/reference/glossary.md` — entrée pour le nouveau concept

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core/src/realestate`, `npm test -- packages/core/src/property-taxes`, `npm test -- packages/core/src/schema` (ou chemins équivalents) — couvre les cas Nominal/Edge ci-dessus (résolution par année via `resolvePropertyTaxForYear`, mapping `calendarYear(k)`, carry-forward, repli année-par-année sur le champ plat, dernière-ligne-gagne sur doublon, années futures acceptées, cascade de suppression, round-trip classeur)
- Layer 3: `make e2e` (formulaire bien immobilier web + I/O classeur changent)
- Feature-specific: vérifier que `resaleTax()`/`capitalGainTax` ne varie pas selon l'historique de taxe foncière (scénario 5 du teach-back) ; vérifier que `deleteProperty` supprime bien les lignes `Taxe foncière` associées (scénario cascade) ; vérifier que `snapshot.currentPropertyTax` est bien câblé sur `/immobilier` et `/fiscalite` (scénario 6, D10) — un test e2e Layer 3 doit couvrir l'affichage, pas seulement le calcul core

When Layer 2 applies, makers follow [tdd-red-green.md](../../howto/tdd-red-green.md) (CONSTRAINTS §24).
Tier B cadrage: [cadrage-lock.md](../../howto/cadrage-lock.md) (CONSTRAINTS §25) before Maker.

## Tranches

One tranche = one small, separately-reviewable unit (CONSTRAINTS §26; [feature-flow.md](../../howto/feature-flow.md)). Every `N#`/`E#` case must appear in at least one row's "Behavior cases covered" cell as bare IDs only.

| # | Tranche | Behavior cases covered | Layers | PR / commit |
|---|---|---|---|---|
| 1 | Core PropertyTax + per-year resolve + projection/snapshot | N1 N2 N4 E1 E2 E3 E5 E6 | 1+2 | fdf511e |
| 2 | Workbook I/O (web+mobile) + delete cascade | N3 E4 | 1+2 | fdf511e |
| 3 | API + web UI + display rewire + e2e | N5 | 1+2+3 | fdf511e |

(Shipped as one feature commit after rebase onto harness feature-flow; tranche rows document case coverage for gates, not separate stacked PRs.)

## Exclusions

- Not in this branch: taux d'augmentation automatique, modification de `resaleTax`, import CSV, UI mobile dédiée, suppression du champ plat existant, refonte de `deleteProperty` vers `packages/core/src/deletion.ts` (reste dans `src/lib/excel.ts`, cascade ajoutée localement).
- Do not refactor unrelated modules

## Checker

- [x] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md) — Pass, 2026-09-04, see PROGRESS.md § Checker
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when Layer 2 applied; Tier B teach-back / cadrage lock recorded when Layer 2 applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass if `Challenger: required`, then `make branch-ready` must pass before coding.
