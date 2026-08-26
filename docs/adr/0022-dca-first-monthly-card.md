# ADR 0022: DCA-first monthly Dashboard card

- Status: accepted
- Date: 2026-08-26
- implementation_ready: yes
- Supersedes-in-part:
  - [ADR 0021](0021-monthly-dca-tilt-execution.md) (Dashboard + Diversification tilt card title / narrative; Exécution tilt-on default)
  - [ADR 0020](0020-emergency-fund-surplus-recommendation.md) (UI host only: EF banner moves to « Ce mois-ci »)
  - [ADR 0015](0015-next-euro-plan.md) (placement: Diversification / Dashboard as next-euro tilt surfaces)

```text
Contract:

Dashboard monthly card = « Ce mois-ci » (ThisMonthCard)
  WHEN investment DCA pool > 0 (same hide rule as ADR 0020/0021).
  Content (top → bottom):
    1. EF surplus banner WHEN recommendation non-null and mode ≠ none
       (ADR 0020 math + copy; hors enveloppe DCA)
    2. Saved-DCA lead + link Exécution (no tilt verdict, no catch-up € list)
    3. Exposure alert WHEN stock band_drift tone=breach (ADR 0012 stockPct)
       — up to 3 keys by descending |signedΔ|, then link Diversification
  FORBIDDEN on this card: tilt lead, per-asset « oriente X € », step list

Diversification page: do NOT mount NextEuroPlanCard / Ajustement DCA.
  AllocationCoherenceCard + exposure panels remain.

Exécution: orders default to saved DCA; tilt opt-in checkbox OFF on each
  mount (not persisted). Core buildMonthlyDcaTilt kept for opt-in path.

FORBIDDEN: mobile monthly card; deleting tilt core; capacity card re-enable;
  changing ADR 0012 tones; EF math changes; EF-only Dashboard when pool=0.
```

## Context

Users treat the saved investment DCA as the monthly rule. Diversification
bands are exposure guardrails, not a prompt to deviate every month. The
previous Dashboard / Diversification **Ajustement DCA du mois** card and
Exécution tilt-on default pushed catch-up euros as the primary story.

## Decision

- Ship Dashboard `ThisMonthCard` (« Ce mois-ci ») with EF banner + saved-DCA
  lead + breach-only exposure alert.
- Stop mounting `NextEuroPlanCard` on Dashboard and Diversification.
- Exécution defaults `useTilt` to false; no session persistence.
- Keep `buildMonthlyDcaTilt` / next-euro plan builders for Exécution opt-in
  and plan attachment (EF + coherence).

## Invariants

1. Hide « Ce mois-ci » when investment monthly pool === 0.
2. Exposure alert = stock `band_drift` + `breach` only (not `watch`, not
   flow-only).
3. Domain FR strings for the new card live in `@patrimo/core` (`this-month-copy`).
4. Tilt remains available on Exécution as explicit opt-in only.

## Consequences

- New modules: `this-month-copy.ts`, `ThisMonthCard`.
- `NextEuroPlanCard` may remain in the tree unmounted for later cleanup.
- Glossary / `next-euro-plan.md` / FEATURES Notes updated for the reframe.

## See also

- [ADR 0012](0012-allocation-coherence.md)
- [ADR 0015](0015-next-euro-plan.md)
- [ADR 0020](0020-emergency-fund-surplus-recommendation.md)
- [ADR 0021](0021-monthly-dca-tilt-execution.md)
- [packages/core/next-euro-plan.md](../../packages/core/next-euro-plan.md)
