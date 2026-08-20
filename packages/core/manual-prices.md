# Manual price persistence

Confirmed mechanics for workbook-backed manual prices. Decision record: [ADR 0002](../../docs/adr/0002-store-manual-prices-in-workbook.md).

## Intention and success

Manual prices entered on web/Electron or mobile must produce the same valuation when each platform opens the same workbook.

Success is observable when:

- a price entered on one platform is available to another after workbook synchronization;
- dated entries can be added, replaced, listed, and deleted;
- deleting an asset removes its manual prices;
- automatic price caches remain outside the workbook.

## Workbook contract

Optional sheet: `Prix manuels`.

| Column | Model field | Rule |
|---|---|---|
| `Actif` | `assetId` | Existing asset whose source is `manual` |
| `Date` | `date` | Calendar date, not in the future |
| `Prix` | `price` | Finite number greater than zero |

The logical key is `Actif + Date`.

## Shared transformation

```text
UI / API command
       |
       v
@patrimo/core validation + upsert/delete
       |
       v
next Workbook value
       |
       +--> web Excel adapter
       |
       +--> mobile local/Drive adapter
```

Shared pure operations:

- upsert a price by `assetId + date`;
- delete a price by `assetId + date`;
- normalize duplicate rows with last-valid-row-wins semantics;
- remove all manual prices for deleted asset ids.

## Read behavior

1. Missing sheet produces an empty `manualPrices` collection.
2. Invalid rows and unknown-asset rows do not participate in valuation.
3. Duplicate keys are reduced in sheet order; the last valid row wins.
4. For a `manual` asset, the latest non-future workbook entry determines current price.
5. A `manual` asset without an entry has no current price. Transaction fallback is not used.
6. Automatic-source assets continue to use the platform-local automatic price cache.

## Write behavior

1. Validate the asset exists and uses source `manual`.
2. Validate date and positive price.
3. Apply the pure transformation in memory.
4. Serialize the workbook, creating `Prix manuels` when absent.
5. Persist through the platform adapter.
6. Refresh UI state only after persistence succeeds.

Every manual-price write rewrites the canonical sheet from the normalized in-memory collection, removing duplicate rows.

## Account and asset editing

- Tapping a persisted account or asset opens its edit screen.
- The identifier is visible but immutable.
- Saving updates the existing row selected by identifier.
- A missing identifier at save time is an error; saving never appends a replacement entity.
- Deletion remains available from the edit screen.
- Manual-price controls appear only on the edit screen of a `manual` asset.

## Error behavior

| Situation | Result |
|---|---|
| Unknown account or asset during edit | Reject; no write |
| Unknown or non-manual asset for manual price | Reject; no write |
| Invalid or future date | Reject; no write |
| Non-positive or non-finite price | Reject; no write |
| Workbook/local/Drive write failure | Surface error; do not report success or refresh |
| Invalid/orphan sheet row | Ignore for valuation; keep rest of workbook usable |

## Test strategy

### Shared core

- manual-price upsert appends a new key and replaces an existing key;
- validation rejects unknown/non-manual assets, future dates, and invalid prices;
- normalization applies last-valid-row-wins;
- asset deletion and account cascade deletion remove prices for deleted assets.

### Web adapter/API

- manual-price API reads and mutates workbook data without reading JSON;
- old workbook without the sheet gains it on first write;
- price-map construction uses workbook manual prices.

### Mobile adapter/UI

- account and asset updates replace the matching row while preserving identifiers and references;
- missing entities are rejected rather than appended;
- manual-price CRUD persists through the active workbook source;
- manual assets use workbook history and do not fall back to transaction price;
- navigation exposes edit screens and manual controls only where allowed.

## Implemented surface

- Core: `ManualPrice`, `Workbook.manualPrices`, `@patrimo/core/manual-prices`, template sheet `Prix manuels`, deletion cascade.
- Web: Excel parse/serialize, `/api/prices/manual`, `readPriceMap` / UI reads via workbook.
- Mobile: account/asset edit screens, manual-price CRUD on `manual` assets, price map from workbook.

## OPEN

No blocking question remains for this increment.

Non-blocking:

- A future explicit migration from abandoned `manual-prices.json` files may be added if needed.
- A workbook integrity report may later expose ignored rows.

Out of scope:

- automatic historical sync parity;
- mobile CSV import;
- real-estate CRUD parity;
- benchmark parity;
- multi-device conflict resolution.

## See also

- [ADR 0002](../../docs/adr/0002-store-manual-prices-in-workbook.md)
- [Key principles](../../CONSTRAINTS.md)
- [Foundations](ARCHITECTURE.md)
- [Excel workbook schema](../../docs/reference/excel-workbook.md)
- [Platforms](../../docs/overview/platforms.md)
