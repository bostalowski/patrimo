# Allocation plan and coherence

How Patrimo lets the user form an **allocation plan** (target), optionally seeded
from DCA, edit it in-app, and check alignment of stock (and flows) against that
plan. Decision: [ADR 0012](../adr/0012-allocation-coherence.md).

## Intent

Give users who only “think in DCA” a path to a portfolio intent, then keep stock
and contributions honest against that intent — without punishing multi-asset
sleeves (e.g. two World ETFs).

## Flow

```text
DCA configs ──► suggestTargetPlanFromDca ──► UI suggestion (not persisted)
                                              │
User edits / accepts ──► validateTargetAllocations ──► workbook Allocation cible
                                              │
Positions + DCA + geo ──► assessAllocationCoherence ──► Dashboard card
                                              │
                                    link → Investissements editor
                                    link → /geographie when geo_coverage_gap
```

## Workbook sheet

Optional sheet `Allocation cible` (unchanged columns). Parse accepts header
`Actifs` or legacy `Actifs (séparés par virgule)`.

## Core

| Function | Role |
|---|---|
| `suggestTargetPlanFromDca(dca)` | Pure suggestion; see ADR contract |
| `validateTargetAllocations(targets, assets)` | Save gate |
| `assessAllocationCoherence(...)` | Status + findings (no `overlapping_sleeve`) |

Thresholds and bootstrap math live only in `@patrimo/core`. Platforms adapt I/O and UI only.

## Surfaces

| Surface | Role |
|---|---|
| Web Investissements — tab Allocation cible | Editor + « Proposer depuis DCA »; save via `PUT /api/target-allocation` |
| Mobile Investissements — tab Allocation | Same editor; save via `saveTargetAllocations` (serialize workbook) |
| Dashboard card (web + mobile) | Read-only status; « Modifier » → Investissements |

## Out of scope

- Sector look-through.
- Geographic **target** bands (coverage gap only).
- Top1 / HHI (ADR 0006).

## See also

- [ADR 0012](../adr/0012-allocation-coherence.md)
- [Implement allocation plan](../howto/implement-allocation-coherence.md)
- [Geographic allocation](geographic-allocation.md)
- [Excel workbook — Allocation cible](../reference/excel-workbook.md)
- [API — target-allocation](../reference/api-routes.md)
