# @patrimo/core architecture

Shared domain package: schema, workbook template, portfolio math, deletion, tax estimates, projection, DCA, allocation, and related pure transforms.

Hard rules: [CONSTRAINTS.md](../../CONSTRAINTS.md). Names: [glossary](../../docs/reference/glossary.md).

## Codemap

| Area | Modules (search by name) |
|---|---|
| Schema / sheets | `schema.ts`, `workbook-template.ts` |
| Portfolio / PRU / P&L | `portfolio.ts`, `portfolio-history.ts`, `performance.ts` |
| Deletion | `deletion.ts` — see [deletion.md](deletion.md) |
| Manual prices | `manual-prices.ts` — see [manual-prices.md](manual-prices.md) |
| Geographic allocation | `geographic-allocation.ts`, `geographic-exposure.ts`, `justetf-geography.ts` — see [geographic-allocation.md](geographic-allocation.md) |
| Sector allocation | `sector-allocation.ts`, `sector-exposure.ts`, `justetf-sectors.ts` — see [sector-allocation.md](sector-allocation.md) |
| Diversification | `diversification-targets.ts`, `diversification-coherence.ts` — see [diversification-targets.md](diversification-targets.md) |
| Next-euro plan | `next-euro-plan.ts` — see [next-euro-plan.md](next-euro-plan.md) |
| Savings capacity | `savings-capacity.ts` — see [savings-capacity.md](savings-capacity.md) |
| Financial goals | `financial-goals.ts` — see [financial-goals.md](financial-goals.md) |
| Emergency fund | `emergency-fund.ts` — see [emergency-fund.md](emergency-fund.md) |
| Emergency fund config | `emergency-fund-config.ts` |
| Portfolio risk | `portfolio-risk.ts` — see [portfolio-risk.md](portfolio-risk.md) |
| Fees | `fees.ts` — see [fee-monitoring.md](fee-monitoring.md) |
| Tax / fiscal | `tax-rules.ts`, `fiscalite.ts`, `fiscal-advice.ts` |
| Projection / DCA / budget | `projection.ts`, `dca.ts`, `budget.ts`, `retraite.ts` — overflow: [envelope-overflow.md](envelope-overflow.md) |
| Price schedule helpers | `prices/schedule.ts` |
| Real estate | `realestate/*` |

## System shape

```text
Excel workbook (source of truth)
        |
   platform adapters (web / mobile)
        |
        v
  @patrimo/core  — pure Workbook in, Workbook / views out
```

## Invariants (package)

1. Modules transform in-memory `Workbook` values and do not perform I/O.
2. Required sheets: `Transactions`, `Actifs`, `Comptes`. Optional sheets created when first needed.
3. Legacy `Allocation cible` ignored on read, removed on write.
4. Positions come from transactions + latest prices; cache cleanup never removes transactions.
5. Tax heuristics are indicative only.

## What belongs here

| Change | Put it in core |
|---|---|
| Transaction type semantics, PRU, tax constant | yes |
| New Excel column / sheet header | `schema.ts` + `workbook-template.ts` |
| Deletion / manual price / allocation rules | yes |

Platforms only adapt I/O and UI. See [src/ARCHITECTURE.md](../../src/ARCHITECTURE.md) and [mobile/ARCHITECTURE.md](../../mobile/ARCHITECTURE.md).

## Topic notes

- [deletion.md](deletion.md) — ADR 0001
- [manual-prices.md](manual-prices.md) — ADR 0002
- [geographic-allocation.md](geographic-allocation.md) — ADR 0008–0011
- [sector-allocation.md](sector-allocation.md) — ADR 0013
- [diversification-targets.md](diversification-targets.md) — ADR 0012
- [next-euro-plan.md](next-euro-plan.md) — ADR 0015
- [savings-capacity.md](savings-capacity.md) — ADR 0017 / 0019
- [envelope-overflow.md](envelope-overflow.md) — ADR 0016
- [financial-goals.md](financial-goals.md) — ADR 0014
- [emergency-fund.md](emergency-fund.md) — ADR 0005
- [portfolio-risk.md](portfolio-risk.md) — ADR 0006
- [fee-monitoring.md](fee-monitoring.md)
