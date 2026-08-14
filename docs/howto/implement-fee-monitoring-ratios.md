# Implement fee monitoring ratios

Ordered vertical scopes and test strategy for fee monitoring ratios on the web Fees page. Confirmed against shipped code on `feat/fee-monitoring-ratios`.

## Prerequisites

- Spec: [ADR 0007](../adr/0007-fee-monitoring-ratios.md) (accepted)
- Branch: `feat/fee-monitoring-ratios`

## Increment plan

### Scope 1 — Portfolio KPIs (done)

Add `annualFeeDrag`, `allInAnnualCost`, and `feesToGainRatio` in `@patrimo/core`. Wire them on the web Fees page KPI grid (keep existing all-time `feeRatio` card). Covers Phase 0 cases 1, 2, 3, 6, 7, 8.

Tests: `src/lib/fees.test.ts`.

### Scope 2 — Per-asset ratios (done)

Add `enrichAssetFeeRows` that joins `feesByAsset` with portfolio asset `costBasis` / `totalReturn`. Extend the Fees asset table with % of capital and % of gain columns. Covers cases 4, 5, 9.

Tests: `src/lib/fees.test.ts`.

## Test strategy

| Level | What it proves |
|---|---|
| Core unit | Happy-path ratios; null when capital ≤ 0; null when return ≤ 0; TER = 0 still yields all-in from YTD; closed position costBasis ≤ 0 → null capital ratio; missing position → both ratios null |
| Web wiring | KPIs and table columns receive nullable ratios and render "—" when null |

## Commands

```bash
npm test -- src/lib/fees
```

## See also

- [Fee monitoring ratios](../architecture/fee-monitoring-ratios.md)
- [ADR 0007](../adr/0007-fee-monitoring-ratios.md)
