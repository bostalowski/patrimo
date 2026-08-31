# ADR 0014: Financial goals in the workbook

- Status: accepted
- Date: 2026-08-20
- implementation_ready: yes

```text
Contract (do not invent):

Financial goal = named intention with type, target amount in today's euros,
  and a horizon. Persisted in optional workbook sheet "Objectifs".

Types (closed enum):
  - RETIREMENT_INCOME : monthly real income at a target age
  - CAPITAL_AT_DATE   : real capital amount at a calendar date

Sheet columns:
  ID, Libellé, Type, Montant cible, Âge cible, Date cible,
  Inflation comprise, Notes
  Inflation comprise: Oui / Non (missing or empty ⇒ Oui). Maps to
  inflationIncluded boolean (default true).

  WHEN inflationIncluded = true (Oui):
    Montant cible is purchasing-power euros (today's terms).
    requiredFromTarget = capital formula on Montant cible as real.
    requiredToday = requiredFromTarget
    requiredAtHorizon = inflate(requiredFromTarget, horizon, inflationRate)
    targetNominalAtHorizon = inflate(Montant cible, horizon, inflationRate)
  WHEN inflationIncluded = false (Non):
    Montant cible is already euros of the horizon (nominal).
    requiredFromTarget = capital formula on Montant cible as horizon euros.
    requiredAtHorizon = requiredFromTarget
    requiredToday = deflate(requiredFromTarget, horizon, inflationRate)
      WHEN horizon unknown / incomplete: do NOT invent inflation —
        requiredToday = requiredAtHorizon = requiredFromTarget;
        targetNominalAtHorizon / requiredNominalAtHorizon stay null.
    targetNominalAtHorizon = Montant cible (no further inflate)

  FOR RETIREMENT_INCOME: Âge cible required (50–75); Date cible empty.
  FOR CAPITAL_AT_DATE: Date cible required; Âge cible empty.
  Empty collection clears the plan (valid).

Required capital from target (shared formula):
  RETIREMENT_INCOME:
    annualGap = max(0, monthlyTarget×12 − pensionNet)
    pensionNet = (estimatedPublicPension ?? 0) × PENSION_BRUT_TO_NET_APPROX
    requiredFromTarget = annualGap / withdrawalRate
    withdrawalRate from retirement-profile.json (default 0.04)
  CAPITAL_AT_DATE:
    requiredFromTarget = targetAmount

Progress current = min(1, liquidMarketValue / requiredToday)
  WHEN requiredToday === 0 THEN progress = 1 (goal already covered by pension)
  Progress always uses requiredToday (today's euros) so it stays comparable
  to current liquid MV.

Surface split (FORBIDDEN conflating these on Objectifs):
  Objectifs + Dashboard summary = intention + stock gap only
    (requiredToday, liquidMarketValue, progressCurrent / progressOverall,
     optional targetNominalAtHorizon / requiredAtHorizon for horizon euros).
    No trajectory badge, no scenario label, no oversubscription from projection.
  Projection = read-only alignment against the live envelope projection
    parameters the user already edits (per-envelope rates, monthly/extra
    contributions, inflation, optional PER sandbox). For each goal, project
    the same engaged envelopes to that goal's horizon; compare projectedReal
    to requiredToday (real↔real). Display Besoin as requiredAtHorizon
    (horizon euros — reflects Inflation comprise). Status bands
    (fixed in @patrimo/core):
      ahead     : projectedReal ≥ requiredToday × 1.05
      on_track  : projectedReal ∈ [requiredToday × 0.95, requiredToday × 1.05)
      behind    : projectedReal < requiredToday × 0.95
    WHEN horizonYears ≤ 0 THEN status = behind if current < requiredToday
      else ahead; do not invent future growth.
    Cumul oversubscribed WHEN capacity at max open-goal horizon < Σ requiredToday.
  FORBIDDEN: a second editable scenario/rate control dedicated to goals on
    Projection (no parallel SCENARIO_PRESETS picker for Objectifs).
  assessFinancialGoals(scenario) remains available in core for non-UI /
    Retraite-style preset runs; product Projection UI does not use it for
    the alignment strip.
  Projection without goals remains valid (envelope / real-estate what-if).

Platforms V1: web/Electron only. Mobile parses/serializes the sheet for
  workbook parity but has no Objectifs UI (documented gap).

FORBIDDEN: stochastic simulation; auto-DCA reallocation; per-goal envelope
  assignment; inventing inflation/rates when missing (UI shows incomplete);
  silent default scenario verdict on Objectifs or Dashboard.
```

## Context

Patrimo projects envelopes and has a retirement profile, but does not store
named euro intentions (e.g. “€3,000/month real income at 58”) or measure
progress toward several of them at once. Diversification targets cover
allocation bands, not capital/income goals.

Showing a Modéré trajectory on Objectifs without a scenario control mixed
“what I want” with “what I assume markets return” and confused users.

## Decision

Persist financial goals in workbook sheet `Objectifs`. Stock gap is evaluated
in `@patrimo/core` from liquid MV and retirement-profile (`withdrawalRate`,
public pension). Web Objectifs is CRUD + stock gap; web Projection shows
read-only alignment against the envelope parameters already on that page;
mobile keeps sheet round-trip only in V1.

## Invariants

1. `inflationIncluded` (default true) chooses whether `targetAmount` is
   today's euros or already horizon euros; progress always uses
   `requiredToday` in today's euros.
2. Projection alignment reuses the same `projectInvestment` calls as the
   envelope sandbox (live rates / versements / inflation) — no parallel
   rate editor for goals. Alignment compares `projectedReal` to
   `requiredToday`; UI Besoin shows `requiredAtHorizon`.
3. Goals share one liquid pool; independent stock progress can look healthy
   while Projection shows cumul oversubscribed under current params.
4. Missing sheet ⇒ empty goals. Empty save clears the plan. Missing
   `Inflation comprise` cell ⇒ Oui (`inflationIncluded: true`).
5. Objectifs never implies a return scenario; Projection never edits goals.

## Options considered

### Option A — Workbook sheet `Objectifs` (chosen)

**Advantages:** Same source of truth as portfolio; syncs with the Excel file;
matches diversification-targets pattern.

**Disadvantages:** Schema/migration touch on every workbook write; mobile
must parse even without UI.

### Option B — Side JSON like `retirement-profile.json`

**Advantages:** Faster to ship; no Excel column contract.

**Disadvantages:** Diverges from workbook authority; goals would not travel
with the portfolio file across devices.

### Option C — Merge Objectifs into Projection (rejected)

**Advantages:** One place for “will I get there?”.

**Disadvantages:** Conflates intention editing with rate what-if; Projection
without a named goal would lose meaning as a planning sandbox.

## Consequences

- New Zod `FinancialGoal`, sheet headers, dual Excel adapters, web API.
- `withdrawalRate` on the retirement profile becomes the capitalisation lever
  for retirement-income goals.
- Mobile capability matrix documents Objectifs as Absent (UI) while sheet
  round-trip is Present.
- Trajectory UI lives on Projection as a read-only alignment strip driven by
  the existing envelope controls (`GoalsAlignmentPanel`).

## Uncovered cases

- Exclusive capital assignment per goal (V1 uses shared pool).
- Emergency-fund or real-estate down-payment goal types.
- Stochastic success probability.
- Binding goal alignment to a separate SCENARIO_PRESETS picker (rejected —
  duplicates Projection parameters).

## Follow-up

- Mobile Objectifs UI when closing the platform gap.
- Optional envelope tagging per goal.

## See also

- [Financial goals](../architecture/financial-goals.md)
- [Glossary](../reference/glossary.md)
- [Projection](../architecture/foundations.md)
- [ADR 0012](0012-allocation-coherence.md) — analogous target + assessment pattern
- [ADR 0023](0023-goal-capitalisation-mode.md) — per-goal capitalisation mode + pension overlap (supersedes Required capital / withdrawalRate / pension-always block)
- [ADR 0025](0025-multi-scenario-public-pension.md) — multi-scenario public pension; retirement-income horizon by date (supersedes-in-part age horizon here)
