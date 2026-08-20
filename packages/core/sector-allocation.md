# Sector allocation

How Patrimo stores look-through sector weights and aggregates them. Decision: [ADR 0013](../../docs/adr/0013-sector-allocation.md).

## Intent

Show where invested market value is exposed by sector (GICS/JustETF). Weights come from **JustETF sync** (`source=justetf`) or **manual entry** (`source=manual`) via a closed picker. Partial sums (`0 < sum ≤ 1`) are allowed; the missing fraction stays unreported.

## Workbook sheet

Optional sheet `Exposition secteur`:

| Column | Model | Rule |
|---|---|---|
| `Actif` | `assetId` | Existing asset id |
| `Secteur` | `sector` | Closed key (`INFORMATION_TECHNOLOGY`, `FINANCIALS`, …) |
| `Poids %` | `weight` | Fraction in `[0, 1]`; per-asset sum `0 < sum ≤ 1` (± 1e-3) |
| `Source` | `source` | `manual` or `justetf` |

## Aggregation

1. Positions with `marketValue > 0`.
2. Skip assets without valid sector rows.
3. Drop `OTHER` rows without redistributing.
4. Portfolio breakdown on Diversification page includes unmapped liquid MV.

## Surfaces

| Surface | Placement |
|---|---|
| Web | `/diversification`, asset detail, `/comptes/[id]`; `POST /api/sectors`; `POST /api/sectors/sync` |
| Mobile | Plus → Diversification, edit-asset, account detail |

## See also

- [ADR 0013](../../docs/adr/0013-sector-allocation.md)
- [Geographic allocation](geographic-allocation.md)
- [Diversification targets](diversification-targets.md)
