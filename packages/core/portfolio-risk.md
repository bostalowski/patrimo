# Portfolio risk readability

How Dashboards surface human-readable performance risk status.

## Intent

Users see whether volatility / Sharpe / drawdown are comfortable, without reading jargon-only figures. Web and mobile share the same judgements.

## Flow

```text
DailyPoint history (TWR)
        |
        +--> annualizedVolatility / sharpeRatio / maxDrawdown  (existing @patrimo/core)
        |
        v
assessRiskMetricStatus(kind, value) --> null | status
        |  (@patrimo/core/portfolio-risk)
        +--> Web RiskBadges + legend
        +--> Mobile risk card (when history sufficient)
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

| Surface | Risk badges |
|---|---|
| Web Dashboard | Performance `RiskBadges` in `returns-heatmap.tsx` |
| Mobile Dashboard | Risk card (`mobile/lib/risk-badges.tsx`) |

## Status bands

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

Governed by [ADR 0006](../../docs/adr/0006-portfolio-risk-readability.md).

## Out of scope

- Portfolio concentration / Top 1–Top 3 / HHI
- User-editable thresholds / non-zero risk-free rate
- Mobile heatmap, benchmarks, asset performance filters

## See also

- [ADR 0006](../../docs/adr/0006-portfolio-risk-readability.md)
- [Implement portfolio risk readability](../../docs/howto/implement-portfolio-risk-readability.md)
- [Price sync pipeline](../../src/price-sync.md)
- [Emergency fund health](emergency-fund.md) — prior Dashboard indicator pattern
