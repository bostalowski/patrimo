# ADR 0006: Portfolio risk readability and concentration

- Status: accepted
- Date: 2026-08-14
- implementation_ready: yes

```text
Contract (do not invent):
- WHEN portfolio asset positions have marketValue > 0
    THEN compute concentration from weights aggregated by assetId (same basis as the allocation donut):
      top1Weight = max weight, top1Label = that asset's display label,
      top3Weight = sum of the three largest weights (or fewer if < 3 assets),
      status from top1Weight: < 0.30 → diversified; [0.30, 0.50) → balanced; ≥ 0.50 → concentrated
- WHEN no position has marketValue > 0
    THEN concentration is null (UI hides the concentration block; no fake Concentrated)
- WHEN annualizedVolatility / sharpeRatio / maxDrawdown are available (non-null)
    THEN map each to a risk status band with fixed product thresholds:
      volatility: < 0.10 → low; [0.10, 0.20] → moderate; > 0.20 → high
      sharpe: ≥ 1 → strong; [0.5, 1) → acceptable; < 0.5 → weak
      drawdown (value ≤ 0): > −0.10 → mild; [−0.20, −0.10] → marked; < −0.20 → severe
- WHEN a risk metric is null (insufficient history)
    THEN UI shows "—" for that metric and must not invent a status band
- WHEN displaying risk badges
    THEN use human FR labels (Oscillations / Rendement / risque / Pire chute) + numeric value + status word + shared green/yellow/red legend once
- WHEN displaying concentration
    THEN show largest line as "label — top1%" + status word; Top 3% may appear as secondary detail
    Web: under the allocation donut. Mobile: text block on Dashboard (no donut required this increment)
- WHEN mobile price sync runs for non-manual assets
    THEN fetch and merge full historical series for coingecko, yahoo, investir, zonebourse (same sources as web), not spot-only
- FORBIDDEN showing HHI to the user; user-editable thresholds; risk-free rate ≠ 0 for Sharpe; mobile heatmap / benchmarks / asset filter as part of this increment; duplicating threshold logic outside @patrimo/core
- OPEN (do not implement): none
```

## Context

Dashboards expose allocation (web donut) and performance risk figures (volatility, Sharpe, max drawdown) as opaque numbers. Users cannot tell whether the portfolio is concentrated or whether a risk figure is comfortable. Mobile lacks historical price sync, so performance risk metrics cannot be computed reliably there. Root cause is missing shared status bands and a missing concentration metric, plus a mobile history gap — not bad workbook data.

Canonical terms: [glossary](../reference/glossary.md) (**Portfolio concentration**, **Risk status band**).

## Decision

- Add shared pure functions in `@patrimo/core` (dedicated module, e.g. `portfolio-risk.ts`) for concentration and risk status bands.
- Web: readable `RiskBadges` + one-line color legend; concentration under the allocation donut (largest asset name + Top 1% + status; Top 3 secondary).
- Mobile: upgrade price sync to historical merge for the four automatic sources; Dashboard shows concentration text block + the same readable risk badges when metrics resolve.
- Platforms only format and render; they must not redefine thresholds.

## Invariants

- Weight basis = asset-level `marketValue` share of total positive market value (donut-aligned).
- Threshold constants and status ids live only in `@patrimo/core`.
- Insufficient history → null metrics → "—" UI, no invented band.
- Sharpe keeps `riskFreeRate = 0` for this increment.

## Options considered

| Option | Status | Why |
|---|---|---|
| A — Shared core bands + web/mobile UI + mobile history sync | Retained | Fixes readability and parity; matches Phase 0 checklist |
| B — Add Top 1/Top 3 badges next to existing jargon RiskBadges only | Rejected | Leaves vol/Sharpe/drawdown opaque; weak mobile story |
| C — Web-only UI; keep mobile spot sync | Rejected | Contradicts chosen parity (Phase 0 Q5C + Q6A) |
| D — Put thresholds only in UI components | Rejected | Diverges platforms; violates shared-core principle |

## Consequences

**Positives**

- One testable contract for concentration and risk judgement.
- Mobile can compute the same performance risk metrics as web once history is synced.

**Negatives**

- Mobile sync becomes heavier (full history vs spot).
- Fixed thresholds are conventions, not personalized risk profiles.

**To monitor**

- Sync duration / failure rate on mobile after historical fetch.
- Users with very short history still see many "—" badges (expected).

## Uncovered cases

- HHI display
- Configurable thresholds / risk-free rate
- Mobile performance heatmap, benchmarks, asset filters
- Highlighting the largest donut slice graphically (text under donut is enough)

## Follow-up

None required to implement this ADR. Optional later: visual highlight on the largest donut slice.

## See also

- [Portfolio risk readability](../architecture/portfolio-risk-readability.md)
- [Implement portfolio risk readability](../howto/implement-portfolio-risk-readability.md)
- [Price sync pipeline](../architecture/price-sync-pipeline.md)
- [ADR 0005](0005-emergency-fund-health-indicator.md) — prior shared Dashboard indicator pattern
