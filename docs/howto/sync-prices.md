# Sync prices

## Web / Electron

1. Ensure assets have a non-empty `Param source` for API/scrape sources.
2. On the dashboard, use **Sync cours** (or wait for the automatic stale check).
3. Inspect results; history merges into `data/prices.json`.
4. For `manual` assets (FCPE), enter VL from the asset detail / **Prix manuels** UI — values go into the workbook sheet `Prix manuels`.

Optional: set `COINGECKO_API_KEY` in `.env.local`. Public CoinGecko works without a key for light personal use.

Sync interval: **Réglages** → `syncIntervalMinutes` in `config.json`.

## Mobile

1. Connect a workbook in Settings.
2. Load or refresh the workbook; `syncPrices` runs when the interval says the cache is stale, or when forced.
3. Only latest automatic quotes are stored in AsyncStorage under `patrimo:prices`.
4. For `manual` assets, open the asset edit screen and manage dated prices; they persist in the same workbook sheet.

Benchmark sync remains web-only today.

## Verify

- Web: open Dashboard after sync; positions should use updated marks.
- Automatic prices: `prices.json` under the data directory (web), or AsyncStorage (mobile).
- Manual prices: workbook sheet `Prix manuels`.

## See also

- [Price sync pipeline](../architecture/price-sync-pipeline.md)
- [Platforms](../overview/platforms.md)
