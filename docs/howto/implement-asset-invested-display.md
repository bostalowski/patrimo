# Implement asset invested display

> 🚧 Anticipated mechanics for account scopes (Phase 1.5 draft) — scopes 1–2 already green on the branch; scopes 3–4 pending. See [ADR 0003](../adr/0003-display-invested-on-asset-surfaces.md).

Ordered vertical scopes and test strategy for surfacing **Investi** (`costBasis`).

## Prerequisites

- Spec: [ADR 0003](../adr/0003-display-invested-on-asset-surfaces.md) (proposed on branch until merge)
- Branch: `feat/asset-invested-display`

## Increment plan

### Scope 1 — Web asset surfaces (done)

List column + detail KPI. Tests: `src/app/actifs/actifs-invested.test.tsx`.

### Scope 2 — Mobile asset list (done)

Summary **Investi**. Tests: `mobile/lib/actifs-invested-ui.test.tsx`.

### Scope 3 — Web comptes active positions

1. Extract or render an active-positions table with **Investi** after **PRU**.
2. Prove a row with known `costBasis` shows the euro amount.
3. Do not add **Investi** to closed-positions table.

**Exit:** web comptes active table shows Investi; targeted test green.

### Scope 4 — Mobile comptes active positions

1. Under each account card, list positions with `quantity > 0`.
2. Each line: asset label, quantity, **Investi**, market value when priced.
3. Account with no active positions: no position list (header Investi unchanged).

**Exit:** mobile comptes shows active lines with Investi; targeted test green.

## Test strategy

| Level | What it proves |
|---|---|
| Web actifs (existing) | List + detail Investi |
| Mobile actifs (existing) | List Investi |
| Web comptes component | Active table column Investi; closed table unchanged |
| Mobile comptes UI | Active position lines under account; Investi visible |
| Core portfolio | Not required |

## Commands

```bash
npm test -- src/app/actifs/actifs-invested.test.tsx
npm test -- mobile/lib/actifs-invested-ui.test.tsx
npm test -- src/app/comptes
npm test -- mobile/lib/comptes-invested-ui.test.tsx
```

(Exact comptes file paths follow RED.)

## See also

- [Asset invested display](../architecture/asset-invested-display.md)
- [ADR 0003](../adr/0003-display-invested-on-asset-surfaces.md)
