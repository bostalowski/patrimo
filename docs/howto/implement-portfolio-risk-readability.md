# Implement portfolio risk readability

Ordered vertical scopes and test strategy for readable risk badges (web + mobile), including mobile historical price sync. Confirmed on `feat/risk-readability-concentration` (concentration UI later removed).

## Prerequisites

- Spec: [ADR 0006](../adr/0006-portfolio-risk-readability.md) (accepted)
- Branch: `feat/risk-readability-concentration`

## Increment plan

### Scope 1 — Core risk bands (done)

`assessRiskMetricStatus` in `@patrimo/core` (`portfolio-risk.ts`).

Tests: `src/lib/portfolio-risk.test.ts`.

### Scope 2 — Web Dashboard UX (done)

Readable `RiskBadges` + color legend.

Tests: `src/components/portfolio-risk-ui.test.tsx`.

### Scope 3 — Mobile historical price sync (done)

`mobile/lib/price-sync.ts` merges full history for `coingecko`, `yahoo`, `investir`, `zonebourse`.

Tests: `mobile/lib/price-sync-history.test.ts`.

### Scope 4 — Mobile Dashboard UX (done)

Dashboard risk card via `buildHistorySeries` + performance helpers + core bands.

Tests: `mobile/lib/portfolio-risk-ui.test.tsx`.

## Test strategy

| Level | What it proves |
|---|---|
| Core unit | Status thresholds; null metric → no band |
| Web UI | Badge labels/status/legend; "—" when null |
| Mobile sync | Historical merge for automatic sources; manual skipped |
| Mobile UI | Risk strip; "—" when metrics null |

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
