# Geographic allocation

How Patrimo stores look-through country weights and aggregates them into portfolio, account, and asset views. Decision: [ADR 0008](../adr/0008-geographic-allocation.md).

## Intent

Show where invested market value is exposed geographically, using workbook-backed weights filled from JustETF (web) or manual entry.

## Flow

```text
JustETF (ISIN, web) ──fetch/parse──┐
                                   ├──► @patrimo/core replace allocation
Manual edit (web + mobile) ────────┘              │
                                                  ▼
                                      Workbook sheet Exposition geo
                                                  │
                           buildPortfolio positions (marketValue)
                                                  │
                                                  ▼
                           aggregateGeographicExposure
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

1. Take positions with `marketValue > 0`.
2. Skip assets with no allocation rows (or invalid sum).
3. For each country: add `marketValue * weight`.
4. Convert euro totals to percentages over the **covered** total only.
5. Optional region rollup helpers may still exist in core; **web UI does not use them as the primary chart**.

## Web visualization (country map)

- Primary chart: interactive world choropleth via `d3-geo` + local `countries-110m` TopoJSON (ISO α-2 → color intensity by weight). `react-simple-maps` was rejected (no React 19 peer support).
- Companion: sorted country list (French label, €, %).
- `OTHER` and non-mappable codes: list only.
- Hover: French name + € + %.
- Surfaces: `/geographie`, asset detail, comptes panels (same component).
- Out of this increment: mobile map (list remains).

## Manual lock

- Ordinary JustETF sync skips assets whose current allocation `source` is `manual`.
- Explicit restore replaces with `source=justetf`.
- JustETF sync UI/API is web-only in this increment; mobile supports manual entry and display.

## Deletion

Deleting an asset removes its geographic rows (shared deletion pipeline extension).

## Surfaces

| Surface | Placement |
|---|---|
| Web | Sidebar `/geographie`, asset detail section, comptes per-account panel, interactive country map + list, `/api/geography` + `/api/geography/sync` |
| Mobile | Plus → Géographie, edit-asset manual editor, comptes per-account list (no interactive map yet) |

## See also

- [ADR 0008](../adr/0008-geographic-allocation.md)
- [Implement geographic allocation](../howto/implement-geographic-allocation.md)
- [Manual price persistence](manual-price-persistence.md) — analogous workbook pattern
