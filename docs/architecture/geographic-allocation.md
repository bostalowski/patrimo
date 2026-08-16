# Geographic allocation

How Patrimo stores look-through geographic weights and aggregates them into portfolio, account, and asset views. Decisions: [ADR 0008](../adr/0008-geographic-allocation.md), [ADR 0009](../adr/0009-account-detail-and-mobile-justetf.md).

## Intent

Show where invested market value is exposed geographically. Weights come from JustETF (countries) or manual entry (countries **or** product regions), with guided pickers to avoid key typos.

## Flow

```text
JustETF (ISIN) ──platform fetch──┐
                                 ├──► @patrimo/core parse + apply (country rows)
Manual countries (picker) ───────┤
Manual regions (closed list) ────┘              │
                                                ▼
                                    Workbook sheet Exposition geo
                                                │
                         buildPortfolio positions (marketValue)
                                                │
                                                ▼
                         aggregateGeographicExposure
                          (countries | regions | by account | by asset)
                                                │
                    ┌───────────────┬───────────┴────────────┐
                    ▼               ▼                        ▼
              Global geo      Asset detail            Account detail
              country+region  country+region          country+region
```

## Workbook sheet

Optional sheet `Exposition geo`:

| Column | Model | Rule |
|---|---|---|
| `Actif` | `assetId` | Existing asset id |
| `Pays` | `country` | ISO 3166-1 alpha-2, `OTHER`, **or** a product region key (`NORTH_AMERICA`, `LATIN_AMERICA`, `EUROPE`, `ASIA_PACIFIC`, `AFRICA_MIDDLE_EAST`, `OTHER`) |
| `Poids %` | `weight` | Excel percent; model fraction in `[0, 1]` |
| `Source` | `source` | `justetf` or `manual` |

Logical replace key: all rows for one `assetId` are replaced together. Missing sheet ⇒ empty collection. Rows for one asset must be **homogeneous** (all country-level or all region-level).

## Aggregation rules

1. Take positions with `marketValue > 0`.
2. Skip assets with no allocation rows (or invalid sum).
3. **Country breakdown:** only assets with country-level rows; drop residual `OTHER` country rows and renormalize; exclude region-only assets.
4. **Region breakdown:** country-level assets → `regionForCountry`; region-level assets → region key as-is; percentages over covered market value for that breakdown.
5. Slice percentages are over the **covered** total of that breakdown only (country covered and region covered may differ).

## JustETF parse ownership

- HTML country-table **parse** and sync orchestration live in `@patrimo/core`.
- Platforms own HTTP fetch and sync UI.
- Successful sync always writes **country-level** rows.

## Manual entry UX

- Mode: **Countries** or **Regions** (per asset).
- Regions: closed list of the five product regions (French labels).
- Countries: searchable/selectable ISO alpha-2 list (French labels) plus `OTHER`.
- No free-typed geographic keys outside those pickers.

## Web visualization

- **Countries:** interactive choropleth + country list (unchanged map stack).
- **Regions:** companion list (French region labels, €, %).
- Surfaces: `/geographie`, asset detail, **account detail** (not the accounts list).

## Manual lock

- Ordinary JustETF sync skips `source=manual` unless explicit restore.
- JustETF sync on web (`/api/geography/sync`) and mobile (local fetch + core apply).

## Deletion

Deleting an asset removes its geographic rows.

## Surfaces

| Surface | Placement |
|---|---|
| Web | `/geographie`, asset detail, `/comptes/[id]`; accounts list without full geo; dual country+region views; guided manual entry; `/api/geography` + sync |
| Mobile | Plus → Géographie, edit-asset (guided manual + JustETF when ISIN), account detail; accounts list without full geo; dual lists; no map |

## Account navigation (mobile)

Accounts list → account detail (positions + geo) → edit-account (metadata only).

## See also

- [ADR 0008](../adr/0008-geographic-allocation.md)
- [ADR 0009](../adr/0009-account-detail-and-mobile-justetf.md)
- [Implement geographic allocation](../howto/implement-geographic-allocation.md)
- [Manual price persistence](manual-price-persistence.md)
