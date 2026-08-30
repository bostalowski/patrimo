# Price sync pipeline

How market prices are fetched and cached. Price caches are derived data; the workbook remains authoritative.

## Sources

Asset `source` values from `@patrimo/core` schema:

| Source | Typical use | Web sync | Mobile sync |
|---|---|---|---|
| `coingecko` | Crypto | Historical merge | Historical merge |
| `yahoo` | ETF / stock | Historical merge | Historical merge |
| `investir` | OPCVM / FCPE HTML scrape | Historical merge | Historical merge |
| `zonebourse` | HTML scrape via URL `param` | Historical merge | Historical merge |
| `manual` | User-entered VL | Skipped by API sync; stored in workbook `Prix manuels` | Not synced; latest workbook entry; no transaction fallback |

## Web / Electron flow

```text
SyncButton / interval
        |
        v
POST /api/prices/sync
        |
        +--> syncPrices(assets)     --> data/prices.json
        +--> syncBenchmarks()       --> data/benchmarks.json
        +--> syncLivretRates()      --> data/livret-rates.json  (non-blocking; D9)
```

- Implementation: `src/lib/prices/sync.ts`, route `src/app/api/prices/sync/route.ts`, livret rates `src/lib/livret-rates/`.
- Each non-manual asset fetches history and merges into the existing store keyed by asset id and ISO date.
- Livret A/LDDS rates are fetched from OpenFisca-France YAML and merged into `livret-rates.json`; errors are reported in the response meta and never fail the price sync ([ADR 0024](../docs/adr/0024-livret-official-rate-series.md)).
- Manual prices: `POST /api/prices/manual` writes the workbook sheet `Prix manuels`.
- `readPriceMap` uses `prices.json` for automatic sources and workbook `manualPrices` for `manual` assets.
- Sync interval and staleness helpers live in `@patrimo/core/prices/schedule` and `config.json` (`syncIntervalMinutes`).

## Mobile flow

```text
WorkbookProvider.load / pull-to-refresh
        |
        v
mobile/lib/price-sync.ts syncPrices
        |
        +--> AsyncStorage key patrimo:prices
        +--> syncLivretRates() → AsyncStorage patrimo:livret-rates (non-blocking)
```

- Fetches and merges historical series for automatic sources (`coingecko`, `yahoo`, `investir`, `zonebourse`), same sources as web.
- Also merges the official Livret A/LDDS rate series ([ADR 0024](../docs/adr/0024-livret-official-rate-series.md)); rate failure does not fail price sync.
- Does not sync benchmarks.
- Manual assets are skipped; workbook `Prix manuels` remain the source for those valuations.
- Respects the same `shouldRunSync` interval helper as web when `force` is false.

## Portfolio consumption

`buildPortfolio` and history builders take a price map of latest (or dated) quotes. Missing quotes leave positions without mark-to-market updates; they do not delete workbook rows.

## Cleanup

After account/asset deletion, platforms remove deleted asset ids from their local cache. Cleanup failure must not undo workbook persistence ([ADR 0001](../docs/adr/0001-share-deletion-rules-across-platforms.md)).

## Known platform gap

Benchmark sync exists on web only today. Manual VL entry is shared through the workbook on web and mobile. Remaining gaps are listed in [Platforms](../docs/overview/platforms.md).

## See also

- [Sync prices](../docs/howto/sync-prices.md)
- [Manual price persistence](../packages/core/manual-prices.md)
- [Workbook persistence](workbook-persistence.md)
- [Glossary](../docs/reference/glossary.md) — Price cache, Manual price
- [ADR 0002](../docs/adr/0002-store-manual-prices-in-workbook.md)
