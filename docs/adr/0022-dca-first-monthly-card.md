# ADR 0022: DCA-first Dashboard surfaces (no tilt card)

- Status: accepted
- Date: 2026-08-26
- implementation_ready: yes
- Supersedes-in-part:
  - [ADR 0021](0021-monthly-dca-tilt-execution.md) (Dashboard + Diversification tilt card title / narrative; Exécution tilt-on default)
  - [ADR 0020](0020-emergency-fund-surplus-recommendation.md) (UI host: EF surplus copy on EmergencyFundCard)
  - [ADR 0015](0015-next-euro-plan.md) (placement: Diversification / Dashboard as next-euro tilt surfaces)

```text
Contract:

Dashboard — NO « Ce mois-ci » / ThisMonthCard. No saved-DCA reminder on Dashboard;
  Exécution is the monthly action surface for investment DCA.

EmergencyFundCard (web Dashboard):
  WHEN health non-null OR EF surplus recommendation mode ≠ none:
    - Existing ADR 0005 health (coverage months, status badge)
    - EF surplus copy (ADR 0020) in-card WHEN recommendation actionable
      (visible even when investment DCA pool === 0)

DashboardExposureAlert (web Dashboard):
  WHEN nextEuroPlan coherence has stock band_drift tone=breach (ADR 0012 stockPct):
    short alert + link Diversification (D8: up to 3 keys by |signedΔ|)
  ELSE hidden (not watch, not flow-only)

Diversification page: do NOT mount NextEuroPlanCard / Ajustement DCA.
  AllocationCoherenceCard + exposure panels remain.

Exécution: orders default to saved DCA; tilt opt-in checkbox OFF on each
  mount (not persisted). Core buildMonthlyDcaTilt kept for opt-in path.

FORBIDDEN: tilt lead / catch-up € list on Dashboard; mobile monthly card;
  deleting tilt core; capacity card re-enable; changing ADR 0012 tones;
  EF math changes.
```

## Context

Users treat the saved investment DCA as the monthly rule. Diversification
bands are exposure guardrails, not a prompt to deviate every month. The
previous Dashboard / Diversification **Ajustement DCA du mois** card and
Exécution tilt-on default pushed catch-up euros as the primary story.

A follow-up UX pass (2026-08-26) removed the **Ce mois-ci** grab-bag: EF
surplus advice belongs on **Fonds d'urgence**; the nominal DCA reminder was
redundant with Exécution.

## Decision

- EF surplus recommendation on `EmergencyFundCard` (not a separate monthly card).
- `DashboardExposureAlert` for stock breach ping only (when pool > 0 / plan exists).
- No Dashboard « Ce mois-ci » card.
- Stop mounting `NextEuroPlanCard` on Dashboard and Diversification.
- Exécution defaults `useTilt` to false; no session persistence.
- Keep `buildMonthlyDcaTilt` / next-euro plan builders for Exécution opt-in
  and plan attachment (EF + coherence).

## Invariants

1. Exposure alert = stock `band_drift` + `breach` only (not `watch`, not flow-only).
2. Breach key selection + FR alert strings in `@patrimo/core` (`this-month-copy.ts`).
3. EF surplus FR strings in `@patrimo/core` (`emergency-fund-recommendation.ts`).
4. Tilt remains available on Exécution as explicit opt-in only.
5. Investment DCA is never reallocated by EF surplus recommendation (ADR 0020).

## Consequences

- Modules: `this-month-copy.ts` (breach helpers), `DashboardExposureAlert`,
  extended `EmergencyFundCard`.
- `ThisMonthCard` removed; `NextEuroPlanCard` unmounted.
- Glossary / `next-euro-plan.md` / FEATURES Notes updated.

## See also

- [ADR 0012](0012-allocation-coherence.md)
- [ADR 0015](0015-next-euro-plan.md)
- [ADR 0020](0020-emergency-fund-surplus-recommendation.md)
- [ADR 0021](0021-monthly-dca-tilt-execution.md)
- [packages/core/next-euro-plan.md](../../packages/core/next-euro-plan.md)
