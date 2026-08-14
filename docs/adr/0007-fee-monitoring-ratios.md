# ADR 0007: Fee monitoring ratios on the Fees page

- Status: accepted
- Date: 2026-08-14
- implementation_ready: yes

```text
Contract (do not invent):
- WHEN ytdFees ≥ 0 and netInvested > 0
- THEN annualFeeDrag = ytdFees / netInvested (number)
- WHEN netInvested ≤ 0
- THEN annualFeeDrag = null (UI shows "—")
- WHEN ytdFees ≥ 0 and terAnnual ≥ 0 and netInvested > 0
- THEN allInAnnualCost = (ytdFees + terAnnual) / netInvested
- WHEN netInvested ≤ 0
- THEN allInAnnualCost = null
- WHEN terAnnual is missing or zero
- THEN allInAnnualCost uses terAnnual = 0 (YTD fees alone over capital)
- WHEN totalFees ≥ 0 and totalReturn > 0
- THEN feesToGainRatio = totalFees / totalReturn
- WHEN totalReturn ≤ 0
- THEN feesToGainRatio = null
- WHEN an asset has paidFees and costBasis > 1e-6 (meaningful invested capital)
- THEN feesToCapitalRatio = paidFees / costBasis
- WHEN costBasis ≤ 1e-6 (including closed positions with floating-point residue)
- THEN feesToCapitalRatio = null
- WHEN an asset has paidFees and asset.totalReturn > 0
- THEN feesToAssetGainRatio = paidFees / asset.totalReturn
- WHEN asset.totalReturn ≤ 0
- THEN feesToAssetGainRatio = null
- ELSE denominators: netInvested = portfolio.totals.netInvested (current Invested);
  totalReturn / asset.totalReturn = portfolio engine totals (unrealized + realized + income);
  ytdFees = sum of transaction fees for the current calendar year (same bucket as feesByYear);
  terAnnual = estimatedAnnualTer(...).total; paidFees per asset from feesByAsset
- FORBIDDEN average capital over the year; alert/color bands for "too expensive";
  changing feeRatio(all-time) to return null; mobile Fees UI for this increment;
  inventing tax deductibility; duplicating ratio math outside @patrimo/core
- OPEN (do not implement): none
```

## Context

The Fees page already shows all-time fees, YTD fees, all-time fees / capital (`feeRatio`), TER estimates, and fees by asset. Users still cannot judge **annual cost as a share of capital**, **all-in cost (YTD + TER)**, **fees as a share of gains**, or the same ratios **per asset**. Root cause is missing derived metrics, not incorrect fee capture.

Canonical terms: [glossary](../reference/glossary.md) (**Annual fee drag**, **All-in annual cost**, **Fees-to-gain ratio**).

## Decision

- Add pure helpers in `@patrimo/core` (`fees.ts`): `annualFeeDrag`, `allInAnnualCost`, `feesToGainRatio`, and an enricher that joins `feesByAsset` with portfolio asset positions (`costBasis`, `totalReturn`).
- New ratios return `number | null` (`null` = not meaningful; UI shows "—"). Existing `feeRatio` stays `0` when capital ≤ 0 (no contract change).
- Surface the three portfolio KPIs and enriched asset columns on the **web** Fees page only.
- Denominator for annual / all-in ratios is **current** `netInvested` (not year-average capital).

## Invariants

- Fee ratio math for these metrics lives only in `@patrimo/core`.
- Platforms format and render; they must not redefine when a ratio is null.
- TER in all-in is the existing `estimatedAnnualTer` annual euro estimate (projection), added to calendar YTD explicit fees — labels must not imply both are the same kind of cash already paid.

## Options considered

| Option | Status | Why |
|---|---|---|
| A — Core helpers + web Fees KPIs/table; null for non-meaningful ratios; current capital | Retained | Fixes the reading gap at the domain layer; matches Phase 0 choices |
| B — Compute ratios only in the React Fees report | Rejected | Duplicates domain rules; blocks future mobile parity |
| C — Year-average capital from portfolio history as denominator | Rejected for this increment | More accurate but out of scope (follow-up) |
| D — Change existing `feeRatio` to return null | Rejected | Avoids breaking current all-time KPI display contract |

## Consequences

**Positives**

- One testable contract for annual drag, all-in, and fees-to-gain (portfolio + per asset).
- Clear separation between storytelling (fees vs gains) and decision metrics (annual / all-in).

**Negatives**

- All-in mixes YTD cash fees with a forward TER estimate — must stay explicit in UI copy.
- Current capital as denominator drifts if large contributions land mid-year.

**To monitor**

- Users may still misread fees-to-gain as a “fee health” score in bear years (UI shows "—" when return ≤ 0, which mitigates the worst case).

## Uncovered cases

- Average invested capital over the calendar year.
- Color / threshold bands for expensive portfolios.
- Mobile Fees parity for these ratios.

## Follow-up

Optional later increment: year-average capital denominator (former “tranche 3”).

## See also

- [Fee monitoring ratios](../architecture/fee-monitoring-ratios.md)
- [Implement fee monitoring ratios](../howto/implement-fee-monitoring-ratios.md)
- [Glossary](../reference/glossary.md)
