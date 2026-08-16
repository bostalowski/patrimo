# Geographic allocation

> 🚧 Anticipated mechanics (Phase 1.5 draft) — confirm after implementation. See [ADR 0008](../adr/0008-geographic-allocation.md).

How Patrimo stores look-through country weights and aggregates them into portfolio, account, and asset views.

## Intent

Show where invested market value is exposed geographically, using workbook-backed weights filled from JustETF or manual entry.

## Flow

```text
JustETF (ISIN) ──platform fetch──┐
                                 ├──► @patrimo/core replace allocation
Manual edit ─────────────────────┘              │
                                                ▼
                                    Workbook sheet Exposition geo
                                                │
                         buildPortfolio positions (marketValue)
                                                │
                                                ▼
                         @patrimo/core aggregateGeoExposure
                          (global | by account | by asset)
                                                │
                    ┌───────────────────────────┼──────────────────┐
                    ▼                           ▼                  ▼
              Global geo page            Asset detail         Accounts page
              (web + mobile)             (web + mobile)       (web + mobile)
```

## Workbook sheet

Optional sheet `Exposition geo`:

| Column | Model | Rule |
|---|---|---|
| `Actif` | `assetId` | Existing asset id |
| `Pays` | `country` | ISO 3166-1 alpha-2 or `OTHER` |
| `Poids %` | `weight` | Excel percent; model fraction in `[0, 1]` |
| `Source` | `source` | `justetf` or `manual` |

Logical replace key: all rows for one `assetId` are replaced together. Missing sheet ⇒ empty collection.

## Aggregation rules

1. Take open positions with `marketValue > 0`.
2. Skip assets with no allocation rows (or invalid sum).
3. For each country: add `marketValue * weight`.
4. Convert euro totals to percentages over the **covered** total only.
5. Region view: map each country through the fixed product region table; roll up.

## Manual lock

- Ordinary JustETF sync skips assets whose current allocation `source` is `manual`.
- Explicit restore replaces with `source=justetf`.

## Deletion

Deleting an asset removes its geographic rows (shared deletion pipeline extension).

## Surfaces

| Surface | Placement |
|---|---|
| Web | Nav item + asset detail block + accounts page per-account donut |
| Mobile | Equivalent screens (global entry, asset edit/detail, accounts) |

## See also

- [ADR 0008](../adr/0008-geographic-allocation.md)
- [Implement geographic allocation](../howto/implement-geographic-allocation.md)
- [Manual price persistence](manual-price-persistence.md) — analogous workbook pattern
