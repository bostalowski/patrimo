# Financial Graphs

Application locale de suivi de patrimoine, type Finary, qui lit un fichier Excel
comme source de vérité et récupère les cours en ligne (BTC via CoinGecko, ETF /
actions via Yahoo Finance). Les FCPE et autres actifs sans API se renseignent à
la main.

## Démarrage

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Variables d'environnement (`.env.local`)

```
EXCEL_PATH=./data/Investissement.xlsx
COINGECKO_API_KEY=
```

`COINGECKO_API_KEY` est optionnel — l'API publique sans clef suffit largement
pour un usage personnel (100 req/min).

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
- **Allocation cible** : `Catégorie · Pourcentage cible · Actifs (séparés par
  virgule)`.

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

```bash
# Vérifier les agrégats du portefeuille sans démarrer l'app
EXCEL_PATH=./data/Investissement.xlsx npx tsx scripts/check_portfolio.mjs

# Migrer un Excel ancien schéma
python3 scripts/migrate_excel.py --src ... --dst data/Investissement.xlsx
```
