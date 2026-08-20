# Web API routes

Next.js Route Handlers under `src/app/api/`. They exist for the web/Electron surface. Mobile does not call these routes; it mutates the workbook through client adapters.

Unless noted, bodies are JSON. Successful mutations usually return `{ ok: true, … }`. Validation failures return `400` with `{ error: string }`.

## Settings

### `GET /api/settings`

Returns Excel configuration status: `excelPath`, `configured`, `valid`, optional `reason` / `detail`, `inflationRate`, `syncIntervalMinutes`.

### `POST /api/settings`

Body (all fields optional): `{ excelPath?, inflationRate?, syncIntervalMinutes? }`.

Validates `excelPath` when provided, writes `config.json`, resets workbook cache.

### `POST /api/settings/create`

Body: `{ excelPath }`.

Creates an empty workbook at the path, sets `excelPath` in config, resets cache.

## Accounts

### `POST /api/accounts`

Body: account fields without `id` (`Account.omit({ id })`). Generates id from label.

### `PUT /api/accounts`

Body: full `Account`. `404` if id missing.

### `DELETE /api/accounts`

Body: `{ id, mode: "cascade" | "detach" }`.

Applies `@patrimo/core` deletion, `replaceWorkbook`, then price-cache cleanup. May include `deletedAssetIds` and `cacheCleanupPending: true`.

## Assets

### `POST /api/assets`

Body: asset fields without `id`.

### `PUT /api/assets`

Body: full `Asset`. `404` if unknown.

### `DELETE /api/assets`

Body: `{ id }`. Cascade delete via core + workbook replace + cache cleanup (`deletedAssetIds`, optional `cacheCleanupPending`).

## Transactions

### `POST /api/transactions`

Body: `Transaction`. Validates account/asset refs; `TRANSFERT` requires destination; non-`LIVRET` accounts require a known asset.

### `PUT /api/transactions`

Body: `{ row, transaction }`. `row` is the 0-based data-row index in the `Transactions` sheet.

### `DELETE /api/transactions`

Body: `{ row }`.

### `POST /api/transactions/import`

Discriminated on `action`:

| Action | Body | Result |
|---|---|---|
| `preview` | `{ action: "preview", csv, profile }` | Import preview (rows, duplicates, unknown entities) |
| `commit` | `{ action: "commit", transactions, newAssets?, newAccounts? }` | Single workbook write via `commitImport` |

Profiles: `trade-republic` (`defaultCompte`) or `generic` (column mapping + defaults). See [Import Trade Republic CSV](../howto/import-trade-republic-csv.md).

## Budget

### `GET /api/budget`

`{ lines: BudgetLine[] }` from the workbook.

### `POST /api/budget`

Body: full `BudgetLine` (upsert by id).

### `DELETE /api/budget`

Body: `{ id }`.

## DCA

### `GET /api/dca`

`{ configs: DcaConfig[] }` from the workbook `DCA` sheet (via store helpers that delegate to Excel).

### `POST /api/dca`

Body: `DcaConfig`. Rejects when basket target percentages do not sum to `1` (±0.001) or an asset appears in multiple baskets.

### `DELETE /api/dca`

Body: `{ id }`.

## Diversification targets

### `PUT /api/diversification-targets`

Body: `{ targets: DiversificationTarget[] }` (`key`, `minPct`, `maxPct` in `[0, 1]` with `minPct ≤ maxPct`). Empty `targets` clears the plan.

Validates with `validateDiversificationTargets` (known keys, valid bands, unique keys, no country/region overlap), then `replaceWorkbook` with the new `diversificationTargets`. Mobile does not call this route; it writes the sheet via client serialize. See [ADR 0012](../adr/0012-allocation-coherence.md).

Removed: `PUT /api/target-allocation`.

## Financial goals

### `PUT /api/goals`

Body: `{ goals: FinancialGoal[] }` (`id`, `label`, `type`, `targetAmount`, optional `targetAge` / `targetDate` / `notes`). Empty `goals` clears the plan.

Validates with `validateFinancialGoals`, then `replaceWorkbook` with the new `financialGoals`. Mobile has no Objectifs UI in V1 but round-trips the sheet. See [ADR 0014](../adr/0014-financial-goals.md).

## Properties

### `POST /api/properties`

Body: property fields without `id`.

### `PUT /api/properties`

Body: full `Property`. `404` if unknown.

### `DELETE /api/properties`

Body: `{ id }`.

## Prices

### `POST /api/prices/sync` (also `GET`)

Query params:

| Param | Effect |
|---|---|
| `assetId` | Sync that asset only (no benchmark update, no sync-meta write) |
| `ifStale` | Skip when last sync is still within configured interval |

Full sync runs `syncPrices` + `syncBenchmarks` and updates `sync-meta.json`.

Response may be `{ skipped: true, lastSync }` or `{ durationMs, results, benchmarks, lastSync }`.

### `GET /api/prices/manual`

Workbook `Prix manuels` entries as `{ [assetId]: { [YYYY-MM-DD]: price } }`.

### `POST /api/prices/manual`

Body: `{ assetId, date: "YYYY-MM-DD", price }` (`price` > 0).
Persists through the workbook (`upsertManualPrice` + `replaceWorkbook`). Rejects unknown/non-manual assets, future dates, and non-positive prices.

### `DELETE /api/prices/manual`

Body: `{ assetId, date }`.
Removes that dated entry from the workbook.

## Geography

### `POST /api/geography`

Body: `{ assetId, source: "manual", weights: [{ country, weight }] }` with `weight` in `[0, 1]` and `0 < sum(weights) ≤ 1` (± 1e-3); see [ADR 0010](../adr/0010-partial-geographic-allocation-weights.md).

Persists via `replaceGeographicAllocation` + `replaceWorkbook`.

### `POST /api/geography/sync`

Body: `{ assetId, restore?: boolean }`.

Fetches JustETF profile HTML for the asset ISIN, parses country weights in `@patrimo/core`, writes `source=justetf` for that asset. Ordinary sync skips when current source is `manual`; `restore: true` overwrites. `502` when fetch/parse fails. See [ADR 0011](../adr/0011-restore-justetf-geographic-sync.md).

## Retirement profile

### `GET /api/retirement-profile`

JSON profile from `retirement-profile.json` (not the Excel workbook).

### `POST /api/retirement-profile`

Merges body into current profile, validates `RetirementProfile`, persists.

## Auth and scope

These handlers assume a local trusted process (browser/Electron talking to the embedded or `next dev` server). There is no end-user authentication layer on the routes.

## See also

- [Excel workbook schema](excel-workbook.md)
- [Price sync pipeline](../architecture/price-sync-pipeline.md)
- [Deletion pipeline](../architecture/deletion-pipeline.md)
- [Platforms](../overview/platforms.md)
