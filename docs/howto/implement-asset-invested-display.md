# Implement asset invested display

Ordered vertical scopes and test strategy for surfacing **Investi** (`costBasis`). Confirmed against shipped code on `feat/asset-invested-display`.

## Prerequisites

- Spec: [ADR 0003](../adr/0003-display-invested-on-asset-surfaces.md) (accepted)
- Branch: `feat/asset-invested-display`

## Increment plan

### Scope 1 — Web asset surfaces (done)

List column + detail KPI. Tests: `src/app/actifs/actifs-invested.test.tsx`.

### Scope 2 — Mobile asset list (done)

Summary **Investi**. Tests: `mobile/lib/actifs-invested-ui.test.tsx`.

### Scope 3 — Web comptes active positions (done)

**Investi** after **PRU** in `ActiveAccountPositionsTable`. Closed table unchanged. Tests: `src/app/comptes/comptes-invested.test.tsx`.

### Scope 4 — Mobile comptes active positions (done)

Under each account card: label, quantity, **Investi**, market value. Tests: `mobile/lib/comptes-invested-ui.test.tsx`.

## Test strategy

| Level | What it proves |
|---|---|
| Web actifs | List + detail Investi |
| Mobile actifs | List Investi |
| Web comptes | Active table column Investi; closed table without Investi |
| Mobile comptes | Active position lines under account |
| Core portfolio | Not required |

## Commands

```bash
npm test -- src/app/actifs/actifs-invested.test.tsx
npm test -- mobile/lib/actifs-invested-ui
npm test -- src/app/comptes/comptes-invested.test.tsx
npm test -- mobile/lib/comptes-invested-ui
```

## See also

- [Asset invested display](../architecture/asset-invested-display.md)
- [ADR 0003](../adr/0003-display-invested-on-asset-surfaces.md)
