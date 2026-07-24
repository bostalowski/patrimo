# Account and asset deletion pipeline

See [ADR 0001](../adr/0001-share-deletion-rules-across-platforms.md) for the decision and invariants. Canonical terms are defined in the [glossary](../reference/glossary.md).

## Scope

This page describes the implemented flow for deleting accounts and assets from the web and mobile applications.

## Components

```text
Web confirmation modal           Mobile confirmation modal
          |                               |
          v                               v
    DELETE route                    mobile command
          |                               |
          +----------+--------------------+
                     |
                     v
        @patrimo/core deletion rules
          |       pure workbook result
          v
    platform persistence adapter
          |
          +-- workbook: one replacement write
          +-- local price cache: cleanup after success
```

## Core transformation

`packages/core/src/deletion.ts` exports:

- `NO_ACCOUNT_ID` (`__NO_ACCOUNT__`) and `UNASSIGNED_CASH_ASSET_ID` (`__UNASSIGNED_CASH__`)
- `NO_ACCOUNT_LABEL` and `UNASSIGNED_CASH_ASSET_LABEL`
- `deleteAccount(workbook, accountId, mode)`
- `deleteAsset(workbook, assetId)`
- `accountDeletionImpact(workbook, accountId)`
- `assetDeletionImpact(workbook, assetId)`

Each mutation returns the next workbook and the deleted asset identifiers used for cache cleanup. The module does not read files, call APIs, or mutate its input.

### Delete an account with cascade

1. Verify that the account exists.
2. Remove every transaction where the account is the source or destination.
3. Remove the account.
4. Find assets no longer referenced by any remaining transaction.
5. Remove those asset definitions.
6. Remove deleted asset identifiers from investment-plan baskets.
7. Remove empty baskets and then empty plans.
8. Return deleted asset identifiers for cache cleanup.

### Delete an account with detach

1. Verify that the account exists.
2. Replace each source or destination reference with `NO_ACCOUNT_ID`.
3. Convert savings-account history to unassigned cash transactions using `UNASSIGNED_CASH_ASSET_ID`.
4. Remove the account.
5. Preserve asset definitions and investment plans.

### Delete an asset

1. Verify that the asset exists.
2. Remove every transaction referencing the asset.
3. Remove the asset definition.
4. Remove the asset identifier from investment-plan baskets.
5. Remove empty baskets and then empty plans.
6. Return the asset identifier for cache cleanup.

## Persistence boundaries

### Web

`DELETE /api/accounts` and `DELETE /api/assets` validate the command, load the workbook, apply the core transformation, and call `replaceWorkbook` once. After a successful workbook replacement, they call `removeAssetsFromPriceCaches`. If cache cleanup fails, the deletion still succeeds and the response reports `cacheCleanupPending: true`.

### Mobile

`deleteAccountFromSource` and `deleteAssetFromSource` read the active local or Google Drive workbook, apply the same core transformation, serialize with `serializeWorkbook`, and replace or upload the workbook once. They then call `removeAssetsFromPriceCache`. Cache cleanup failures do not undo a successful workbook write.

## No account

`NO_ACCOUNT_ID` is a transaction reference, not an account row. Portfolio, performance, and display code map it to `NO_ACCOUNT_LABEL`. Transaction creation options exclude the identifier. Tax calculations skip transactions assigned to **No account** because they have no reliable tax envelope.

Unassigned cash uses `UNASSIGNED_CASH_ASSET_ID`, valued at one unit of the workbook currency. Recorded savings interest is preserved; future savings-interest estimation stops after the original account and rate are deleted.

## Failure behavior

The transformed workbook is serialized before replacement. A transformation or serialization failure performs no write. A failed replacement leaves the original workbook available according to the platform file adapter.

Price caches are derived data. Cache cleanup never precedes workbook persistence, and stale cache entries do not participate in calculations once their asset definition is absent.
