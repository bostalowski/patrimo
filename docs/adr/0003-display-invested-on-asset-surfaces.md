# ADR 0003: Display invested amount on asset surfaces

- Status: proposed
- Date: 2026-08-13

## Context

Users looking at the consolidated asset list and an individual asset page cannot see how much capital remains invested in the position. Quantity, PRU, market value, and unrealized P&L are shown, but the cost basis that underpins PRU and the P&L percentage is missing.

The portfolio engine already computes `costBasis` per asset position. The dashboard and account views already surface the same figure under the UI label **Investi**. The gap is presentation only.

Canonical terms: [glossary](../reference/glossary.md) (**Invested**, **PRU**).

## Decision

On web/Electron and mobile asset surfaces, display the position's `costBasis` with the UI label **Investi**.

- Web list (`/actifs`): sortable column after **PRU**, before current price.
- Web detail (`/actifs/[id]`): KPI card after **PRU**, before market value.
- Mobile asset list: summary line alongside quantity and PRU.

The displayed value is the remaining position cost basis from `buildPortfolio` — not historical net cash deployed across closed quantity. Zero remaining quantity shows `0 €` (same zero presentation already used for other monetary fields).

`@patrimo/core` portfolio math is unchanged.

## Invariants

- **Investi** on asset surfaces equals `AssetPosition.costBasis` from `@patrimo/core`.
- The label stays aligned with the dashboard and account "Investi" meaning.
- Web and mobile show the same semantic for the same workbook position.
- No new portfolio metric is introduced in this change.

## Options considered

### Option A — Surface existing `costBasis` as **Investi** (chosen)

**Advantages**

- Fixes the missing information without changing portfolio math.
- Matches dashboard / accounts vocabulary and P&L % denominator.
- Small, testable UI change on both platforms.

**Disadvantages**

- Wider web table and denser detail KPI row.
- Users who expect "cash ever paid in" may still misread the figure (mitigated by glossary and PRU consistency).

### Option B — Introduce a separate "net cash invested" historical metric

**Advantages**

- Answers a different question (lifetime cash in vs out).

**Disadvantages**

- New domain concept, new calculation, divergence from PRU / unrealized P&L %.
- Larger scope than the reported gap.

### Option C — Web only

**Advantages**

- Smaller first increment.

**Disadvantages**

- Leaves the same gap on mobile, against the locked product choice of dual-platform parity for this display.

## Consequences

- Asset list and detail UIs gain an explicit invested column/card/line.
- Documentation and tests treat **Investi** as `costBasis`, not as lifetime cash flow.
- Future work that changes cost-basis semantics must update all **Investi** surfaces together.

## Uncovered cases

- Closed positions that no longer appear in portfolio asset rows (nothing to display).
- Account-level invested totals (already shown elsewhere; out of scope).
- Historical "cash ever invested" reporting (explicitly out of scope).

## Follow-up

- Confirm architecture / howto drafts after implementation (Phase 5).
- Optional later: show invested on account-embedded asset tables for full UI consistency (out of this increment).

## See also

- [Glossary — Invested](../reference/glossary.md)
- [Asset invested display](../architecture/asset-invested-display.md)
- [Implement asset invested display](../howto/implement-asset-invested-display.md)
- [Platforms](../overview/platforms.md)
- [Key principles](../overview/key-principles.md)
