# Savings capacity

How Dashboards (and web DCA / Projection soft warnings) surface investable
surplus after budget cashflow and emergency-fund outflow, versus planned
investment DCA — with a separate alert when LIVRET DCA exceeds catch-up need,
and surplus-based LIVRET catch-up advice when the configured target has a gap
([ADR 0020](../../docs/adr/0020-emergency-fund-surplus-recommendation.md)).

## Intent

Users see how much they can actually invest each month after expenses and a
path to their configured emergency-fund target (implied need and/or real
LIVRET DCA), and whether current **investment** DCA overshoots that capacity —
without auto-resizing plans. Over-funding LIVRET vs the implied need is a
distinct soft alert. When the target gap still needs extra LIVRET (oneshot or
monthly à ajouter), core attaches the same surplus recommendation shown on
Next-euro’s banner.

UI copy (FR) lives in `savings-capacity-copy.ts`: each surface states the
**question**, the **surplus / status**, an explicit **À faire** recommendation,
optional EF surplus / LIVRET over lines, then supporting numbers.

## Flow

```text
Workbook
   |
   +--> summarizeBudget → revenusMensuels, depensesMensuelles
   +--> buildPortfolio → sumLivretMarketValue(accounts)
   +--> workbook.dca  (split LIVRET vs investment)
   +--> workbook.emergencyFundConfig
   |
   v
computeSavingsCapacity({ revenus, depenses, livret, dca, emergencyFundConfig })
   |
   +--> null  → hide card / no soft warning
   +--> {
         rawSavings,
         need = monthlyEmergencyReserve,
         plannedLivretDcaMonthly,
         plannedInvestmentDcaMonthly (= plannedDcaMonthly),
         emergencyMonthlyOutflow = max(need, plannedLivret),
         investableSurplus,
         gap, status,                          // investment vs surplus
         emergencyOverContributing,            // plannedLivret > need
         emergencyOverContribution,
         emergencyFundRecommendation           // ADR 0020 surplus advice
       }
         → Dashboard card
         → web soft warning when status === over_committed
         → web soft warning when emergencyOverContributing (DCA page)
```

## Surfaces

| Surface | Placement | Notes |
|---|---|---|
| Web Dashboard (`src/app/page.tsx`) | Card beside emergency fund | `src/components/savings-capacity-card.tsx` |
| Mobile Dashboard (`mobile/app/index.tsx`) | Card under emergency fund | `mobile/lib/savings-capacity-card.tsx` |
| Web Investissements / DCA | Soft banner when investment over-committed | `SavingsCapacityOverCommitBanner` |
| Web Investissements / DCA | Soft banner when LIVRET over-contributes | `SavingsCapacityEmergencyOverBanner` |
| Web Projection | Soft banner when investment over-committed | same over-commit banner |

## Status bands (investment DCA only)

| Condition | Status id | UI label (FR) |
|---|---|---|
| `plannedInvestment = 0` and surplus ≥ 0 | `comfortable` | À l'aise |
| `plannedInvestment ≤ 0.8 × surplus` and surplus ≥ 0 | `comfortable` | À l'aise |
| `plannedInvestment ≤ surplus` | `tight` | Serré |
| `plannedInvestment > surplus` | `over_committed` | Surengagé |

## Invariants

Governed by [ADR 0017](../../docs/adr/0017-savings-capacity-bridge.md),
[ADR 0018](../../docs/adr/0018-configurable-emergency-fund-target.md),
[ADR 0019](../../docs/adr/0019-livret-dca-savings-capacity.md), and
[ADR 0020](../../docs/adr/0020-emergency-fund-surplus-recommendation.md).

## Out of scope

- Auto-resize / rewrite of DCA or budget `EPARGNE`
- Mobile DCA / Projection soft warnings
- Next-euro DCA step reallocation (EF advice is attached, not a pool steal)

## See also

- [ADR 0017](../../docs/adr/0017-savings-capacity-bridge.md)
- [ADR 0018](../../docs/adr/0018-configurable-emergency-fund-target.md)
- [ADR 0019](../../docs/adr/0019-livret-dca-savings-capacity.md)
- [ADR 0020](../../docs/adr/0020-emergency-fund-surplus-recommendation.md)
- [Emergency fund](emergency-fund.md)
- [Next-euro plan](next-euro-plan.md)
