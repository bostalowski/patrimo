# Implement financial goals

How to extend or debug Objectifs (workbook sheet + assessment). Decision:
[ADR 0014](../adr/0014-financial-goals.md). Architecture:
[Financial goals](../architecture/financial-goals.md).

## Persist a goal collection

1. Validate with `validateFinancialGoals` from `@patrimo/core/financial-goals`.
2. Write via web `PUT /api/goals` → `replaceWorkbook({ ...workbook, financialGoals })`.
3. Mobile: mutate `workbook.financialGoals` then `serializeWorkbook` (no UI in V1).

## Stock gap (Objectifs / Dashboard)

```ts
assessFinancialGoals({
  goals,
  portfolio,
  dcaConfigs,
  profile,
  inflationRate,
});
```

Use `progressCurrent` / `sumRequiredToday` / `liquidMarketValue` only in those
UIs. Do not show trajectory badges there.

## Alignment (Projection)

Do not add a second rate/scenario editor. Pass goals + retirement profile into
`EnvelopeProjection` as `goalsAlignment`. The panel calls
`projectRealCapacity(horizonYears)` built from the same per-envelope rates,
monthly/extra streams, inflation, and PER sandbox already on the page, then
`trajectoryStatus(projectedReal, requiredToday)`. Show **Besoin** as
`requiredAtHorizon` (respects `inflationIncluded`). Use
`resolveGoalCapitalNeeds` (or assessment fields) — do not re-inflate in the UI.

## Surfaces

| Path | Role |
|---|---|
| `/objectifs` | Editor + stock-gap assessment |
| Dashboard | `GoalsSummaryCard` (gap) when goals exist |
| `/projection` | `GoalsAlignmentPanel` read-only when goals exist |

## See also

- [Excel workbook](../reference/excel-workbook.md)
- [API routes](../reference/api-routes.md)
- [Platforms](../overview/platforms.md)
