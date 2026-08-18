# Geographic allocation

How Patrimo stores look-through geographic weights and aggregates them into portfolio, account, and asset views. Decisions: [ADR 0008](../adr/0008-geographic-allocation.md), [ADR 0009](../adr/0009-account-detail-and-mobile-justetf.md), [ADR 0010](../adr/0010-partial-geographic-allocation-weights.md), [ADR 0011](../adr/0011-restore-justetf-geographic-sync.md).

## Intent

Show where invested market value is exposed geographically. Weights come from **JustETF sync** (ISIN, country-level, `source=justetf`) or **manual entry** (countries **or** product regions, `source=manual`), with guided pickers for manual keys. Partial sums (`0 < sum ≤ 1`) are allowed so users can save incomplete factsheets; the missing fraction stays unreported on charts. Ordinary JustETF sync does not overwrite manual rows; Restore does.

## Flow

```text
JustETF (ISIN) ──platform fetch──┐
                                 ├──► @patrimo/core parse + apply
Manual countries (picker) ───────┤
Manual regions (closed list) ────┘
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
| `Poids %` | `weight` | Excel percent; model fraction in `[0, 1]`; per-asset sum must satisfy `0 < sum ≤ 1` (± 1e-3) |
| `Source` | `source` | `manual` or `justetf` |

Logical replace key: all rows for one `assetId` are replaced together. Missing sheet ⇒ empty collection. Rows for one asset must be **homogeneous** (all country-level or all region-level).

## Aggregation rules

1. Take positions with `marketValue > 0`.
2. Skip assets with no allocation rows, empty weights, or sum outside `0 < sum ≤ 1` (± tolerance).
3. **Country breakdown:** only assets with country-level rows; drop residual `OTHER` country rows **without** redistributing their weight; contribute `marketValue * weight` for each remaining row; exclude region-only assets.
4. **Region breakdown:** country-level assets → `regionForCountry` on absolute country contributions; region-level assets → region key as-is with `marketValue * weight` (no renormalization to 1).
5. Slice percentages are over the **covered** total of that breakdown only (sum of absolute contributions; country covered and region covered may differ). Unentered remainder does not appear as a slice.

## Manual entry UX

- Mode: **Countries** or **Regions** (per asset).
- Regions: closed list of the six product regions (French labels).
- Countries: searchable/selectable ISO alpha-2 list (French labels) plus `OTHER`.
- No free-typed geographic keys outside those pickers.
- Saving always writes `source=manual` via `replaceGeographicAllocation`.
- Editor shows a **non-blocking** current-sum indicator (e.g. “80% renseignés”); save is allowed when the core sum rule passes; sum &gt; 100% (± tolerance) is rejected.

## JustETF sync

- Available on asset detail (web) and asset edit (mobile) when the asset has an ISIN.
- Parse/apply live in `@patrimo/core`; platforms only fetch HTML.
- Writes `source=justetf` for that asset; drops JustETF `OTHER` without redistributing (partial coverage).
- Ordinary sync skips when current source is `manual`; **Restore** overwrites manual rows.
- Failure leaves existing geographic rows unchanged.

## Web visualization

- **Countries:** interactive choropleth + country list (unchanged map stack).
- **Regions:** companion list (French region labels, €, %).
- Surfaces: `/geographie`, asset detail, **account detail** (not the accounts list).

## Deletion

Deleting an asset removes its geographic rows.

## Surfaces

| Surface | Placement |
|---|---|
| Web | `/geographie`, asset detail, `/comptes/[id]`; accounts list without full geo; dual country+region views; guided manual entry; `POST /api/geography`; `POST /api/geography/sync` |
| Mobile | Plus → Géographie, edit-asset (guided manual + JustETF), account detail; accounts list without full geo; dual lists; no map |

## Account navigation (mobile)

Accounts list → account detail (positions + geo) → edit-account (metadata only).

## See also

- [ADR 0008](../adr/0008-geographic-allocation.md)
- [ADR 0009](../adr/0009-account-detail-and-mobile-justetf.md)
- [ADR 0010](../adr/0010-partial-geographic-allocation-weights.md)
- [ADR 0011](../adr/0011-restore-justetf-geographic-sync.md)
- [Implement geographic allocation](../howto/implement-geographic-allocation.md)
- [Diversification targets](diversification-targets.md)
- [Manual price persistence](manual-price-persistence.md)
