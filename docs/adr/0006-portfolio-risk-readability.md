# ADR 0006: Portfolio risk readability

- Status: accepted
- Date: 2026-08-14
- implementation_ready: yes

```text
Contract (do not invent):
- WHEN annualizedVolatility / sharpeRatio / maxDrawdown are available (non-null)
    THEN map each to a risk status band with fixed product thresholds:
      volatility: < 0.10 → low; [0.10, 0.20] → moderate; > 0.20 → high
      sharpe: ≥ 1 → strong; [0.5, 1) → acceptable; < 0.5 → weak
      drawdown (value ≤ 0): > −0.10 → mild; [−0.20, −0.10] → marked; < −0.20 → severe
- WHEN a risk metric is null (insufficient history)
    THEN UI shows "—" for that metric and must not invent a status band
- WHEN displaying risk badges
    THEN use human FR labels (Oscillations / Rendement / risque / Pire chute) + numeric value + status word + shared green/yellow/red legend once
    Web: performance RiskBadges. Mobile: Dashboard risk card
- WHEN mobile price sync runs for non-manual assets
    THEN fetch and merge full historical series for coingecko, yahoo, investir, zonebourse (same sources as web), not spot-only
- FORBIDDEN portfolio concentration / Top 1–Top 3 / HHI UI; user-editable thresholds; risk-free rate ≠ 0 for Sharpe; mobile heatmap / benchmarks / asset filter as part of this increment; duplicating threshold logic outside @patrimo/core
- OPEN (do not implement): none
```

## Context

Performance risk figures (volatility, Sharpe, max drawdown) were shown as opaque numbers. Users could not tell whether a figure was comfortable. Mobile lacked historical price sync, so those metrics could not be computed reliably there. Root cause is missing shared status bands plus a mobile history gap — not bad workbook data.

Canonical term: [glossary](../reference/glossary.md) (**Risk status band**).

**Amendment (2026-08-14):** portfolio concentration (Top 1 / Top 3 / diversification status) was removed from product scope after review — allocation is already visible on the donut; the concentration badges were judged not useful.

## Decision

- Add shared pure functions in `@patrimo/core` (`portfolio-risk.ts`) for risk status bands only.
- Web: readable `RiskBadges` + one-line color legend.
- Mobile: upgrade price sync to historical merge for the four automatic sources; Dashboard shows the same readable risk badges when metrics resolve.
- Platforms only format and render; they must not redefine thresholds.
- Do not ship a concentration indicator.

## Invariants

- Threshold constants and status ids live only in `@patrimo/core`.
- Insufficient history → null metrics → "—" UI, no invented band.
- Sharpe keeps `riskFreeRate = 0` for this increment.

## Options considered

| Option | Status | Why |
|---|---|---|
| A — Shared core bands + web/mobile UI + mobile history sync (no concentration) | Retained | Fixes readability and parity without a redundant allocation badge |
| B — Also show Top 1 / Top 3 concentration under the donut | Rejected (post-ship review) | Duplicates what the donut already shows; judged not meaningful |
| C — Web-only UI; keep mobile spot sync | Rejected | Contradicts chosen parity |
| D — Put thresholds only in UI components | Rejected | Diverges platforms; violates shared-core principle |

## Consequences

**Positives**

- One testable contract for risk judgement.
- Mobile can compute the same performance risk metrics as web once history is synced.

**Negatives**

- Mobile sync becomes heavier (full history vs spot).
- Fixed thresholds are conventions, not personalized risk profiles.

**To monitor**

- Sync duration / failure rate on mobile after historical fetch.
- Users with very short history still see many "—" badges (expected).

## Uncovered cases

- Configurable thresholds / risk-free rate
- Mobile performance heatmap, benchmarks, asset filters
- Portfolio concentration indicators (explicitly out of scope)

## Follow-up

None.

## See also

- [Portfolio risk readability](../architecture/portfolio-risk-readability.md)
- [Implement portfolio risk readability](../howto/implement-portfolio-risk-readability.md)
- [Price sync pipeline](../architecture/price-sync-pipeline.md)
- [ADR 0005](0005-emergency-fund-health-indicator.md) — prior shared Dashboard indicator pattern
