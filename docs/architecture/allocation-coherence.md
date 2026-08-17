> **Provisional** — mechanics for bootstrap + in-app editor not yet confirmed in production code.
> Remove this banner after implementation ships (Phase 5).

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

## Surfaces

| Surface | Role |
|---|---|
| Investissements (web) + mobile equivalent | CRUD plan + bootstrap CTA |
| Dashboard card | Read-only status; « Modifier » → editor |

## Out of scope

- Sector look-through.
- Geographic **target** bands (coverage gap only).
- Top1 / HHI (ADR 0006).

## See also

- [ADR 0012](../adr/0012-allocation-coherence.md)
- [Implement allocation plan](../howto/implement-allocation-coherence.md)
- [Geographic allocation](geographic-allocation.md)
