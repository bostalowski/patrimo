# Financial Graphs

Application locale de suivi de patrimoine, type Finary, qui lit un fichier Excel
comme source de vérité et récupère les cours en ligne (BTC via CoinGecko, ETF /
actions via Yahoo Finance). Les FCPE et autres actifs sans API se renseignent à
la main.

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

- `Financial Graphs-<version>-arm64.dmg` — Apple Silicon (M1+)
- `Financial Graphs-<version>.dmg` — Intel x64
- Les ZIP correspondants

Pour juste un `.app` non packagé (plus rapide pour tester) :

```bash
npm run electron:pack
# → release/mac-arm64/Financial Graphs.app
```

> Au premier lancement de l'app, macOS affichera un avertissement parce que
> le binaire n'est pas signé. Fais clic droit → **Ouvrir** pour passer outre,
> ou retire la quarantaine avec `xattr -dr com.apple.quarantine "/Applications/Financial Graphs.app"`.

#### Configuration dans l'app packagée

L'app utilise un `.env.local` stocké dans
`~/Library/Application Support/financial-graphs/.env.local` (copié depuis
`.env.local.example` au premier lancement). Le menu **Configuration → Ouvrir
le fichier .env.local** ouvre directement ce fichier dans ton éditeur.

Le cache des prix synchronisés est dans
`~/Library/Application Support/financial-graphs/data/` (`prices.json` pour
CoinGecko/Yahoo, `manual-prices.json` pour les FCPE). Le menu
**Configuration → Ouvrir le dossier de données** y mène directement.

Si tu utilisais déjà l'app en mode `npm run dev`, copie tes prix une fois
pour que l'app packagée les retrouve :

```bash
mkdir -p "$HOME/Library/Application Support/financial-graphs/data"
cp data/prices.json data/manual-prices.json \
  "$HOME/Library/Application Support/financial-graphs/data/"
```

Sinon, clique simplement sur **Sync cours** dans le Dashboard pour
repopuler `prices.json` depuis CoinGecko et Yahoo.

Les logs sont dans `~/Library/Logs/financial-graphs/`
(`main.log` pour le process Electron, `next-server.log` pour le serveur Next).

## Variables d'environnement (`.env.local`)

```
EXCEL_PATH=./data/Investissement.xlsx
COINGECKO_API_KEY=
```

`COINGECKO_API_KEY` est optionnel — l'API publique sans clef suffit largement
pour un usage personnel (100 req/min).

`EXCEL_PATH` supporte l'expansion du `~` (home dir) et les chemins absolus,
voir la section suivante pour héberger le fichier sur Google Drive.

## Où stocker le fichier Excel

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
4. Récupérer le chemin exact : clic droit sur le fichier → maintenir ⌥ →
   **Copy as Pathname**.
5. Coller dans `.env.local` :

   ```
   EXCEL_PATH=~/Library/CloudStorage/GoogleDrive-<ton-email>/My Drive/Finances/Investissement.xlsx
   ```

6. Relancer `npm run dev`. C'est tout.

Tu peux éditer le fichier depuis n'importe où (web, mobile, autre Mac) — au
prochain reload, l'app voit la nouvelle version (le cache est invalidé via
`mtimeMs`).

### Option locale (fallback)

Pose le fichier dans `./data/Investissement.xlsx` et laisse la valeur par
défaut de `EXCEL_PATH`. Le fichier est gitignored (`.gitignore`).

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
