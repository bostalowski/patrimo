# Next-euro plan

Read-only ranked buy / hold / pause steps for the existing monthly DCA
envelope (diversification catch-up + residual DCA). Emergency-fund LIVRET
advice is **outside** this envelope — see
[ADR 0020](../../docs/adr/0020-emergency-fund-surplus-recommendation.md).
Original decision: [ADR 0015](../../docs/adr/0015-next-euro-plan.md)
(P1 pool steal superseded).

## Intent

Answer “where should the next DCA euro go?” without mutating the workbook:
underweight diversification bands, then residual DCA; pause overweight-band
assets. A separate surplus-based LIVRET banner may appear above the step list
when the configured emergency-fund target has a gap.

UI copy (FR) lives in `next-euro-copy.ts`: the card states the **question**,
an optional **EF banner** (hors enveloppe DCA), a **Ce mois-ci** lead from the
primary DCA step, then the ordered step list.

## Flow

```text
DCA configs + positions + targets + budget / EF config
        │
        ▼
buildNextEuroPlan ──► Dashboard (top 3) / Diversification (full list)
        │                 + emergencyFundRecommendation banner
        └─ computeEmergencyFundSurplusRecommendation (attached, not in steps)
```

No API route: same server-render pattern as allocation coherence.

## Core

| Function | Role |
|---|---|
| `computeMonthlyDcaPool(dca)` | Σ annualize / 12 |
| `buildNextEuroPlan(input)` | Ranked steps or `null` when `monthlyPool ≤ 0` |
| `contributionToKey` (coherence) | Look-through weight for band routing |
| `computeEmergencyFundSurplusRecommendation` | Attached LIVRET advice (ADR 0020) |

Hide when `monthlyPool === 0` (EF gap alone does not show this card).

## Platforms

| Surface | Status |
|---|---|
| Web / Electron Dashboard + Diversification | done |
| Mobile | absent (capacity card shows EF surplus copy) |
