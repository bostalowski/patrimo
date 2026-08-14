# Portfolio risk readability

How Dashboards surface portfolio concentration and human-readable performance risk status.

## Intent

Users see whether the portfolio is concentrated and whether volatility / Sharpe / drawdown are comfortable, without reading jargon-only figures. Web and mobile share the same judgements.

## Flow

```text
Portfolio positions (marketValue > 0)
        |
        v
computeConcentration(...)  --> null | { top1Label, top1Weight, top3Weight, status }
        |  (@patrimo/core/portfolio-risk)
        +--> Web: under AllocationDonut
        +--> Mobile: Dashboard text block

DailyPoint history (TWR)
        |
        +--> annualizedVolatility / sharpeRatio / maxDrawdown  (existing @patrimo/core)
        |
        v
assessRiskMetricStatus(kind, value) --> null | { status, ... }
        |
        +--> Web RiskBadges + legend
        +--> Mobile risk strip (when history sufficient)
```

Mobile history prerequisite:

```text
syncPrices (mobile) — non-manual assets
        |
        v
fetch full history (coingecko | yahoo | investir | zonebourse)
        |
        v
merge into AsyncStorage PriceStore  --> buildHistorySeries --> risk metrics
```

## Surfaces

| Surface | Concentration | Risk badges |
|---|---|---|
| Web Dashboard | Under allocation donut (`src/components/concentration-summary.tsx`) | Performance `RiskBadges` in `returns-heatmap.tsx` |
| Mobile Dashboard | Text card (`mobile/lib/concentration-summary.tsx`) | Risk card (`mobile/lib/risk-badges.tsx`) |

## Status bands

### Concentration (from Top 1 weight)

| Top 1 weight | Status id | UI label (FR) |
|---|---|---|
| &lt; 30 % | `diversified` | Diversifié |
| [30 %, 50 %) | `balanced` | Équilibré |
| ≥ 50 % | `concentrated` | Concentré |

### Volatility (annualized)

| Value | Status id | UI label (FR) |
|---|---|---|
| &lt; 10 % | `low` | faibles |
| [10 %, 20 %] | `moderate` | normales |
| &gt; 20 % | `high` | élevées |

### Sharpe

| Value | Status id | UI label (FR) |
|---|---|---|
| ≥ 1 | `strong` | bon |
| [0.5, 1) | `acceptable` | correct |
| &lt; 0.5 | `weak` | faible |

### Max drawdown

| Value | Status id | UI label (FR) |
|---|---|---|
| &gt; −10 % | `mild` | légère |
| [−20 %, −10 %] | `marked` | marquée |
| &lt; −20 % | `severe` | sévère |

Metric badge titles (FR): **Oscillations**, **Rendement / risque**, **Pire chute**.

Shared legend (once per surface): vert = confortable · jaune = à surveiller · rouge = élevé.

## Invariants

Governed by [ADR 0006](../adr/0006-portfolio-risk-readability.md).

## Out of scope

- HHI in the UI
- User-editable thresholds / non-zero risk-free rate
- Mobile heatmap, benchmarks, asset performance filters
- Graphical highlight of the largest donut slice

## See also

- [ADR 0006](../adr/0006-portfolio-risk-readability.md)
- [Implement portfolio risk readability](../howto/implement-portfolio-risk-readability.md)
- [Price sync pipeline](price-sync-pipeline.md)
- [Emergency fund health](emergency-fund-health.md) — prior Dashboard indicator pattern
