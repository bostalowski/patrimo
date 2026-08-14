# Emergency fund health

How Dashboards surface months of expense coverage from livret balances and budget expenses.

## Intent

Users see whether their livret reserve covers enough months of spending, without opening Budget and Accounts separately.

## Flow

```text
Workbook
   |
   +--> buildPortfolio → sumLivretMarketValue(accounts)
   +--> summarizeBudget → depensesMensuelles
   |
   v
computeEmergencyFundHealth(livretBalance, monthlyExpenses)
   |
   +--> null  → hide card
   +--> { coverageMonths, status, ... } → Dashboard card
```

## Surfaces

| Surface | Placement | Notes |
|---|---|---|
| Web Dashboard (`src/app/page.tsx`) | Card under net-worth KPI grid | `src/components/emergency-fund-card.tsx` |
| Mobile Dashboard (`mobile/app/index.tsx`) | Card under StatCard rows, before envelope breakdown | `mobile/lib/emergency-fund-card.tsx` |

## Status bands

| Coverage months | Status id | UI label (FR) |
|---|---|---|
| &lt; 3 | `insufficient` | Insuffisant |
| [3, 6) | `acceptable` | Acceptable |
| [6, 12) | `healthy` | Sain |
| ≥ 12 | `over_allocated` | Surdimensionné |

## Invariants

Governed by [ADR 0005](../adr/0005-emergency-fund-health-indicator.md).

## Out of scope

- Livret A vs LDDS split
- Editable targets
- Dedicated page / history / alerts

## See also

- [ADR 0005](../adr/0005-emergency-fund-health-indicator.md)
- [Implement emergency fund health](../howto/implement-emergency-fund-health.md)
- [Platforms](../overview/platforms.md)
