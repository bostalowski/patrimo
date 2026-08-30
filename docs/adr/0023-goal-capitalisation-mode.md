# ADR 0023: Per-goal capitalisation mode and pension overlap

- Status: accepted
- Date: 2026-08-29
- implementation_ready: yes
- Supersedes-in-part: [ADR 0014](0014-financial-goals.md) (Required capital / `withdrawalRate` / pension-always block)

```text
Contract (do not invent):

Per RETIREMENT_INCOME goal:
  drawOnCapital: boolean (default false) — label + rate defaults + UI copy ONLY
  capitalisationRate: fraction in ]0, 0.10]
    default 0.03 when drawOnCapital = false
    default 0.04 when drawOnCapital = true
  SAME formula always:
    annualNeed = monthlyTarget × 12 − (pensionNet × 12 IF overlap ELSE 0)
    requiredFromTarget = annualNeed / capitalisationRate
  FORBIDDEN: inventing a distinct « compound interest / longevity » formula per mode.

Pension overlap (net subtracted) IFF ALL of:
  estimatedPublicPension defined AND > 0
  goal.type = RETIREMENT_INCOME
  goal.targetAge >= profile.targetRetirementAge

Profile withdrawalRate MUST NOT feed Objectifs / Projection goals alignment.
  Field may remain on RetirementProfile for other retirement surfaces.

Workbook Objectifs columns (append):
  "Vivre sur le capital" : Oui/Non (empty ⇒ Non) → drawOnCapital
  "Taux capitalisation"  : fraction in Excel (0.03 for 3 %), like Comptes.Taux
    empty ⇒ default by mode (0.03 if Non, 0.04 if Oui)
  Legacy sheet without these columns ⇒ drawOnCapital=false, rate 0.03
    (migration accepted: prior 4% profile capital may jump)

Mode toggle sticky-default (UI):
  Non→Oui and rate still 0.03 ⇒ set 0.04
  Oui→Non and rate still 0.04 ⇒ set 0.03
  else keep user rate

CAPITAL_AT_DATE: mode/rate/pension do not affect requiredFromTarget (= targetAmount).
  Write may leave mode/rate cells empty; read/normalize ignore them for the formula.

Platforms:
  Web: Objectifs editor + assessment copy
  Mobile: parse/serialize only (no Objectifs UI)
```

## Context

ADR 0014 capitalised every retirement-income goal at the profile
`withdrawalRate` (default 4 %) and always subtracted public pension, even when
the goal’s target age was before the profile retirement age. Users needed
per-goal « intérêts seuls » vs « vivre sur le capital » with an editable rate,
and pension only when the goal horizon overlaps retirement.

## Decision

Persist `drawOnCapital` and `capitalisationRate` on each `FinancialGoal`
(workbook `Objectifs`). Keep one capitalisation formula; use mode only for
defaults and copy. Subtract pension net only on age overlap with
`targetRetirementAge`. Stop feeding profile `withdrawalRate` into the goals
path.

## Invariants

1. Mode never changes the math — only defaults and wording.
2. Rate bounds `]0, 0.10]`; empty cell → mode default; legacy → Non + 3 %.
3. Pension counts only when estimated &gt; 0 and `targetAge >= targetRetirementAge`.
4. `CAPITAL_AT_DATE` ignores mode, rate, and pension for `requiredFromTarget`.
5. Profile `withdrawalRate` is not an input to Objectifs / goals alignment.

## Options considered

### Option A — Per-goal mode + rate (chosen)

**Advantages:** Matches teach-back; removes ambiguous global lever.

**Disadvantages:** Two new workbook columns; legacy capital figures may change.

### Option B — Expose profile `withdrawalRate` only (rejected)

**Advantages:** Smaller change.

**Disadvantages:** No intérêts-seuls semantics; pension still applied too early.

### Option C — Distinct formulas per mode (rejected)

**Advantages:** Sounds closer to « live on interest ».

**Disadvantages:** Ambiguous longevity math; teach-back uses one division.

## Consequences

- New ADR accepted; ADR 0014 capitalisation/pension/rate block superseded in part.
- Callers must pass `targetRetirementAge` (not `withdrawalRate`) into goals needs.
- Mobile keeps sheet parity without Objectifs UI.

## Uncovered cases

- Mobile Objectifs UI.
- Auto-deriving the default rate from Projection envelope yields.
- Changing Projection’s separate « revenus sans toucher au capital » card.

## Follow-up

None required for this branch beyond checker pass.

## See also

- [ADR 0014](0014-financial-goals.md) — financial goals sheet (partially superseded here)
- [Financial goals](../../packages/core/financial-goals.md)
- [Glossary](../reference/glossary.md)
- [Excel workbook](../reference/excel-workbook.md)
