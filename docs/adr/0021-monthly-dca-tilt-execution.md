# ADR 0021: Monthly DCA tilt feeds Exécution

- Status: accepted
- Date: 2026-08-24
- implementation_ready: yes
- Supersedes-in-part: [ADR 0015](0015-next-euro-plan.md) (P1 LIVRET steal; investment-only pool)

```text
Contract:

Monthly DCA tilt = read-only per-asset euro split for the investment DCA
  envelope this month, derived from diversification band drift.

buildMonthlyDcaTilt(input) → MonthlyDcaTilt | null
  null WHEN investment monthly pool === 0.

Pool: computeMonthlyInvestmentDcaPool (exclude LIVRET).

Verdicts:
  aligned      — stock bands in range; contributions = baseline DCA plan
  tilt         — pauses / capped band catch-up then residual DCA
  adjust_plan  — underweight band with no asset in DCA lines

Catch-up cap per band: min(gap/3, gap, pool×50%).

Executable universe: assetIds in investment DCA config lines only.

Exécution (web): computeDcaExecutionFromContributions when tilt active;
  toggle vs saved DCA plan. Share counts ONLY on Exécution.

Prochain euro card: verdict + summary + link /investissements?tab=execution.
  Title: Ajustement DCA du mois (internal code may still say “tilt”).
  No share counts on Dashboard / Diversification.

FORBIDDEN: workbook writes; P1 LIVRET pool steal; free-form budget pool.
```

## Context

Prochain euro (ADR 0015) and Exécution computed different euro splits. Users
could not pass from diversification advice to broker-ready share counts.

## Decision

Ship `buildMonthlyDcaTilt` in `@patrimo/core`. Refactor `buildNextEuroPlan` to
attach `tilt` and derive display steps. Wire web Exécution to consume tilt
contributions with an opt-out toggle.

## Consequences

- New modules `monthly-dca-tilt.ts`, `monthly-dca-tilt-copy.ts`.
- `computeDcaExecutionFromContributions` in `dca.ts`.
- Card title **Ajustement DCA du mois** (`NEXT_EURO_TITLE`); internal modules
  may still say “tilt”. Investment pool only (LIVRET excluded).

## See also

- [ADR 0012](0012-allocation-coherence.md)
- [ADR 0015](0015-next-euro-plan.md)
- [packages/core/next-euro-plan.md](../../packages/core/next-euro-plan.md)
