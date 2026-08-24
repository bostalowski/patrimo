# Next-euro plan

Read-only ranked buy / hold / pause steps that reallocate the existing monthly
DCA envelope. Decision: [ADR 0015](../../docs/adr/0015-next-euro-plan.md).

## Intent

Answer “where should the next euro go?” without mutating the workbook: emergency
fund first, then underweight diversification bands, then residual DCA; pause
overweight-band assets.

UI copy (FR) lives in `next-euro-copy.ts`: the card states the **question**, a
**Ce mois-ci** lead from the primary step, then the ordered step list.

## Flow

```text
DCA configs + positions + targets + livret / expenses
        │
        ▼
buildNextEuroPlan ──► Dashboard (top 3) / Diversification (full list)
```

No API route: same server-render pattern as allocation coherence.

## Core

| Function | Role |
|---|---|
| `computeMonthlyDcaPool(dca)` | Σ annualize / 12 |
| `buildNextEuroPlan(input)` | Ranked steps or `null` (hide card) |
| `contributionToKey` (coherence) | Look-through weight for band routing |

Hide when `monthlyPool === 0` and emergency fund is not `insufficient`.

## Platforms

| Surface | Status |
|---|---|
| Web / Electron Dashboard + Diversification | done |
| Mobile | absent (same core API later) |
