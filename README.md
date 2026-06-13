# Patrimo

Application locale de suivi de patrimoine, type Finary, qui lit un fichier Excel
comme source de vérité et récupère les cours en ligne (BTC via CoinGecko, ETF /
actions via Yahoo Finance). Les FCPE et autres actifs sans API se renseignent à
la main.

## Installer Patrimo (pour mes proches)

1. Aller sur la page des releases :
   [github.com/bostalowski/patrimo/releases/latest](https://github.com/bostalowski/patrimo/releases/latest).
2. Télécharger le `.dmg` correspondant à ton Mac :
   - **`Patrimo-<version>-arm64.dmg`** pour les Mac Apple Silicon (M1/M2/M3/M4),
   - **`Patrimo-<version>.dmg`** pour les Mac Intel.
3. Ouvrir le `.dmg` et glisser **Patrimo** dans **Applications**.
4. L'app n'est pas signée par un compte Apple Developer : au premier lancement,
   macOS affiche « développeur non identifié ». Fais **clic droit sur Patrimo →
   Ouvrir**, puis confirme. À défaut, retire la quarantaine :

```bash
xattr -dr com.apple.quarantine "/Applications/Patrimo.app"
```

### Mises à jour

Patrimo vérifie automatiquement au démarrage s'il existe une version plus
récente sur GitHub. Si oui, une fenêtre propose de **Télécharger** : il suffit
de réinstaller le nouveau `.dmg` par-dessus. On peut aussi déclencher la
vérification à la main via le menu **Configuration → Vérifier les mises à jour…**.

## Démarrage

### Mode développement (navigateur)

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

### Mode développement (fenêtre Electron)

```bash
npm run electron:dev
```

Lance `next dev` et une fenêtre Electron qui pointe sur `localhost:3000`.
Pratique pour itérer sur l'UI dans une fenêtre dédiée avec hot reload.

### Application Mac (`.app` / `.dmg`)

```bash
npm run electron:build
```

Produit dans `release/` :

- `Patrimo-<version>-arm64.dmg` — Apple Silicon (M1+)
- `Patrimo-<version>.dmg` — Intel x64
- Les ZIP correspondants

Pour juste un `.app` non packagé (plus rapide pour tester) :

```bash
npm run electron:pack
# → release/mac-arm64/Patrimo.app
```

> Au premier lancement de l'app, macOS affichera un avertissement parce que
> le binaire n'est pas signé. Fais clic droit → **Ouvrir** pour passer outre,
> ou retire la quarantaine avec `xattr -dr com.apple.quarantine "/Applications/Patrimo.app"`.

### Publier une nouvelle version

La distribution passe par les **Releases GitHub** (gratuit, aucun serveur à
gérer). Un workflow GitHub Actions ([.github/workflows/release.yml](.github/workflows/release.yml))
build l'app sur macOS et publie les `.dmg`/`.zip` dès qu'un tag `v*` est poussé.

```bash
npm version patch   # ou minor / major : bump package.json + crée le tag git
git push --follow-tags
```

GitHub Actions construit alors les `.dmg` (arm64 + Intel) et crée la release.
Les apps déjà installées la détecteront au prochain démarrage. Les runners
macOS sont gratuits car le repo est public.

#### Configuration dans l'app packagée

Au premier lancement, l'app t'amène sur la page **Réglages** qui permet de :

- **Choisir un fichier `.xlsx` existant** via le sélecteur de fichier natif macOS, ou
- **Créer un nouveau classeur vierge** avec les 4 onglets requis (Transactions, Actifs, Comptes, Budget) à l'emplacement de ton choix.

Le chemin retenu est persisté dans
`~/Library/Application Support/patrimo/data/config.json` — pas besoin
de toucher au `.env.local`. Tu peux changer de fichier source à n'importe quel
moment depuis la même page.

Le cache des prix synchronisés est dans
`~/Library/Application Support/patrimo/data/` (`prices.json` pour
CoinGecko/Yahoo, `manual-prices.json` pour les FCPE). Le menu
**Configuration → Ouvrir le dossier de données** y mène directement.

Pour les options avancées (`COINGECKO_API_KEY`, ou forcer un `EXCEL_PATH` via
env), un `.env.local` reste disponible dans
`~/Library/Application Support/patrimo/.env.local` (copié depuis
`.env.local.example` au premier lancement). Le menu **Configuration → Ouvrir
le fichier .env.local** ouvre directement ce fichier dans ton éditeur.

Si tu utilisais déjà l'app en mode `npm run dev`, copie tes prix une fois
pour que l'app packagée les retrouve :

```bash
mkdir -p "$HOME/Library/Application Support/patrimo/data"
cp data/prices.json data/manual-prices.json \
  "$HOME/Library/Application Support/patrimo/data/"
```

Sinon, clique simplement sur **Sync cours** dans le Dashboard pour
repopuler `prices.json` depuis CoinGecko et Yahoo.

Les logs sont dans `~/Library/Logs/patrimo/`
(`main.log` pour le process Electron, `next-server.log` pour le serveur Next).

## Variables d'environnement (`.env.local`)

Toutes optionnelles depuis l'introduction de la page Réglages.

```
# EXCEL_PATH=./data/Investissement.xlsx
COINGECKO_API_KEY=
```

`COINGECKO_API_KEY` est optionnel — l'API publique sans clef suffit largement
pour un usage personnel (100 req/min).

`EXCEL_PATH` est devenu un **fallback** : la valeur choisie dans **Réglages**
(persistée dans `data/config.json`) prend la priorité. La variable supporte
l'expansion du `~` (home dir) et les chemins absolus si tu préfères piloter
le chemin via l'environnement (ex. scripts CLI).

## Où stocker le fichier Excel

Tu peux choisir / créer le fichier directement depuis la page **Réglages** de
l'app. Les options ci-dessous expliquent où le poser pour qu'il soit
synchronisé entre plusieurs machines.

### Option recommandée — Google Drive Desktop (privé, synchronisé)

Le fichier reste sur ton Google Drive et n'est jamais commité. Google Drive
Desktop le monte localement, l'app le lit comme n'importe quel fichier.

1. Installer [Google Drive Desktop](https://www.google.com/drive/download/) et
   se connecter.
2. Uploader `Investissement.xlsx` sur `drive.google.com` dans le dossier de ton
   choix (ex. `Finances/`).
3. Dans le Finder, naviguer dans
   `~/Library/CloudStorage/GoogleDrive-<ton-email>/My Drive/Finances/`,
   clic droit sur le fichier → **Available offline** (force la copie locale,
   évite la latence et les erreurs de lecture).
4. Dans l'app : **Réglages → Choisir un fichier existant** et sélectionner le
   fichier dans ce dossier. (Alternative : éditer `.env.local` et y mettre
   `EXCEL_PATH=~/Library/CloudStorage/.../Investissement.xlsx`.)

Tu peux éditer le fichier depuis n'importe où (web, mobile, autre Mac) — au
prochain reload, l'app voit la nouvelle version (le cache est invalidé via
`mtimeMs`).

### Option locale (fallback)

Crée le fichier directement depuis **Réglages → Créer un nouveau fichier**
dans le dossier de ton choix (ex. `./data/Investissement.xlsx`). Le dossier
`data/` est gitignored.

## Structure des données

### Fichier Excel — `data/Investissement.xlsx`

Quatre onglets :

- **Transactions** : `Date · Type · Compte · Compte destination · Actif ·
  Quantité · Prix unitaire · Devise · Frais · Frais devise · Notes`. Types
  acceptés : `ACHAT`, `VENTE`, `DIVIDENDE`, `INTERET`, `TRANSFERT`, `DEPOT`,
  `RETRAIT`.
- **Actifs** : `ID · Libellé · Type · ISIN · Ticker · Source prix · Param
  source · Devise`. Sources : `coingecko`, `yahoo`, `manual`.
- **Comptes** : `ID · Libellé · Type · Enveloppe` (CTO, PEA, PEE, AV).
- **Budget** : `ID · Libellé · Type · Montant · Fréquence · Catégorie · Notes`.
  `Type` vaut `REVENU` ou `DEPENSE`, `Fréquence` `MENSUEL`/`TRIMESTRIEL`/`ANNUEL`.
  L'onglet est créé automatiquement à la première ligne ajoutée depuis la page
  Budget, et reste éditable à la main (saisie en masse possible).

Les cibles d'allocation sont gérées dans le **DCA Planner** (config par
enveloppe persistée dans `data/dca-configs.json`).

Pour migrer un ancien fichier (schéma single-sheet « Mouvements »), utilise :

```bash
python3 scripts/migrate_excel.py \
  --src /chemin/vers/original.xlsx \
  --dst data/Investissement.xlsx
```

## Importer des transactions depuis un broker

La page **Transactions → Importer un CSV** (`/transactions/import`)
permet d'ajouter en masse des transactions depuis un fichier exporté
par un broker, sans toucher à l'Excel à la main.

Deux profils sont disponibles :

- **Trade Republic** : utilise l'export CSV officiel de l'app (Profil →
  Relevés de compte → Export des transactions → Partager → Période →
  Créer → Télécharger). Le wizard détecte automatiquement les colonnes
  (`Datum`/`Date`, `Typ`/`Type`, `ISIN`, `Anzahl`/`Shares`,
  `Kurs`/`Price`, etc.) et n'importe que les opérations exploitables
  (achat / vente / dividende / intérêt). Les paiements carte,
  remboursements, dépôts/retraits cash et autres événements purement
  bancaires sont ignorés et listés dans l'aperçu.
- **CSV générique** : si tu pars d'un autre broker, exporte un CSV
  quelconque et mappe toi-même chaque colonne (`Date`, `Type`, `Actif`,
  `Quantité`, etc.) vers les champs attendus. Les valeurs `Type` sont
  reconnues si elles correspondent aux constantes du schéma (`ACHAT`,
  `VENTE`, `DIVIDENDE`, `INTERET`, `TRANSFERT`, `DEPOT`, `RETRAIT`),
  sinon tu peux forcer un type par défaut.

L'aperçu :

- regroupe les actifs et comptes inconnus pour que tu remplisses leur
  métadonnée (type, source de prix, ISIN, enveloppe, …) **avant**
  d'écrire dans le classeur ;
- détecte les doublons (signature `date|type|compte|actif|quantité|prix`)
  contre l'historique existant **et** au sein du fichier importé ;
- liste les lignes en erreur (date invalide, type non reconnu, etc.) ou
  ignorées (paiement carte, etc.) avec la raison.

Le commit écrit les nouveaux comptes, actifs et transactions en une
seule passe (un seul read/write sur l'Excel).

> **Note sur Trade Republic** : il n'existe pas d'API officielle. La lib
> communautaire `pytr` tape l'API privée et n'est pas supportée. Les
> API d'agrégation bancaire (DSP2) demandent une licence AISP ou un
> agrégateur payant (Powens, Bridge, Tink, GoCardless, Plaid). Le canal
> fichier est donc la voie pérenne pour ce genre d'app perso.

### Cache local — `data/prices.json` et `data/manual-prices.json`

Stockage léger des cours historiques (un fichier par source). Format :

```json
{ "BTC": { "2024-11-22": 95328.74 }, "WPEA": { "2024-11-22": 24.65 } }
```

Ces fichiers sont gitignorés.

## Fonctionnement

1. **Bouton « Sync cours »** sur le Dashboard → appelle `POST /api/prices/sync`,
   qui interroge CoinGecko et Yahoo et merge l'historique dans
   `data/prices.json`.
2. **Page « Prix manuels »** → saisie des VL des FCPE (PEE Natixis,
   etc.). Stockée dans `data/manual-prices.json` via
   `POST /api/prices/manual`.
3. **Pages Dashboard / Actifs / Comptes / Transactions** → consomment l'Excel +
   les fichiers JSON, calculent positions, PRU, P&L et rendent les graphiques.

## Modélisation comptable

- **ACHAT** : coût = `quantité × prix + frais`, augmente la quantité.
- **VENTE** : revenus = `quantité × prix − frais`, réalise (`vente − PRU ×
  quantité`).
- **DIVIDENDE** :
  - `prix > 0` → dividende cash, ajoute aux revenus réalisés sans toucher au
    nombre de parts.
  - `prix = 0` → distribution en nature (typiquement récompenses Kraken Earn /
    DCA dust), ajoute des parts gratuitement.
- **INTERET** : intérêts cash, accumulés au niveau du compte.
- **TRANSFERT** (Kraken → Ledger par ex.) : déplace la quantité du compte
  source vers le compte destination ; si `Frais devise = Actif`, les frais
  réseau réduisent la quantité reçue à destination et le PRU effectif augmente
  mécaniquement.
- **RETRAIT** : réduit la quantité (et le coût de base au PRU) sans réaliser de
  P&L — utile pour les ajustements de poussière.

## Scripts utilitaires

Tous ces scripts lisent `EXCEL_PATH` depuis l'environnement (ils ne chargent
pas `.env.local` automatiquement). Passe-le inline :

```bash
# Vérifier les agrégats du portefeuille sans démarrer l'app
EXCEL_PATH="~/Library/CloudStorage/GoogleDrive-<email>/Mon Drive/Investissement.xlsx" \
  npx tsx scripts/check_portfolio.mjs

# Scripts de maintenance Python (idempotents pour la plupart)
EXCEL_PATH="~/Library/CloudStorage/GoogleDrive-<email>/Mon Drive/Investissement.xlsx" \
  python3 scripts/add_pee_transactions.py

# Migrer un Excel ancien schéma vers le nouveau (4 onglets)
python3 scripts/migrate_excel.py \
  --src /chemin/vers/original.xlsx \
  --dst "$HOME/Library/CloudStorage/GoogleDrive-<email>/Mon Drive/Investissement.xlsx"
```
