# ADR 0003: Display invested amount on asset surfaces

- Status: proposed
- Date: 2026-08-13

## Context

Users looking at consolidated assets, an individual asset page, or positions nested under an account cannot see how much capital remains invested in each open position. Quantity, PRU, market value, and unrealized P&L are shown, but the cost basis that underpins PRU and the P&L percentage is missing.

The portfolio engine already computes `costBasis` per asset position and per account×asset position. The dashboard and account **header** already surface account-level invested under **Investi**. The gap is presentation on asset rows — including account-embedded active position tables.

Canonical terms: [glossary](../reference/glossary.md) (**Invested**, **PRU**).

## Decision

On web/Electron and mobile, display each open position's `costBasis` with the UI label **Investi**.

**Asset surfaces**

- Web list (`/actifs`): sortable column after **PRU**, before current price.
- Web detail (`/actifs/[id]`): KPI card after **PRU**, before market value.
- Mobile asset list: summary line alongside quantity and PRU.

**Account surfaces (active positions only)**

- Web `/comptes`: column **Investi** after **PRU**, before **Valeur**, in each account's active-positions table (`quantity > 0`).
- Mobile comptes: under each account card, list active positions showing asset label, quantity, **Investi**, and market value when a price is known.

The displayed value is the remaining position cost basis from `buildPortfolio` — not historical net cash deployed across closed quantity. On asset list/detail (not account tables), zero remaining quantity shows `0 €`. Closed account positions (`quantity ≤ 0`) do **not** show **Investi**.

`@patrimo/core` portfolio math is unchanged.

This ADR is amended on the feature branch before merge to `main` (no supersession): account active-position surfaces were added to the same decision.

## Invariants

- **Investi** on asset and account active-position surfaces equals `costBasis` from `@patrimo/core` (`AssetPosition` or `AccountAssetPosition`).
- The label stays aligned with the dashboard and account-header "Investi" meaning.
- Web and mobile show the same semantic for the same workbook position.
- Closed positions under accounts do not display **Investi**.
- No new portfolio metric is introduced in this change.

## Options considered

### Option A — Surface existing `costBasis` as **Investi** (chosen)

**Advantages**

- Fixes the missing information without changing portfolio math.
- Matches dashboard / accounts vocabulary and P&L % denominator.
- Small, testable UI change on both platforms.

**Disadvantages**

- Wider web tables and denser mobile account cards.
- Users who expect "cash ever paid in" may still misread the figure (mitigated by glossary and PRU consistency).

### Option B — Introduce a separate "net cash invested" historical metric

**Advantages**

- Answers a different question (lifetime cash in vs out).

**Disadvantages**

- New domain concept, new calculation, divergence from PRU / unrealized P&L %.
- Larger scope than the reported gap.

### Option C — Web asset surfaces only

**Advantages**

- Smaller first increment.

**Disadvantages**

- Leaves the same gap on mobile and under accounts.

### Option D — Also show Investi on closed account positions

**Advantages**

- Symmetric columns across active and closed tables.

**Disadvantages**

- Closed rows usually have `costBasis` 0; the figure is not meaningful for remaining capital.
- Closed table schema is realized P&L oriented, not PRU/cost.

## Consequences

- Asset and account active-position UIs gain an explicit invested column/card/line.
- Documentation and tests treat **Investi** as `costBasis`, not as lifetime cash flow.
- Future work that changes cost-basis semantics must update all **Investi** surfaces together.

## Uncovered cases

- Closed account positions (explicitly no **Investi** column).
- Account-level invested totals (already shown on account headers / dashboard).
- Historical "cash ever invested" reporting (explicitly out of scope).

## Follow-up

None for this decision on the current branch.

## See also

- [Glossary — Invested](../reference/glossary.md)
- [Asset invested display](../architecture/asset-invested-display.md)
- [Implement asset invested display](../howto/implement-asset-invested-display.md)
- [Platforms](../overview/platforms.md)
- [Key principles](../overview/key-principles.md)
