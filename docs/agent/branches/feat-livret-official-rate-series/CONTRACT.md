# Contract: Official livret rate series (Livret A / LDDS)

- Branch: `feat/livret-official-rate-series`
- Slug: `feat-livret-official-rate-series`
- Matrix row (FEATURES.md): n/a — domain accuracy for LIVRET + price-sync adjacent cache
- Cadrage tier: **B** (behavior)
- Challenger: required — structuring `@patrimo/core` livret interest math + network allowlist (CONSTRAINTS §4) + ADR
- Relates: `packages/core/src/livret.ts` ; `Account.rate` / `Comptes.Taux` ; web/mobile price sync (`src/lib/prices/sync.ts`, `mobile/lib/price-sync.ts`) ; ADR 0005 / 0018 (A vs LDDS split reste hors scope)

## Intent

- Symptom (who / when / pain): Sur un compte `LIVRET`, le taux `Comptes.Taux` est un **scalaire unique**. L’estimation des intérêts courus (avant `INTERET` banque) ne suit pas le **taux réglementé en vigueur par quinzaine**, qui change dans le temps (Livret A = LDDS).
- Suspected cause (`fact`): math quinzaine à un seul `rate` ; pas de série officielle datée alimentée comme les cours.
- Lever (where we act on the cause): (1) math core à taux variable par quinzaine ; (2) **récupérer / merger la série officielle au même moment que la sync des titres** ; (3) cache local (comme les prix) + graine offline ; ADR étendant CONSTRAINTS §4.
- Success signal (observable): estimation fidèle banque sur deux paliers ; après une sync prix réussie, le cache taux contient les paliers officiels à jour ; offline / échec taux → dernier cache ou graine, **sans faire échouer** la sync des titres.
- Band-aid risk: série figée au release seulement → périmée entre deux ship ; ou fetch dans le core → casse la pureté / local-first mal cadré.

## Behavior cases

### Nominal

- [ ] If la série (cache ou graine) a un changement de taux à `T`, then chaque quinzaine d’estimation utilise le taux **en vigueur au début de cette quinzaine**.
- [ ] If estimation / projection `LIVRET`, then la math utilise la série officielle ; `account.rate` **n’entre pas** dans la math (D3).
- [ ] If projection, then taux futur = **dernier palier** connu (pas d’anticipation).
- [ ] If helper « taux aujourd’hui », then dernier palier (A ≡ LDDS).
- [ ] If dépôt / retrait, then dates de valeur quinzaine **inchangées** (pas de prorata journalier).
- [ ] If l’utilisateur lance (ou l’intervalle déclenche) la **sync des prix**, then la plateforme tente aussi un fetch/merge de la série de taux réglementés Livret A/LDDS dans le **cache taux** (même pipeline / même geste UX).

### Edge

- [ ] If aucune transaction sur le livret, then pas d’intérêt estimé.
- [ ] If quinzaine avant le premier palier disponible (cache∪graine), then **premier palier** (D5).
- [ ] If `INTERET` jusqu’à `D`, then estimation seulement **après** `D`.
- [ ] If `account.rate` quelconque, then estimation reste sur la série.
- [ ] If le **fetch taux échoue** (réseau, parse, source down) pendant une sync prix, then la sync **prix aboutit quand même** ; le cache taux conserve la dernière bonne série (ou la graine si jamais syncé) ; erreur taux reportée de façon non bloquante (log / meta), pas de wipe du cache.
- [ ] If **premier lancement** sans cache taux, then la math utilise la **graine embarquée** dans core jusqu’à une sync réussie.
- [ ] If plafond compte renseigné, then inchangé (pas de série de plafonds).

### Out of scope

- [ ] Explicitly not in this branch: split schéma A/LDDS ; feuille Excel des taux ; auto-`INTERET` ; LEP/CEL/PEL ; taux custom hors barème ; plafonds historiques ; EF bands ; faire du cache taux une source de vérité workbook.

## Product decisions

Guiding principles (human 2026-08-30): (1) fidélité calcul bancaire ; (2) **préférer la sync** des taux avec la sync titres (reopen D1).

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | Source des taux | **LOCKED** | Fetch / merge de la série officielle **pendant la sync des prix** (web `POST /api/prices/sync` + mobile `syncPrices`). Cache local dérivé (pas Excel). Core reste **pur** : reçoit la série (cache∪graine) en entrée. | Série uniquement embarquée au release — **rejeté** (human : préfère la sync). Feuille Excel — rejetée. Fetch à chaque ouverture de page hors sync — rejeté (bruit / §4). |
| D1b | Cache & offline | **LOCKED** | Persister la série comme **cache** (web : fichier sous `data/` analogue à `prices.json` ; mobile : AsyncStorage), **non** recoverable history workbook (même esprit CONSTRAINTS §2 pour les prix). **Graine embarquée** minimale dans `@patrimo/core` pour cold start / offline. Merge : union par `effectiveFrom`, dernier fetch gagne sur conflit de palier. | Cache only sans graine — casse offline. Écrire dans le `.xlsx` — rejeté (SoT portfolio ≠ barème national). |
| D1c | CONSTRAINTS §4 | **LOCKED** | Nouvel ADR : autoriser le réseau pour **taux réglementés Livret A/LDDS** (même famille que « price sources »), documenter source retenue + fallback. Maker choisit l’endpoint officiel concret dans l’ADR (BdF / data.gouv / équivalent stable) tant que paliers `{ effectiveFrom, annualRate }` sont corrects. | Fetch sans ADR — interdit (§4). |
| D2 | Périmètre math V1 | **LOCKED** | Estimation quinzaine × taux_en_vigueur / 24 ; helper courant ; projection = dernier palier. | Prorata journalier — rejeté. |
| D3 | `Comptes.Taux` | **LOCKED** | Math = série seulement ; `rate` = miroir UI / préremplissage. | Échappatoire `rate ≠ courant` — rejeté (Challenger antérieur). |
| D4 | A vs LDDS | **LOCKED** | Même série. | Séries séparées — inutile. |
| D5 | Avant premier palier | **LOCKED** | Premier palier de la série effective (graine∪cache). Graine assez longue pour un historique typique ; sync enrichit. | Intérêt 0 — sous-estime. |
| D6 | UI V1 | **LOCKED** | Formulaire `LIVRET` web : afficher taux courant (depuis série chargée) + préremplir `rate` à la création si vide. Pas de bouton sync taux séparé — **même sync que les titres**. Mobile gap OK si formulaire non touché. | Sync taux hors pipeline prix — rejeté (human). |
| D7 | Documentation | **LOCKED** | ADR (math + sync + cache + §4) ; glossary ; note price-sync / livret. | |
| D8 | Autres livrets | **LOCKED** | Hors V1 ; tout `LIVRET` au barème A/LDDS. | |
| D9 | Isolation sync | **LOCKED** | Échec fetch taux **ne fait pas échouer** la sync prix ; pas d’effacement du cache taux sur erreur. | Fail-all — rejeté (régression sync titres). |

## Teach-back

Human acceptance in PROGRESS. Scenarios 1–5 inchangés (math) ; 6–7 pour la sync (validés par « je préfère la sync » + isolation).

- [x] **Scenario 1 — Deux paliers :** 3 % puis 2,4 % ; dépôt 10k le 01/01 ; pas d’`INTERET` → cumul quinzaines aux deux taux.
- [x] **Scenario 2 — `rate` ignoré :** `account.rate = 0.02` → estimation suit la série.
- [x] **Scenario 3 — Post-`INTERET` :** crédit 31/12 → estimation seulement après.
- [x] **Scenario 4 — Dates de valeur :** dépôt le 10 → dès le 16 ; retrait le 20 → coupe au 16.
- [x] **Scenario 5 — Taux courant :** dernier palier ; A ≡ LDDS.
- [x] **Scenario 6 — Sync couplée :** une sync prix déclenche aussi le merge du cache taux (web + mobile paths).
- [x] **Scenario 7 — Isolation :** fetch taux en erreur → prix sync OK ; dernier cache/graine conservé pour l’estimation.

## Scope

- [ ] One behavior: série officielle A/LDDS via **sync prix + cache + graine** ; math quinzaine banque ; ADR §4 ; UI miroir D6.
- [ ] Files (indicative):
  - `packages/core` — `livret-rates.ts` (types, graine, resolve rate@date), `livret.ts`, portfolio wiring, tests
  - `src/lib/prices/sync.ts` (+ route) — fetch/merge taux non bloquant
  - `mobile/lib/price-sync.ts` — idem
  - cache I/O web/mobile ; `account-form` hint
  - `docs/adr/00xx-…`, glossary, `src/price-sync.md`

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core` (livret + rates) ; tests sync taux (mock réseau) web/mobile — RED → GREEN
- Layer 3: `make e2e` si UI comptes / sync touchés de façon couverte ; sinon tests ciblés + verify
- Feature-specific:
  - Deux paliers → cumul ≠ taux constant
  - `account.rate` ignoré
  - Post-`INTERET` ; dates de valeur
  - Sync prix mock : merge cache taux ; sync prix OK si taux fail
  - Core tests **sans** réseau (série injectée / graine)

## Exclusions

- Not in this branch: feuille workbook des taux ; split A/LDDS ; LEP/CEL/PEL ; plafonds historiques ; auto-`INTERET` ; EF bands ; bouton sync taux séparé
- Do not refactor unrelated price providers beyond hooking the taux fetch

## Checker

- [ ] Fresh session — [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; RED evidence ; teach-back / cadrage lock

## On merge

- [ ] Accept ADR (incl. §4) ; optional FEATURES note ; archive branch folder / PR on root PROGRESS

## Cadrage gate

Tier B: **D1–D9 LOCKED** (2026-08-30 ; D1 reopen → sync). Teach-back accepted + Challenger Pass → `make branch-ready` avant Maker.
