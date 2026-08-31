# Financial goals

How Patrimo stores named capital/income intentions, measures stock gap on
Objectifs, and reads alignment on Projection from the live envelope
parameters. Decisions: [ADR 0014](../../docs/adr/0014-financial-goals.md), [ADR 0023](../../docs/adr/0023-goal-capitalisation-mode.md).

## Intent

Express “I want the purchasing power of €3,000/month at age 58” or “€200k of
today's purchasing power by 2035” as workbook rows. Objectifs answers how
much capital that implies today and how much liquid wealth you already have.
Projection answers whether the path you are already simulating (taux /
versements / inflation) reaches those targets.

## Flow

```text
User edits goals on Objectifs page
        │
        ▼
validateFinancialGoals ──► workbook sheet Objectifs
        │
Portfolio liquid MV + retirement profile (+ inflation for nominal display)
        │
        ▼
assessFinancialGoals ──► stock gap on Objectifs / Dashboard
        │
User edits rates / monthly / inflation on Projection
        │
        ▼
same envelope projectInvestment → GoalsAlignmentPanel (read-only)
```

## Workbook sheet

Optional sheet `Objectifs`:

| Column | Model | Rule |
|---|---|---|
| `ID` | `id` | Stable string identifier |
| `Libellé` | `label` | Display name |
| `Type` | `type` | `RETIREMENT_INCOME` or `CAPITAL_AT_DATE` |
| `Montant cible` | `targetAmount` | Monthly income or capital; semantics depend on `Inflation comprise` |
| `Âge cible` | `targetAge` | Legacy / display only for retirement; **empty on write** for `RETIREMENT_INCOME` |
| `Date cible` | `targetDate` | Required for retirement income and capital goals |
| `Inflation comprise` | `inflationIncluded` | `Oui` / `Non` (empty ⇒ `Oui`). `Oui` = montant en euros d’aujourd’hui ; `Non` = déjà en euros de l’horizon |
| `Vivre sur le capital` | `drawOnCapital` | `Oui` / `Non` (empty ⇒ `Non`). Mode = libellé + défauts de taux + copy ; même formule |
| `Taux capitalisation` | `capitalisationRate` | Fraction `]0, 0.10]` (empty ⇒ 0.03 si Non, 0.04 si Oui) |
| `Pension publique` | `publicPensionLink` | `Aucune` / `LEGAL_AGE` / `FULL_RATE` / `AUTOMATIC_FULL_RATE` (missing column ⇒ Aucune) |
| `Notes` | `notes` | Optional |

Missing sheet ⇒ empty collection. Empty save clears the plan.

## Core

| Function | Role |
|---|---|
| `validateFinancialGoals(goals)` | Save gate (empty OK) |
| `requiredCapitalToday(goal, profile)` | Capital from `targetAmount` via formula (no inflate/deflate) |
| `resolveGoalCapitalNeeds(...)` | `requiredToday` / `requiredAtHorizon` / `targetNominalAtHorizon` from `inflationIncluded` + horizon + rate |
| `computeGoalHorizon` / `trajectoryStatus` | Horizon + ±5 % bands for Projection alignment |
| `assessFinancialGoals(...)` | Stock progress (Objectifs); exposes `pensionNetMonthlyApplied` for copy when overlap |
| `publicPensionNetMonthlyApplied(goal, profile)` | Net €/month subtracted from income need (0 if no overlap) |

## Surfaces

| Surface | Role |
|---|---|
| Web `/objectifs` | CRUD + stock gap + cumul of needs (no scenario) |
| Web Dashboard | Gap summary + link to Projection |
| Web `/projection` | Read-only `GoalsAlignmentPanel` when goals exist; driven by envelope controls |
| Mobile | Sheet round-trip only in V1 (no UI) |

Retirement public pension scenarios and `activeScenario` stay in
`retirement-profile.json` (not duplicated on the sheet). Profile
`withdrawalRate` does **not** feed Objectifs capitalisation (per-goal
`capitalisationRate` + `drawOnCapital` instead). Public pension net is
subtracted only when `publicPensionLink` names a **filled** scenario and
civil `targetDate ≥ scenario.startDate`. See [ADR 0025](../../docs/adr/0025-multi-scenario-public-pension.md).

## See also

- [ADR 0014](../../docs/adr/0014-financial-goals.md)
- [ADR 0023](../../docs/adr/0023-goal-capitalisation-mode.md)
- [ADR 0025](../../docs/adr/0025-multi-scenario-public-pension.md)
- [Excel workbook](../../docs/reference/excel-workbook.md)
- [Platforms](../../docs/overview/platforms.md)
