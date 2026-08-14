# Implement emergency fund health

Ordered vertical scopes and test strategy for the emergency fund health indicator. Confirmed against shipped code on `feat/emergency-fund-health`.

## Prerequisites

- Spec: [ADR 0005](../adr/0005-emergency-fund-health-indicator.md) (accepted)
- Branch: `feat/emergency-fund-health`

## Increment plan

### Scope 1 — Core metric (done)

Add `computeEmergencyFundHealth` and `sumLivretMarketValue` in `@patrimo/core`. Covers Phase 0 cases 1 (ratio), 2, 5, 6.

Tests: `src/lib/emergency-fund.test.ts`.

### Scope 2 — Web Dashboard card (done)

Wire workbook budget + livret totals on `src/app/page.tsx`; render/hide the card. Covers cases 1, 3, 5, 6 on web.

Tests: `src/components/emergency-fund-card.test.tsx`.

### Scope 3 — Mobile Dashboard card (done)

Same metric on `mobile/app/index.tsx`. Covers case 4 (parity) and the same hide/show rules.

Tests: `mobile/lib/emergency-fund-ui.test.tsx`.

## Test strategy

| Level | What it proves |
|---|---|
| Core unit | Threshold bands, null when expenses ≤ 0, zero livrets → insufficient, livret sum filter |
| Web UI | Card shows months + status + detail; hidden when null |
| Mobile UI | Same observable behavior as web |

## Commands

```bash
npm test -- src/lib/emergency-fund
npm test -- src/components/emergency-fund-card
npm test -- mobile/lib/emergency-fund-ui
```

## See also

- [Emergency fund health](../architecture/emergency-fund-health.md)
- [ADR 0005](../adr/0005-emergency-fund-health-indicator.md)
