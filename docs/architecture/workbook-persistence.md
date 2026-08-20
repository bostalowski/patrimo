# Workbook persistence

How Patrimo loads and saves the Excel source of truth.

## Workbook contract

Sheet names and headers are defined in `packages/core/src/workbook-template.ts`.

| Sheet | Required | Contents |
|---|---|---|
| `Transactions` | Yes | Dated movements (`ACHAT`, `VENTE`, …) |
| `Actifs` | Yes | Asset definitions and price source metadata |
| `Comptes` | Yes | Accounts and tax envelopes |
| `Budget` | No | Income / expense / savings lines |
| `Immobilier` | No | Properties |
| `DCA` | No | Investment plans (baskets + target %) |
| `Prix manuels` | No | Manual dated valuations |
| `Exposition geo` | No | Geographic look-through weights |
| `Exposition secteur` | No | Sector look-through weights |
| `Cibles diversification` | No | Diversification target bands |
| `Objectifs` | No | Financial goals (retirement income / capital) |

Zod shapes live in `packages/core/src/schema.ts`.

## Web / Electron

### Path resolution

1. `FINGRAPHS_DATA_DIR` selects the data directory (Electron packagé sets Application Support).
2. Default data directory in development: `./data`.
3. Excel path: `config.json` → `excelPath`, else `EXCEL_PATH`.

Implementation: `src/lib/config.ts`.

### Read path

`loadWorkbook()` in `src/lib/excel.ts`:

1. Resolve path and read `mtimeMs`.
2. In production, return the in-memory cache when `mtimeMs` is unchanged.
3. Parse sheets into a `Workbook`.
4. Sort transactions by date.

### Write path

Most mutations read the file, modify the XLSX workbook object, then call `writeWorkbook`:

1. Serialize to a `.tmp` sibling file.
2. `renameSync` onto the target path.
3. Clear the in-memory cache.

`replaceWorkbook` rebuilds sheets from a full `Workbook` value (used by deletion and import commit).

`appendTransaction(s)` currently writes with `writeFileSync` directly after sheet mutation; other helpers use the temp+rename path.

### Derived JSON beside the workbook

Under the data directory (not inside the `.xlsx`):

| File | Role |
|---|---|
| `config.json` | Excel path, inflation, sync interval |
| `prices.json` | Historical prices from API / scrape sources |
| `benchmarks.json` | Benchmark series |
| `retirement-profile.json` | Retirement inputs |
| `sync-meta.json` | Last sync metadata |
| `expected-returns.json` | Projection rate assumptions |

## Mobile

### Source abstraction

`mobile/lib/file-source.ts` selects:

- **Local file** — document picker + filesystem copy (`local-file.ts`)
- **Google Drive** — OAuth, download, upload (`google-drive.ts`)

### Read / write

1. Read bytes from the active source.
2. `parseWorkbook` / `serializeWorkbook` in `mobile/lib/excel-mobile.ts`.
3. Apply mutations in memory (often via `@patrimo/core`).
4. Write bytes back (upload or local replace).

Price caches use AsyncStorage, not the web JSON files.

## Failure behavior

- A failed transformation leaves the previous workbook on disk.
- A failed price-cache cleanup after a successful workbook write does not roll back the workbook (see [Deletion pipeline](deletion-pipeline.md)).

## See also

- [Foundations](foundations.md)
- [Configure the Excel source](../howto/configure-excel-source.md)
- [Glossary](../reference/glossary.md)
