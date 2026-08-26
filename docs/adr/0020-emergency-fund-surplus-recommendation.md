# ADR 0020: Emergency-fund surplus recommendation (keep investment DCA)

- Status: accepted (superseded-in-part by [ADR 0022](0022-dca-first-monthly-card.md) for EF banner UI host)
- Date: 2026-08-24
- implementation_ready: yes

```text
Contract (do not invent):

EF surplus recommendation = read-only LIVRET advice toward the configured
  emergency-fund target (Fonds urgence / ADR 0018), WITHOUT reallocating
  investment DCA.

Cash available for LIVRET extra / oneshot:
  max(0, rawSavings − plannedInvestmentDcaMonthly)
  where rawSavings = revenusMensuels − depensesMensuelles.

Gap: max(0, effectiveTargetEuro − livretBalance).
  WHEN target euro undefined → recommendation null (hide).

Modes:
  oneshot WHEN gap ≤ availableCash → amountToAdd = gap (deposit now).
  monthly ELSE:
    monthlyNeed = gap / catchUpHorizonMonths
    amountToAdd = min(availableCash, max(0, monthlyNeed − plannedLivretDcaMonthly))
    WHEN amountToAdd = 0 → mode none (no « mets plus »).
  none WHEN gap = 0 OR livret DCA already covers monthly need.

Next-euro (ADR 0015 P1 superseded):
  REMOVE pool steal to LIVRET (min(pool, 3×expenses − livret)).
  Remaining pool is investment-oriented only (band catch-up + residual DCA).
  Attach the same surplus recommendation as a banner ABOVE the DCA step list
  (hors enveloppe DCA). Hide Next-euro WHEN monthlyPool = 0.

UI: Next-euro EF banner above DCA steps (web). Savings capacity card / soft
  banners hidden (2026-08 follow-up on this branch); core + FR copy helpers
  retained for the banner and future surfaces. Mobile Next-euro still absent.
FORBIDDEN: workbook writes; auto-resize DCA; changing ADR 0005 health bands;
  mobile Next-euro UI.
```

## Context

ADR 0015 P1 stole monthly DCA euros toward a fixed 3-month LIVRET fill. That
conflicted with configured EF targets (ADR 0018), ignored existing LIVRET DCA,
and redirected investment plans (e.g. MSCI) into cash. Users want advisory
surplus math that protects investment DCA and aims at their personal target.

## Decision

- Add `computeEmergencyFundSurplusRecommendation` in `@patrimo/core`.
- Attach the result to `computeSavingsCapacity` and `buildNextEuroPlan`.
- Remove next-euro emergency_fund step / pool steal; surface surplus copy as a
  distinct banner above DCA steps.
- Keep ADR 0005 health bands and ADR 0018 config sheet unchanged.

## Invariants

1. Investment DCA is never reduced or reallocated by this recommendation.
2. Domain math + FR recommendation strings live in `@patrimo/core`.
3. Advice is read-only (no workbook mutation).
4. Same euros wherever surfaced (shared copy helpers). Live web surface is the
   Next-euro EF banner; capacity UI is hidden but core recommendation remains.

## Options considered

### Option A — Keep P1 pool steal to 3 months (status quo)

**Advantages**

Already shipped; simple step list.

**Disadvantages**

Steals investment DCA; ignores configured target / horizon / LIVRET DCA.

### Option B — Surplus-based LIVRET advice outside the DCA envelope (chosen)

**Advantages**

Protects investment plans; uses Réglages target; oneshot vs horizon is clear.

**Disadvantages**

Two surfaces (capacity + banner) instead of one step in the list.

## Consequences

- New module `emergency-fund-recommendation.ts`; next-euro step kind
  `emergency_fund` removed.
- ADR 0015 P1 semantics superseded for emergency routing only; P2/P3 unchanged.
- Savings capacity Dashboard / banner UI hidden same branch; `computeSavingsCapacity`
  and surplus attach unchanged for future re-enable.

## Uncovered cases

- Auto-create / resize LIVRET DCA; mobile Next-euro UI; Livret A vs LDDS split.

## Follow-up

- Optional mobile Next-euro banner when that surface ships.
- Re-enable Savings capacity card / soft banners when product wants the second
  surface again (components + copy already in repo).

## See also

- [ADR 0015](0015-next-euro-plan.md) (P1 superseded)
- [ADR 0017](0017-savings-capacity-bridge.md)
- [ADR 0018](0018-configurable-emergency-fund-target.md)
- [ADR 0019](0019-livret-dca-savings-capacity.md)
- [ADR 0005](0005-emergency-fund-health-indicator.md)
- [ADR 0021](0021-monthly-dca-tilt-execution.md)
- [ADR 0022](0022-dca-first-monthly-card.md) — Dashboard EF surplus on Emergency fund card
- [packages/core/next-euro-plan.md](../../packages/core/next-euro-plan.md)
- [packages/core/savings-capacity.md](../../packages/core/savings-capacity.md)
