# ADR 0017: Savings capacity bridge (budget → DCA)

- Status: accepted
- Date: 2026-08-21
- implementation_ready: yes
- Superseded-by: [ADR 0018](0018-configurable-emergency-fund-target.md) for configurable emergency-fund target and catch-up horizon.

```text
Contract (do not invent):

Savings capacity = derived investable surplus after budget cashflow and
  emergency-fund catch-up reserve, compared to monthlyized workbook DCA.

rawSavings = revenusMensuels − depensesMensuelles
  (ignore budget EPARGNE lines — intentional labels, not capacity)

EF target months = 6; catch-up horizon N = 12
monthlyEmergencyReserve =
  WHEN depensesMensuelles ≤ 0: 0
  WHEN coverageMonths ≥ 6: 0
  ELSE max(0, (6 − coverage) × depensesMensuelles / 12)
  coverageMonths = livretBalance / depensesMensuelles

investableSurplus = rawSavings − monthlyEmergencyReserve
  (MAY be negative)

plannedDcaMonthly = computeMonthlyDcaPool(dca)  // workbook configs only

status:
  comfortable WHEN planned = 0 AND surplus ≥ 0
  over_committed WHEN planned > surplus
  comfortable WHEN surplus ≥ 0 AND planned ≤ 0.8 × surplus
  tight OTHERWISE (planned ≤ surplus)

Hide (null) WHEN revenusMensuels ≤ 0
Show card even when planned = 0 (capacity useful without DCA)
Soft warnings (web DCA / Projection) ONLY WHEN over_committed

FORBIDDEN in V1: workbook sheet/field; auto-resize DCA; editable targets;
  mobile DCA/Projection warnings; Projection-only extras not in DcaConfig;
  replacing next-euro pool with budget capacity.
```

## Context

Budget and emergency-fund coverage already exist, and DCA plans define planned
contributions, but users cannot see whether that plan fits cashflow capacity
after expenses and a path to the 6-month emergency target. Next-euro (ADR 0015)
reallocates an *existing* DCA pool; this feature answers whether that pool fits.

## Decision

Ship `computeSavingsCapacity` in `@patrimo/core`. Surface a Dashboard card on
web and mobile next to the emergency-fund card. On web only, show a soft
warning banner on Investissements / DCA and Projection when status is
`over_committed`. No workbook mutation.

## Invariants

1. Domain math stays in `@patrimo/core`; platforms only format and place UI.
2. Capacity ignores budget `EPARGNE` lines (uses revenus − dépenses only).
3. Planned DCA comes solely from workbook `DcaConfig` via `computeMonthlyDcaPool`.
4. Derived only — no sheet or field persistence.
5. Null hides the card; soft warnings appear only for `over_committed`.

## Options considered

### Option A — Use budget `restant` (revenus − dépenses − épargne)

**Advantages**

Matches the Budget page leftover figure.

**Disadvantages**

Double-counts intentional savings labels as a second capacity source; conflates
labeled épargne with investable room for DCA.

### Option B — Raw savings minus EF catch-up reserve (chosen)

**Advantages**

Clear cashflow capacity; EF catch-up is explicit and constant-driven; complementary
to next-euro without changing its pool source.

**Disadvantages**

Surplus can look “high” when the user already labels large `EPARGNE` lines
(by design: those labels are not subtracted again).

## Consequences

- New glossary terms and a core topic note.
- FEATURES matrix row **Savings capacity** on merge.
- Mobile soft warnings deferred.

## Uncovered cases

- Editable EF target / catch-up horizon in UI.
- Auto-resize of DCA plans.
- Projection UI extras that are not persisted as `DcaConfig`.

## Follow-up

- Optional: soft warnings on mobile Investissements / Projection.
- Optional: feed capacity into next-euro messaging (not pool source).

## See also

- [ADR 0005](0005-emergency-fund-health-indicator.md)
- [ADR 0015](0015-next-euro-plan.md)
- [ADR 0019](0019-livret-dca-savings-capacity.md) — LIVRET vs investment DCA split for capacity; supersedes the “all DCA = investment pool” reading of this ADR for savings capacity only
- [Savings capacity](../../packages/core/savings-capacity.md)
- Issue [#51](https://github.com/bostalowski/patrimo/issues/51)
