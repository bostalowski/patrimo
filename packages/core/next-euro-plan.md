# Next-euro plan

Read-only monthly **investment DCA tilt** (ADR 0021): verdict + per-asset euros
that feed Exécution. Emergency-fund LIVRET advice remains **outside** this
envelope ([ADR 0020](../../docs/adr/0020-emergency-fund-surplus-recommendation.md)).
Original decision: [ADR 0015](../../docs/adr/0015-next-euro-plan.md)
(P1 pool steal superseded).

## Intent

Answer “should I deviate from my saved investment DCA this month?” without
mutating the workbook. Share counts live only on **Exécution**
(`computeDcaExecutionFromContributions`). A separate surplus-based LIVRET
banner may appear above the tilt summary when the configured emergency-fund
target has a gap.

UI copy (FR): `monthly-dca-tilt-copy.ts` + `next-euro-copy.ts`. Card title
**Ajustement DCA du mois** (internal code may still say “tilt”).

## Flow

```text
DCA configs (investment) + positions + diversification targets
        │
        ▼
buildMonthlyDcaTilt ──► tilt.contributions (€/actif)
        │                      │
buildNextEuroPlan ─────────────┘──► Dashboard / Diversification (verdict)
        │                           + emergencyFundRecommendation banner
        │                           └──► Investissements / Exécution (parts)
        └─ computeEmergencyFundSurplusRecommendation (attached, not in steps)
```

## Core

| Function | Role |
|---|---|
| `buildMonthlyDcaTilt(input)` | Verdict + contributions; null when no investment pool |
| `buildNextEuroPlan(input)` | Wraps tilt + display steps + EF surplus attach |
| `computeDcaExecutionFromContributions` | Broker-ready lines from tilt |
| `computeEmergencyFundSurplusRecommendation` | Attached LIVRET advice (ADR 0020) |

Hide when investment `monthlyPool === 0` (EF gap alone does not show this card).

## Platforms

| Surface | Status |
|---|---|
| Web Dashboard + Diversification | verdict card + EF banner |
| Web Investissements / Exécution | tilt toggle + orders |
| Mobile | absent (capacity card shows EF surplus copy) |

## See also

- [ADR 0021](../../docs/adr/0021-monthly-dca-tilt-execution.md)
- [ADR 0020](../../docs/adr/0020-emergency-fund-surplus-recommendation.md)
- [ADR 0015](../../docs/adr/0015-next-euro-plan.md)
- [monthly-dca-tilt.ts](../src/monthly-dca-tilt.ts)
