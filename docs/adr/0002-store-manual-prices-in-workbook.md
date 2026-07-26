# ADR 0002: Store manual prices in the workbook

- Status: accepted
- Date: 2026-07-26

## Context

Manual prices are user-authored portfolio data. Web/Electron currently stores them in a local `manual-prices.json` file, while mobile has no equivalent editing flow. As a result, two applications reading the same workbook cannot share the same manual valuations.

Automatic market prices remain derived data that can be fetched again. Manual prices cannot be reconstructed from an external source and therefore need a shared source of truth.

Canonical terms are defined in the [glossary](../reference/glossary.md).

## Decision

Manual prices are stored in an optional `Prix manuels` workbook sheet with columns `Actif`, `Date`, and `Prix`.

The canonical in-memory model contains `ManualPrice { assetId, date, price }`. Web/Electron and mobile parse and serialize the same model through `@patrimo/core`.

The pair `assetId + date` is unique. Application writes replace the existing value for that pair. If a manually edited sheet contains duplicates, the last valid row wins for valuation and the next manual-price write normalizes the sheet.

Only assets whose price source is `manual` expose manual-price editing. A manual asset without a valid price is not valued from its latest transaction.

Future dates and non-positive prices are rejected. Invalid rows and rows referencing an unknown asset are ignored for valuation without making the rest of the workbook unreadable.

Existing workbooks without the sheet remain valid. The sheet is created on the first manual-price write. New workbook templates include it.

Deleting an asset removes all of its manual prices in the same workbook transformation.

`manual-prices.json` is no longer read. Existing JSON values are not migrated.

## Invariants

- The workbook is the only source of truth for manual prices.
- Automatic price histories remain local derived caches.
- Web/Electron and mobile apply the same validation and uniqueness rules.
- A manual price always references an existing `manual` asset.
- A future-dated or non-positive manual price is never persisted by the applications.
- Asset deletion cannot leave manual-price rows for the deleted asset.
- A failed workbook write does not produce a successful UI refresh.

## Options considered

### Dedicated workbook sheet

**Advantages**

- Manual prices travel with the portfolio across platforms and devices.
- Dated history remains representable.
- The workbook stays self-contained for user-authored financial data.

**Disadvantages**

- Every manual-price mutation writes the workbook.
- Concurrent device writes keep the existing last-writer-wins behavior.
- The workbook schema and every platform parser/serializer must evolve together.
- Existing `manual-prices.json` data is abandoned unless re-entered manually.

### Keep platform-local sidecar stores

**Advantages**

- No workbook schema change.
- Price writes do not touch the workbook.

**Disadvantages**

- Web/Electron and mobile can show different valuations for the same workbook.
- Manual user data remains tied to one application instance.
- Cross-device parity would require a second synchronization mechanism.

### Store only the latest price in `Actifs`

**Advantages**

- Fewer sheets and a simple lookup.

**Disadvantages**

- Dated history is lost.
- The asset definition mixes identity metadata with observations.
- It cannot match the existing web manual-price behavior.

## Consequences

- `Workbook` gains a `manualPrices` collection.
- The workbook template gains the optional `Prix manuels` sheet.
- Web `/api/prices/manual` keeps its HTTP contract but persists through Excel.
- Mobile asset editing gains dated manual-price CRUD.
- Price-map construction reads manual assets from workbook data.
- Deletion rules in `@patrimo/core` cascade to manual prices.
- Documentation that describes all prices as local derived caches must distinguish automatic prices from manual prices.

## Uncovered cases

- Existing `manual-prices.json` files are not imported.
- Concurrent writes from multiple devices are not coordinated.
- Invalid and orphan rows are not repaired automatically.
- Manual prices are not editable for assets using an automatic price source.

## Follow-up

- Consider an explicit JSON-to-workbook migration tool only if abandoned histories become a real user problem.
- Consider a workbook integrity report if silent invalid-row skipping becomes hard to diagnose.

## See also

- [Manual price persistence](../architecture/manual-price-persistence.md)
- [Price sync pipeline](../architecture/price-sync-pipeline.md)
- [Excel workbook schema](../reference/excel-workbook.md)
- [Glossary](../reference/glossary.md)
- `packages/core/src/schema.ts`
- `packages/core/src/deletion.ts`
- `src/app/api/prices/manual/route.ts`
- `mobile/lib/price-sync.ts`
