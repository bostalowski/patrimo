# Savings capacity

How Dashboards (and web DCA / Projection soft warnings) surface investable
surplus after budget cashflow and emergency-fund catch-up, versus planned DCA.

## Intent

Users see how much they can actually invest each month after expenses and a
path to a 6-month emergency fund, and whether current DCA overshoots that
capacity — without auto-resizing plans.

## Flow

```text
Workbook
   |
   +--> summarizeBudget → revenusMensuels, depensesMensuelles
   +--> buildPortfolio → sumLivretMarketValue(accounts)
   +--> workbook.dca
   |
   v
computeSavingsCapacity({ revenus, depenses, livret, dca })
   |
   +--> null  → hide card / no soft warning
   +--> { rawSavings, reserve, surplus, planned, gap, status }
         → Dashboard card
         → web soft warning when status === over_committed
```

## Surfaces

| Surface | Placement | Notes |
|---|---|---|
| Web Dashboard (`src/app/page.tsx`) | Card beside emergency fund | `src/components/savings-capacity-card.tsx` |
| Mobile Dashboard (`mobile/app/index.tsx`) | Card under emergency fund | `mobile/lib/savings-capacity-card.tsx` |
| Web Investissements / DCA | Soft banner when over-committed | `SavingsCapacityOverCommitBanner` |
| Web Projection | Soft banner when over-committed | same banner |

## Status bands

| Condition | Status id | UI label (FR) |
|---|---|---|
| `planned = 0` and surplus ≥ 0 | `comfortable` | À l'aise |
| `planned ≤ 0.8 × surplus` and surplus ≥ 0 | `comfortable` | À l'aise |
| `planned ≤ surplus` | `tight` | Serré |
| `planned > surplus` | `over_committed` | Surengagé |

## Invariants

Governed by [ADR 0017](../../docs/adr/0017-savings-capacity-bridge.md).

## Out of scope

- Auto-resize / rewrite of DCA or budget `EPARGNE`
- Editable EF target / catch-up horizon
- Mobile DCA / Projection soft warnings
- Changing next-euro pool source (ADR 0015)

## See also

- [ADR 0017](../../docs/adr/0017-savings-capacity-bridge.md)
- [Emergency fund](emergency-fund.md)
- [Next-euro plan](next-euro-plan.md)
