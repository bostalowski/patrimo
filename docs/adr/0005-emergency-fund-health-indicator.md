# ADR 0005: Emergency fund health indicator

- Status: proposed
- Date: 2026-08-14
- implementation_ready: yes

```text
Contract (do not invent):
- WHEN total livret market value and monthly expenses (summarizeBudget.depensesMensuelles) are both available and monthly expenses > 0
- THEN compute coverageMonths = livretBalance / monthlyExpenses and map to status:
    < 3 → insufficient
    [3, 6) → acceptable
    [6, 12) → healthy
    ≥ 12 → over_allocated
- WHEN monthly expenses ≤ 0
- THEN return null (no indicator; UI must hide the card)
- WHEN livret balance is 0 and monthly expenses > 0
- THEN coverageMonths = 0 and status = insufficient
- ELSE livret balance is the sum of AccountSummary.marketValue for envelope === "LIVRET" (available balance already used by buildPortfolio)
- FORBIDDEN inventing Livret A vs LDDS split; editable month targets; dedicated page; push alerts; history; duplicating the ratio outside @patrimo/core
- OPEN (do not implement): none
```

## Context

Dashboard and budget already expose livret balances and monthly expenses separately. Users cannot see how many months of spending the emergency reserve covers. Root cause is a missing derived metric, not bad workbook data.

Canonical terms: [glossary](../reference/glossary.md) (**Emergency fund coverage**, **Emergency fund health**).

## Decision

- Add `computeEmergencyFundHealth` in `@patrimo/core` (`emergency-fund.ts`).
- Show a Dashboard card on **web and mobile** when the function returns non-null.
- Display coverage months (one decimal), status label/color, and the two inputs used (livret total and monthly expenses).
- Over-allocated (≥ 12 months) includes a short hint that capital may be idle.

## Invariants

- Ratio math and status thresholds live only in `@patrimo/core`.
- Livret total uses portfolio market values for `LIVRET` accounts (same available-balance basis as today).
- Monthly expenses are `summarizeBudget(...).depensesMensuelles` (DEPENSE lines only; not EPARGNE).
- Platforms may only format and render; they must not redefine thresholds.

## Options considered

| Option | Status | Why |
|---|---|---|
| A — Shared core function + web/mobile Dashboard cards | Retained | Fixes the missing link once; keeps platform parity direction |
| B — Web-only UI ratio, no core module | Rejected | Duplicates domain logic; mobile diverges |
| C — Put formula in `budget.ts` or `portfolio.ts` | Rejected | Concept spans both domains; dedicated module is clearer |

## Consequences

**Positives**

- One testable contract for coverage and status.
- Dashboard bridges budget and portfolio without a new workbook sheet.

**Negatives**

- Dashboard needs budget summary even when the user never opens Budget.
- Status colors on mobile need amber/sky beyond the current success/danger theme pair.

**To monitor**

- Users with incomplete budgets (zero expenses) see no card — intentional, not an error state.

## Uncovered cases

- Distinguishing Livret A vs LDDS inside `LIVRET`.
- User-editable coverage targets.
- Dedicated emergency-fund page or alerts.

## Follow-up

None for this increment.

## See also

- [Emergency fund health](../architecture/emergency-fund-health.md)
- [Implement emergency fund health](../howto/implement-emergency-fund-health.md)
- [Glossary](../reference/glossary.md)
