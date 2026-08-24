# ADR 0018: Portfolio health cockpit

- Status: accepted
- Date: 2026-08-24
- implementation_ready: yes

```text
Contract (do not invent):

Cockpit = composition of EXISTING assessments → unified tones + ONE next-action.
FORBIDDEN: proprietary aggregate score /100; fee traffic-light (ADR 0007);
  duplicating EF / savings / coherence / risk / goals thresholds.

Signals (5 pills):
  emergency_fund ← computeEmergencyFundHealth → /budget
  savings_capacity ← computeSavingsCapacity
    href /dca WHEN over_committed ELSE /budget
  diversification ← assessDiversificationCoherence → /diversification
  risk ← assessRiskMetricStatus(vol) + assessRiskMetricStatus(drawdown)
    (Sharpe excluded) → /#performance
  goals ← assessFinancialGoals → /objectifs

Tone map:
  EF: healthy→ok; acceptable|over_allocated→watch; insufficient→breach
  savings: comfortable→ok; tight→watch; over_committed→breach
  diversification: aligned→ok; watch→watch; misaligned→breach
  risk: hide WHEN both metrics null;
    ok WHEN present metrics are low+mild only;
    watch WHEN any moderate|marked and no breach;
    breach WHEN any high|severe
  goals: hide WHEN null;
    breach WHEN oversubscribed;
    watch WHEN any behind OR incomplete profile/goals (and not oversubscribed);
    ok OTHERWISE

Hide pill WHEN source null.

Next-action (first match):
  1. buildNextEuroPlan non-null with steps → first step FR one-liner → /diversification
  2. worst visible pill tone (breach > watch); tie-break order:
       emergency → savings → diversification → risk → goals
  3. all visible ok → "Rien d'urgent — surveille le Dashboard." → /

UI: traffic-light pills + one sentence; existing Dashboard cards STAY.
Persistence: derived only — no sheet/field.
Mobile UI: absent in V1.
```

## Context

Health signals already exist on separate Dashboard cards and deep pages. Relating
them requires visiting multiple surfaces. Beginners need one glance; advanced
users still want drill-down. Savings capacity (ADR 0017) is available. Issue
[#52](https://github.com/bostalowski/patrimo/issues/52).

## Decision

Ship `buildPortfolioHealthCockpit` in `@patrimo/core`. Surface a web Dashboard
section of traffic-light pills plus one recommended next-action sentence. No
aggregate score. Fees deferred until an ADR supersedes 0007. Mobile deferred
(same pattern as ADR 0015).

## Invariants

1. Domain composition and tone / next-step ranking live in `@patrimo/core`;
   platforms only render.
2. No re-implementation of underlying assessment thresholds.
3. Derived only — no workbook persistence.
4. Platforms must not invent a different next-action priority.
5. Fee pill forbidden while ADR 0007 stands.

## Options considered

### Option A — Proprietary score `/100`

**Advantages**

Single glance number; familiar “health score” framing.

**Disadvantages**

Needs a separate product ADR for weighting; hides which signal is red; out of
scope for #52 V1.

### Option B — Traffic-light composition + one next-action (chosen)

**Advantages**

Transparent; reuses existing assessments; actionable via next-euro preference;
no new thresholds.

**Disadvantages**

Less “gamified”; users still interpret multiple pills.

## Consequences

- Glossary term + core topic note.
- FEATURES matrix row **Portfolio health cockpit** (web done / mobile absent).
- Dashboard Performance section gains `id="performance"` for the risk deep link.

## Uncovered cases

- Fee traffic-light (blocked by ADR 0007).
- Mobile cockpit UI.
- Replacing or redesigning existing health cards.

## Follow-up

- Optional: mobile Dashboard cockpit using the same core builder.
- Optional: fee pill only after an ADR that amends/supersedes 0007.

## See also

- [ADR 0005](0005-emergency-fund-health-indicator.md)
- [ADR 0006](0006-portfolio-risk-readability.md)
- [ADR 0007](0007-fee-monitoring-ratios.md)
- [ADR 0012](0012-allocation-coherence.md)
- [ADR 0014](0014-financial-goals.md)
- [ADR 0015](0015-next-euro-plan.md)
- [ADR 0017](0017-savings-capacity-bridge.md)
- [Portfolio health cockpit](../../packages/core/portfolio-health-cockpit.md)
- Issue [#52](https://github.com/bostalowski/patrimo/issues/52)
