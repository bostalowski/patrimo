# ADR 0019: LIVRET DCA in savings capacity + over-contribution alert

- Status: accepted
- Date: 2026-08-24
- implementation_ready: yes
- Amends: [ADR 0017](0017-savings-capacity-bridge.md) (planned DCA pool split for capacity)
- Relates: [ADR 0018](0018-configurable-emergency-fund-target.md)

```text
Contract (do not invent):

Emergency contribution plan = real DcaConfig in sheet `DCA` with
  envelope === LIVRET (user-authored in Investissements / DCA; no auto-create).

LIVRET plan shape: cash deposit stream — empty `lines` allowed ONLY when
  envelope === LIVRET. Other envelopes keep lines.min(1) + asset baskets.
  Execution / share-buy UI is N/A for LIVRET (show as dépôt mensuel).

Capacity split (computeSavingsCapacity):
  plannedLivretDcaMonthly = monthlyize Σ configs where envelope === LIVRET
  plannedInvestmentDcaMonthly = monthlyize Σ configs where envelope !== LIVRET
  need = monthlyEmergencyCatchUpReserve(config)  // ADR 0018
  emergencyMonthlyOutflow = max(need, plannedLivretDcaMonthly)
  investableSurplus = rawSavings − emergencyMonthlyOutflow
  plannedDcaMonthly = plannedInvestmentDcaMonthly  // status / gap / investment banners
  gap = plannedInvestmentDcaMonthly − investableSurplus
  status compares investment DCA only vs surplus (comfortable / tight / over_committed)

Over-contribution alert:
  emergencyOverContribution = max(0, plannedLivretDcaMonthly − need)
  emergencyOverContributing = plannedLivretDcaMonthly > need
  INCLUDING when need === 0 and plannedLivret > 0
  Surfaces: Dashboard capacity card + soft warning on web DCA page
  Does NOT by itself force investment status over_committed

Under-plan (plannedLivret ≤ need): no special alert

Next-euro / Projection / coherence: unchanged (full monthly pool per ADR 0015)

FORBIDDEN in V1: auto-create/resize LIVRET DCA from Reglages; rewrite next-euro
  to exclude LIVRET; force investment over_committed solely from LIVRET over-plan
```

## Context

ADR 0017 treated all workbook DCA as one investment pool via
`computeMonthlyDcaPool`. ADR 0018 made the emergency catch-up **need**
configurable, but the need stayed implied — not a real contribution plan.

Users want a real LIVRET cash DCA in the workbook that feeds savings-capacity
accounting without double-counting against investment DCA, and an alert when
that plan exceeds the implied catch-up need.

## Decision

- Persist the emergency contribution plan as a normal `DcaConfig` with
  `envelope: LIVRET` (no parallel field on `Fonds urgence`).
- Allow empty basket lines for LIVRET only (cash dépôt).
- Split planned DCA into LIVRET vs investment pools inside
  `computeSavingsCapacity`; EF outflow is `max(need, plannedLivret)`.
- Emit `emergencyOverContributing` / `emergencyOverContribution` when
  planned LIVRET exceeds need; surface on capacity card and web DCA.

## Invariants

1. Domain math stays in `@patrimo/core`; platforms only format and place UI.
2. LIVRET empty-lines exception is schema-enforced; other envelopes unchanged.
3. Investment `over_committed` remains investment-vs-surplus only (D16).
4. Next-euro still reallocates the full monthly pool (ADR 0015 / D18).

## Options considered

### Option A — Parallel field on `Fonds urgence` for planned LIVRET €/mois

**Advantages**

Simple Reglages edit; no DCA schema change.

**Disadvantages**

Two contribution truths; diverges from Investment plan vocabulary.

### Option B — Real LIVRET `DcaConfig` + capacity split (chosen)

**Advantages**

One workbook contribution model; portable; reuses DCA sheet / UI.

**Disadvantages**

Requires cash-mode DCA UX and serializer round-trip for empty lines.

## Consequences

- `computeSavingsCapacity` return type gains LIVRET / investment / over fields.
- Web DCA planner supports LIVRET cash mode; capacity + DCA soft warning.
- Mobile capacity card reads new fields; LIVRET cash edit polish minimal.
- Glossary + `savings-capacity.md` updated; append-only notes on ADR 0017 / 0018.

## Uncovered cases

- Auto-create / resize LIVRET DCA from Reglages.
- Next-euro rewrite to prefer personal EF target or exclude LIVRET from pool.
- Mobile soft warning banners on Investissements / Projection.

## Follow-up

- Optional mobile LIVRET cash-mode form polish (hide basket editors).
- Optional: feed over-contribution into next-euro messaging (not pool source).

## See also

- [ADR 0015](0015-next-euro-plan.md)
- [ADR 0017](0017-savings-capacity-bridge.md)
- [ADR 0018](0018-configurable-emergency-fund-target.md)
- [Savings capacity](../../packages/core/savings-capacity.md)
- [Glossary](../reference/glossary.md)
