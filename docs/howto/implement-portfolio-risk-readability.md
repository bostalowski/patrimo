# Implement portfolio risk readability

> 🚧 Anticipated mechanics (Phase 1.5 draft) — confirm after implementation. See [ADR 0006](../adr/0006-portfolio-risk-readability.md).

Ordered vertical scopes and test strategy for concentration and readable risk badges (web + mobile), including mobile historical price sync.

## Prerequisites

- Spec: [ADR 0006](../adr/0006-portfolio-risk-readability.md) (`proposed` until Phase 5)
- Branch: `feat/risk-readability-concentration`

## Increment plan

### Scope 1 — Core metrics

Add `@patrimo/core` helpers for concentration and risk status bands (thresholds + status ids). Covers Phase 0 cases 5, 6, 8 (computation) and the shared rules for case 7 (null metrics).

Tests: unit file under `packages/core` or `src/lib/` mirroring emergency-fund pattern.

### Scope 2 — Web Dashboard UX

Wire concentration under the allocation donut; rewrite `RiskBadges` with human labels, status colors, and a one-line legend. Covers Phase 0 cases 1, 2, 6, 7, 8 on web.

### Scope 3 — Mobile historical price sync

Upgrade `mobile/lib/price-sync.ts` to fetch and merge full history for `coingecko`, `yahoo`, `investir`, `zonebourse` (same sources as web). Prerequisite for Phase 0 case 4.

### Scope 4 — Mobile Dashboard UX

Dashboard concentration text block + readable risk strip using `buildHistorySeries` + existing performance helpers + Scope 1 bands. Covers Phase 0 cases 3, 4, 6, 7, 8 on mobile.

## Test strategy

| Level | What it proves |
|---|---|
| Core unit | Weight aggregation, Top 1/Top 3, status thresholds, null empty portfolio, null metric → no band |
| Web UI | Donut concentration block + badge labels/status/legend; hide when null |
| Mobile sync | Historical merge for automatic sources (not spot-only); manual skipped |
| Mobile UI | Concentration text + risk strip; "—" when metrics null |

## Commands (expected)

```bash
npm test -- portfolio-risk
npm test -- returns-heatmap
npm test -- allocation
npm test -- price-sync
npm test -- mobile
```

Exact paths are set when tests are written in Phase 2.

## See also

- [Portfolio risk readability](../architecture/portfolio-risk-readability.md)
- [ADR 0006](../adr/0006-portfolio-risk-readability.md)
- [Price sync pipeline](../architecture/price-sync-pipeline.md)
