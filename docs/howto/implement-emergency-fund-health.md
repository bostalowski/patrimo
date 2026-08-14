# Implement emergency fund health

> 🚧 Anticipated mechanics (Phase 1.5 draft) — confirm after implementation. See [ADR 0005](../adr/0005-emergency-fund-health-indicator.md).

Ordered vertical scopes and test strategy for the emergency fund health indicator.

## Prerequisites

- Spec: [ADR 0005](../adr/0005-emergency-fund-health-indicator.md) (`proposed` until Phase 5)
- Branch: `feat/emergency-fund-health`

## Increment plan

### Scope 1 — Core metric

Add `computeEmergencyFundHealth` in `@patrimo/core`. Covers Phase 0 cases 1 (ratio), 2, 5, 6.

Tests: `src/lib/emergency-fund.test.ts`.

### Scope 2 — Web Dashboard card

Wire workbook budget + LIVRET totals on `src/app/page.tsx`; render/hide the card. Covers cases 1, 3, 5, 6 on web.

Tests: presentation helper or focused UI test under `src/` (avoid full Server Component e2e).

### Scope 3 — Mobile Dashboard card

Same metric on `mobile/app/index.tsx`. Covers case 4 (parity) and the same hide/show rules.

Tests: `mobile/lib/emergency-fund-ui.test.tsx` (or equivalent).

## Test strategy

| Level | What it proves |
|---|---|
| Core unit | Threshold bands, null when expenses ≤ 0, zero livrets → insufficient |
| Web UI | Card shows months + status + detail; hidden when null |
| Mobile UI | Same observable behavior as web |

## Commands

```bash
npm test -- src/lib/emergency-fund
npm test -- mobile/lib/emergency-fund
```

## See also

- [Emergency fund health](../architecture/emergency-fund-health.md)
- [ADR 0005](../adr/0005-emergency-fund-health-indicator.md)
