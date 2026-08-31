# ADR 0025: Multi-scenario public pension (info-retraite)

- Status: accepted
- Date: 2026-08-31
- Supersedes-in-part: [ADR 0023](0023-goal-capitalisation-mode.md) (pension overlap by age), [ADR 0014](0014-financial-goals.md) (retirement income horizon by age)

## Context

info-retraite.fr exposes up to three official estimates (âge légal / taux plein / taux plein automatique), each with a **start date** and **gross** monthly amount. Patrimo stored a single `targetRetirementAge` + `estimatedPublicPension`, so Objectifs overlap used `targetAge >= targetRetirementAge` and Projection/Retraite used one invented age horizon. That mis-dated the pension and distorted income-goal progress.

## Decision

1. Persist up to **three typed scenarios** (`LEGAL_AGE`, `FULL_RATE`, `AUTOMATIC_FULL_RATE`) in `retirement-profile.json`: each slot is **filled** iff valid `startDate` **and** `grossMonthly` (≥ 0). Persist `activeScenario` for Projection/Retraite surfaces.
2. **Objectifs** `RETIREMENT_INCOME`: horizon is **date only** (`Date cible`); column **`Pension publique`** = `Aucune` / scenario code (default `Aucune`). Subtract `gross × PENSION_BRUT_TO_NET_APPROX` only when link ≠ Aucune, scenario filled, and civil `targetDate ≥ startDate`.
3. Projection retraite block: **only** UI to pick `activeScenario` among filled scenarios; horizon and pension for **that block only**; show brut / net / réel; **totals use net** (and net deflated). No filled active scenario ⇒ incomplete (no invented horizon). Same resolution for other Retraite surfaces (read-only w.r.t. which scenario is active; profile form edits scenario data only).
4. Legacy flat profile migrates on read to `LEGAL_AGE` (civil anniversary when `birthDate` known). Writes omit flat fields. Legacy goals: age-only migrates to `targetDate` when birthDate known; write clears Âge cible for income goals.

## Invariants

- Civil Y-M-D comparisons only (no timezone flip on ≥).
- Incomplete scenario slot is never offered in selects / never invents overlap.
- Orphan `activeScenario` (unfilled) clears to empty.
- `CAPITAL_AT_DATE` ignores pension link for capital need.
- Domain math stays in `@patrimo/core`.

## Options considered

### Single “best estimate” amount

**Advantages:** Minimal schema change.

**Disadvantages:** Still cannot date the pension; rejected.

### Free-form N scenarios

**Advantages:** Flexible.

**Disadvantages:** Overfits; info-retraite has three typed lines; rejected.

### Keep age overlap (ADR 0023)

**Advantages:** No Objectifs column.

**Disadvantages:** Wrong when dates diverge from whole ages; rejected in favour of explicit link + civil dates.

## Consequences

- New helpers: `normalizeRetirementProfile`, `resolveActiveRetirement`, `publicPensionNetMonthlyApplied` via scenario link.
- Workbook column `Pension publique`; glossary + financial-goals topic note updated.
- UI forms edit scenarios, not flat age/pension.

## Uncovered cases

- PDF/API import from info-retraite; real tax engine; mobile Objectifs UI; custom 4th scenario; profile in Excel workbook.

## Follow-up

- Optional: migrate remaining assessment copy that still displays derived age when only date is stored.
