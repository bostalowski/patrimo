# Price sync pipeline

How market prices are fetched and cached. Price caches are derived data; the workbook remains authoritative.

## Sources

Asset `source` values from `@patrimo/core` schema:

| Source | Typical use | Web sync | Mobile sync |
|---|---|---|---|
| `coingecko` | Crypto | Historical merge | Spot |
| `yahoo` | ETF / stock | Historical merge | Spot |
| `investir` | OPCVM / FCPE HTML scrape | Historical merge | Spot |
| `zonebourse` | HTML scrape via URL `param` | Historical merge | Spot |
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
```

- Implementation: `src/lib/prices/sync.ts`, route `src/app/api/prices/sync/route.ts`.
- Each non-manual asset fetches history and merges into the existing store keyed by asset id and ISO date.
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
        v
AsyncStorage key patrimo:prices
```

- Fetches a latest price per asset and stores it under today's date.
- Does not download full historical series and does not sync benchmarks.
- Respects the same `shouldRunSync` interval helper as web when `force` is false.

## Portfolio consumption

`buildPortfolio` and history builders take a price map of latest (or dated) quotes. Missing quotes leave positions without mark-to-market updates; they do not delete workbook rows.

## Cleanup

After account/asset deletion, platforms remove deleted asset ids from their local cache. Cleanup failure must not undo workbook persistence ([ADR 0001](../adr/0001-share-deletion-rules-across-platforms.md)).

## Known platform gap

Historical series and benchmark sync exist on web only today. Manual VL entry is shared through the workbook on web and mobile. Remaining gaps are listed in [Platforms](../overview/platforms.md).

## See also

- [Sync prices](../howto/sync-prices.md)
- [Manual price persistence](manual-price-persistence.md)
- [Workbook persistence](workbook-persistence.md)
- [Glossary](../reference/glossary.md) — Price cache, Manual price
- [ADR 0002](../adr/0002-store-manual-prices-in-workbook.md)
