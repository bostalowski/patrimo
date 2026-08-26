# Next-euro plan

Read-only monthly **investment DCA tilt** (ADR 0021): verdict + per-asset euros
that feed Exécution (opt-in). Emergency-fund LIVRET advice remains **outside** this
envelope ([ADR 0020](../../docs/adr/0020-emergency-fund-surplus-recommendation.md)).
Dashboard monthly surface is DCA-first **« Ce mois-ci »**
([ADR 0022](../../docs/adr/0022-dca-first-monthly-card.md)), not the tilt card.
Original decision: [ADR 0015](../../docs/adr/0015-next-euro-plan.md)
(P1 pool steal superseded).

## Intent

Core tilt answers “should I deviate from my saved investment DCA this month?”
without mutating the workbook. Share counts live only on **Exécution**
(`computeDcaExecutionFromContributions`), behind an opt-in toggle (default off).
Dashboard reminds the user to follow the **saved** plan, surfaces EF surplus
advice when relevant, and pings stock `band_drift` **breach** only.

UI copy (FR): `this-month-copy.ts` (Dashboard), `monthly-dca-tilt-copy.ts` +
`next-euro-copy.ts` (tilt / Exécution). Card title **Ce mois-ci** on Dashboard;
tilt title **Ajustement DCA du mois** is no longer mounted on Dashboard /
Diversification.

## Flow

```text
DCA configs (investment) + positions + diversification targets
        │
        ▼
buildMonthlyDcaTilt ──► tilt.contributions (€/actif)
        │                      │
buildNextEuroPlan ─────────────┘──► Dashboard ThisMonthCard
        │                           (EF banner + saved DCA + breach alert)
        │                           └──► Investissements / Exécution (parts, tilt opt-in)
        └─ computeEmergencyFundSurplusRecommendation (attached, not in steps)
```

## Core

| Function | Role |
|---|---|
| `buildMonthlyDcaTilt(input)` | Verdict + contributions; null when no investment pool |
| `buildNextEuroPlan(input)` | Wraps tilt + display steps + EF surplus attach |
| `computeDcaExecutionFromContributions` | Broker-ready lines from tilt |
| `computeEmergencyFundSurplusRecommendation` | Attached LIVRET advice (ADR 0020) |
| `stockBandDriftBreachKeys` / `this-month-copy` | Dashboard breach alert (ADR 0022) |

Hide when investment `monthlyPool === 0` (EF gap alone does not show this card).

## Platforms

| Surface | Status |
|---|---|
| Web Dashboard | « Ce mois-ci » (EF + saved DCA + breach alert) |
| Web Diversification | no Next-euro / Ajustement DCA card; coherence remains |
| Web Investissements / Exécution | saved DCA default; tilt opt-in |
| Mobile | absent (Next-euro + capacity UI unmounted; core ready) |

## See also

- [ADR 0022](../../docs/adr/0022-dca-first-monthly-card.md)
- [ADR 0021](../../docs/adr/0021-monthly-dca-tilt-execution.md)
- [ADR 0020](../../docs/adr/0020-emergency-fund-surplus-recommendation.md)
- [ADR 0015](../../docs/adr/0015-next-euro-plan.md)
- [monthly-dca-tilt.ts](../src/monthly-dca-tilt.ts)
- [this-month-copy.ts](../src/this-month-copy.ts)
