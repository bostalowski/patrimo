# ADR 0018: Configurable emergency-fund target and catch-up horizon

- Status: accepted
- Date: 2026-08-24
- implementation_ready: yes

```text
Contract (do not invent):

Emergency-fund configuration is persisted in workbook sheet `Fonds urgence`
(optional, single row) with columns:
  - `Cible (mois)` (number > 0, default 6)
  - `Cible (€)` (optional number > 0; absolute override)
  - `Horizon rattrapage (mois)` (integer >= 1, default 12)

Effective target euro:
  WHEN `Cible (€)` is present and valid: use it
  ELSE WHEN `depensesMensuelles > 0`: `Cible (mois) × depensesMensuelles`
  ELSE: target euro is undefined

Catch-up monthly reserve:
  WHEN effective target euro is undefined: 0
  ELSE `max(0, effectiveTargetEuro - livretBalance) / horizonMonths`

Savings capacity (ADR 0017) MUST use configured target/horizon in place of
  fixed constants, while keeping all status rules unchanged.

Emergency-fund health bands (ADR 0005) stay fixed:
  insufficient <3, acceptable [3,6), healthy [6,12), over_allocated >=12.
  Personal target does not redefine these statuses.

Next-euro plan P1 (ADR 0015) stays unchanged in V1:
  trigger on `insufficient` only and fill to 3 months.

Platforms in V1:
  - Web: edit in `Reglages`, read on Dashboard/capacity consumers
  - Mobile: read only (no edit form)

FORBIDDEN in V1: auto-writing DCA lines; changing ADR 0005 status thresholds;
  re-routing next-euro P1 to personal target; storing config in `data/config.json` only.
OPEN (do not implement): none
```

## Context

Emergency-fund behavior is currently hardcoded across core modules:

- ADR 0005 status bands (3/6/12) in `computeEmergencyFundHealth`
- ADR 0017 catch-up target (6 months) and horizon (12 months) in savings capacity
- ADR 0015 next-euro P1 trigger/fill rule based on `insufficient`

Users want to configure both the reserve target amount and the time path (implied
monthly catch-up), while keeping workbook portability.

## Decision

- Add an emergency-fund config model in `@patrimo/core` backed by optional
  workbook sheet `Fonds urgence`.
- Support both target modes:
  - months target (`Cible (mois)`)
  - optional absolute euro override (`Cible (€)`)
- Keep defaults aligned with current behavior when config is absent:
  `Cible (mois)=6`, `Horizon rattrapage (mois)=12`, no euro override.
- Apply configured values to savings-capacity catch-up computation only.
- Keep emergency-health status thresholds and next-euro P1 semantics unchanged in V1.

## Invariants

1. Workbook remains the source of truth for this intent (portable across platforms).
2. Domain math lives in `@patrimo/core`; web/mobile only render and edit.
3. Missing/invalid config row falls back safely to defaults (6/12, no override).
4. Health status bands remain product-wide and non-configurable in V1.

## Options considered

### Option A — Keep fixed constants (status quo)

**Advantages**

No schema/UI changes.

**Disadvantages**

Does not satisfy user need for personalized reserve path.

### Option B — Config in app settings (`data/config.json`) only

**Advantages**

Fast to wire for web.

**Disadvantages**

Not portable with workbook; violates workbook-centric product intent.

### Option C — Workbook-backed config with months + euro override (chosen)

**Advantages**

Portable intent, backward-compatible defaults, works with/without budget expenses.

**Disadvantages**

Adds a new optional sheet and serializer coverage to maintain.

## Consequences

- `@patrimo/core` schema/template/serializers gain emergency-fund config fields.
- Web `Reglages` adds an editor for target months, optional target euro, horizon.
- Savings-capacity card/warnings reflect configured catch-up path.
- Mobile remains read-only for this config in V1.

## Uncovered cases

- Per-account emergency buckets (Livret A vs LDDS).
- Historical target timeline / audit trail.
- Automatic DCA plan mutation from the catch-up reserve.

## Follow-up

- Mobile edit form parity.
- Optional UX hinting in next-euro explaining fixed 3-month safety threshold
  vs personal target.

## See also

- [ADR 0005](0005-emergency-fund-health-indicator.md)
- [ADR 0015](0015-next-euro-plan.md)
- [ADR 0017](0017-savings-capacity-bridge.md)
- [ADR 0019](0019-livret-dca-savings-capacity.md) — real LIVRET `DcaConfig` counted in capacity; over-contribution alert when planned exceeds implied need
- [ADR 0020](0020-emergency-fund-surplus-recommendation.md) — surplus LIVRET advice uses this target / horizon; supersedes next-euro P1 steal
- [Glossary](../reference/glossary.md)
