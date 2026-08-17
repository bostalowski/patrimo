# Patrimo

Suivi de patrimoine local (type Finary) : un fichier Excel comme source de
vérité, cours en ligne (CoinGecko, Yahoo Finance), saisie manuelle pour les
actifs sans API (FCPE, etc.). Surfaces : web, Electron (macOS) et mobile
(Expo).

Documentation technique : [docs/README.md](docs/README.md).

## Installer (Mac)

1. Télécharger le `.dmg` sur
   [github.com/bostalowski/patrimo/releases/latest](https://github.com/bostalowski/patrimo/releases/latest)
   (`-arm64` pour Apple Silicon, sinon Intel).
2. Glisser **Patrimo** dans **Applications**.
3. Au premier lancement (app non signée) : **clic droit → Ouvrir**, ou :

```bash
xattr -dr com.apple.quarantine "/Applications/Patrimo.app"
```

L’app propose les mises à jour au démarrage (ou via **Configuration → Vérifier
les mises à jour…**). Réinstaller le nouveau `.dmg` par-dessus.

Au premier lancement, **Réglages** permet de choisir ou créer le fichier
`.xlsx`. Le chemin est mémorisé ; les prix automatiques et la config vivent
dans `~/Library/Application Support/patrimo/`.

## Développement

```bash
npm install
npm run dev              # http://localhost:3000
npm run electron:dev     # Next + fenêtre Electron
cd mobile && npm start   # Expo
```

Détails (Node 24+, Drive OAuth mobile, build) :
[docs/howto/local-dev-setup.md](docs/howto/local-dev-setup.md).

```bash
npm run electron:build   # .dmg arm64 + Intel dans release/
npm version patch && git push --follow-tags   # release GitHub Actions (manuel)
```

Ou : label `release:patch` / `release:minor` / `release:major` sur la PR, puis merge dans `main` — voir [Cut a desktop release](docs/howto/cut-a-desktop-release.md).

## Fichier Excel

Choisir / créer le classeur dans **Réglages**. Schéma des onglets :
[docs/reference/excel-workbook.md](docs/reference/excel-workbook.md).

**Google Drive (desktop)** — monter le fichier avec
[Google Drive Desktop](https://www.google.com/drive/download/), le marquer
**Available offline**, puis le sélectionner dans **Réglages**. Éditer ailleurs
(web, mobile) ; l’app voit la nouvelle version au prochain reload.

**Mobile** — fichier local ou Google Drive (OAuth). Voir
[docs/howto/configure-excel-source.md](docs/howto/configure-excel-source.md).

Variables optionnelles (`.env.local`) : `COINGECKO_API_KEY`, `EXCEL_PATH`
(fallback si aucun chemin n’est choisi dans Réglages).

## Usage courant

- **Sync cours** (Dashboard) → CoinGecko / Yahoo → cache local `prices.json`
- **Prix manuels** → VL FCPE dans la feuille Excel `Prix manuels`
- **Import CSV** (Trade Republic ou générique) :
  [docs/howto/import-trade-republic-csv.md](docs/howto/import-trade-republic-csv.md)

Les pages Dashboard / Actifs / Comptes / Transactions calculent positions, PRU
et P&L à partir de l’Excel + des prix.
