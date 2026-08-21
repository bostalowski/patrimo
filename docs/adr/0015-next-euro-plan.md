# ADR 0015: Next-euro action plan (variante 2)

- Status: accepted
- Date: 2026-08-21
- implementation_ready: yes

```text
Contract (do not invent):

Next-euro plan = read-only ranking of buy / hold / pause steps that
  reallocate the existing monthly DCA envelope toward LIVRET (emergency)
  and underweight diversification bands, then residual DCA.

Envelope (monthlyPool):
  Σ annualizeDcaAmount(config.amount, config.frequency) / 12
  across workbook DCA configs. No budget « restant » / « épargne » in V1.

Priorities (deterministic, exclusive monthly euros):
  P1 emergency fund — WHEN computeEmergencyFundHealth → insufficient
    (< 3 months): buy LIVRET for min(pool, max(0, 3×monthlyExpenses − livret)).
    WHEN pool === 0 and insufficient: still emit buy for the full gap
    (informational; nothing to reallocate).
  P2 band catch-up — bands with signed Δ < 0 (stock); greedy remaining pool:
    breach before watch, then |Δ| descending. Gap € = |Δ| × liquidInvested.
    Route to candidate assets (DCA line assetIds ∪ positions MV > 0)
    proportional to look-through contributionToKey weights.
    WHEN sum weights = 0: one band_catchup step without assetId.
  P3 residual DCA — scale remaining pool across configs; computeDcaPlan
    per envelope with portfolioByEnvelope. Paused assets get 0 €.
  Pause — bands with Δ > 0: pause (0 €) for contributing candidates.

Hide: WHEN monthlyPool === 0 AND emergency fund is not insufficient → null.
WHEN pool > 0 and no diversification targets: P1 + P3 only.

FORBIDDEN in V1: workbook writes; auto-trade; disclaimer copy; mobile UI;
  goals exclusive envelope routing; budget restant/épargne pool.
```

## Context

Users see diversification coherence and DCA plans separately. They need a
single ordered answer to “where should the next euro go?” without mutating
the workbook. Variant 2 reuses the existing DCA monthly envelope rather than
inventing a second budget pool.

## Decision

Ship `buildNextEuroPlan` in `@patrimo/core` and surface it on web Dashboard
(top 3) and Diversification (full list). Same core API is available for a
later mobile follow-up.

## Invariants

1. Monthly euros are spent at most once across P1–P3 (geo and CRYPTO stock
   axes may overlap; the pool does not).
2. Domain math stays in `@patrimo/core`; UI only labels and links.
3. Null result hides the card (no empty shell).

## Options considered

### Option A — Advise without an envelope (free-form amounts)

**Advantages**

Simple messaging of stock gaps.

**Disadvantages**

Unanchored euro amounts; easy to overstate capacity.

### Option B — Reallocate existing monthly DCA (chosen)

**Advantages**

Anchored to money the user already commits; deterministic; no new inputs.

**Disadvantages**

Silent when there is no DCA and emergency fund is healthy.

### Option C — Add budget restant / épargne to the pool

**Advantages**

Larger actionable envelope.

**Disadvantages**

Needs budget semantics and product copy; deferred.

## Consequences

- New module `packages/core/src/next-euro-plan.ts` and topic note.
- Web cards only in this sprint; mobile remains `absent` / `partial`.

## Uncovered cases

- Non-DCA cash to deploy; goals routing; auto-applying the plan to DCA lines.

## Follow-up

- Mobile UI parity.
- Optional variant 3: include budget restant / épargne in the pool.

## See also

- [ADR 0005](0005-emergency-fund-health-indicator.md)
- [ADR 0012](0012-allocation-coherence.md)
- [packages/core/next-euro-plan.md](../../packages/core/next-euro-plan.md)
