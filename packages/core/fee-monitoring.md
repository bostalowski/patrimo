# Fee monitoring ratios

How the web Fees page derives annual cost, all-in cost, and fees-to-gain ratios from existing fee and portfolio totals.

## Intent

Users judge fee burden relative to current invested capital and to portfolio / asset total return, without inventing new workbook fields.

## Flow

```text
Workbook + prices
   |
   +--> buildPortfolio → totals.netInvested, totals.fees, totals.totalReturn, assets[]
   +--> feesByYear → ytdFees (current calendar year)
   +--> estimatedAnnualTer → terAnnual
   +--> feesByAsset → paidFees per asset
   |
   v
@patrimo/core fees helpers
   |
   +--> annualFeeDrag(ytdFees, netInvested)
   +--> allInAnnualCost(ytdFees, terAnnual, netInvested)
   +--> feesToGainRatio(totalFees, totalReturn)
   +--> enrichAssetFeeRows(assetFees, assetPositions)
   |
   v
Web Fees page KPI grid + asset table columns
```

## Surfaces

| Surface | Placement | Notes |
|---|---|---|
| Web Fees (`src/app/frais/`) | KPI cards + “Détail des frais par actif” table | Mobile out of scope for this increment |

## Null rules (UI “—”)

| Metric | Null when |
|---|---|
| Annual fee drag / all-in annual cost | `netInvested ≤ 0` |
| Fees-to-gain (portfolio or asset) | `totalReturn ≤ 0` |
| Fees / asset capital | `costBasis ≤ 1e-6` (closed / float dust) |

## Invariants

Governed by [ADR 0007](../../docs/adr/0007-fee-monitoring-ratios.md).

## Out of scope

- Year-average capital
- Alert bands
- Mobile Fees UI for these ratios

## See also

- [ADR 0007](../../docs/adr/0007-fee-monitoring-ratios.md)
- [Implement fee monitoring ratios](../../docs/howto/implement-fee-monitoring-ratios.md)
- [Platforms](../../docs/overview/platforms.md)
