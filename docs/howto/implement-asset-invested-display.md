# Implement asset invested display

> 🚧 Anticipated mechanics (Phase 1.5 draft) — confirm after implementation. See [ADR 0003](../adr/0003-display-invested-on-asset-surfaces.md).

Ordered vertical scopes and test strategy for surfacing **Investi** (`costBasis`) on asset UIs.

## Prerequisites

- Spec locked: [ADR 0003](../adr/0003-display-invested-on-asset-surfaces.md)
- Branch: `feat/asset-invested-display`

## Increment plan

### Scope 1 — Web asset surfaces

1. Pass `costBasis` into list row data for `/actifs`.
2. Add sortable **Investi** column on the consolidated positions table (after PRU).
3. Add **Investi** KPI card on `/actifs/[id]` (after PRU).
4. Prove with UI tests that a position with known `costBasis` renders the euro amount, and that quantity `0` renders `0 €`.

**Exit:** web list + detail show Investi; targeted web tests green.

### Scope 2 — Mobile asset list

1. Show **Investi** on the mobile actifs summary line from `position.costBasis`.
2. Prove with a mobile UI test that the formatted amount appears for an open position and `0 €` when quantity is zero.

**Exit:** mobile list shows Investi; targeted mobile test green.

## Test strategy

| Level | What it proves |
|---|---|
| Web component (`@testing-library/react`) | List column and detail KPI render `costBasis` as **Investi** |
| Mobile UI (`react-test-renderer`) | Actifs list summary includes Investi for open and zero positions |
| Core portfolio | Not required — `costBasis` semantics unchanged |

Do not re-test PRU math. Assert presentation and wiring only.

## Commands

```bash
npm test -- src/app/actifs
npm test -- mobile/app/actifs
```

(Exact file paths follow the test files created in RED.)

## See also

- [Asset invested display](../architecture/asset-invested-display.md)
- [ADR 0003](../adr/0003-display-invested-on-asset-surfaces.md)
