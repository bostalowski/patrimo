# Implement portfolio risk readability

Ordered vertical scopes and test strategy for concentration and readable risk badges (web + mobile), including mobile historical price sync. Confirmed against shipped code on `feat/risk-readability-concentration`.

## Prerequisites

- Spec: [ADR 0006](../adr/0006-portfolio-risk-readability.md) (accepted)
- Branch: `feat/risk-readability-concentration`

## Increment plan

### Scope 1 — Core metrics (done)

Add `computeConcentration` and `assessRiskMetricStatus` in `@patrimo/core` (`portfolio-risk.ts`).

Tests: `src/lib/portfolio-risk.test.ts`.

### Scope 2 — Web Dashboard UX (done)

Concentration under the allocation donut; readable `RiskBadges` + color legend.

Tests: `src/components/portfolio-risk-ui.test.tsx`.

### Scope 3 — Mobile historical price sync (done)

`mobile/lib/price-sync.ts` merges full history for `coingecko`, `yahoo`, `investir`, `zonebourse`.

Tests: `mobile/lib/price-sync-history.test.ts`.

### Scope 4 — Mobile Dashboard UX (done)

Dashboard concentration card + risk card via `buildHistorySeries` + performance helpers + core bands.

Tests: `mobile/lib/portfolio-risk-ui.test.tsx`.

## Test strategy

| Level | What it proves |
|---|---|
| Core unit | Weight aggregation, Top 1/Top 3, status thresholds, null empty portfolio, null metric → no band |
| Web UI | Donut concentration block + badge labels/status/legend; hide when null |
| Mobile sync | Historical merge for automatic sources; manual skipped |
| Mobile UI | Concentration text + risk strip; "—" when metrics null |

## Commands

```bash
npm test -- src/lib/portfolio-risk.test.ts
npm test -- src/components/portfolio-risk-ui.test.tsx
npm test -- mobile/lib/price-sync-history.test.ts
npm test -- mobile/lib/portfolio-risk-ui.test.tsx
```

## See also

- [Portfolio risk readability](../architecture/portfolio-risk-readability.md)
- [ADR 0006](../adr/0006-portfolio-risk-readability.md)
- [Price sync pipeline](../architecture/price-sync-pipeline.md)
