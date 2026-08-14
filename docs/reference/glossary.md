# Glossary

Canonical vocabulary for Patrimo. Prefer these terms in docs, ADRs, and code discussions.

## Account

A portfolio container with an account type and tax envelope. Transactions reference accounts by identifier. Persisted in the `Comptes` sheet.

## Asset

A financial instrument tracked in the `Actifs` sheet. Transactions and investment-plan baskets reference assets by identifier.

## Envelope

Tax wrapper attached to an account: `CTO`, `PEA`, `PEE`, `AV`, `LIVRET`, or `PER`.

## Workbook

The Excel `.xlsx` file that stores source portfolio data (transactions, assets, accounts, and optional budget, real-estate, and DCA sheets).

## Transaction

A dated movement in the `Transactions` sheet. Types: `ACHAT`, `VENTE`, `DIVIDENDE`, `INTERET`, `TRANSFERT`, `DEPOT`, `RETRAIT`.

## PRU

Unit cost basis of a position (`costBasis / quantity`) as computed by `@patrimo/core` portfolio logic.

## Invested

Remaining position cost basis (`costBasis`) as computed by `@patrimo/core` portfolio logic. UI label **Investi**. Equals quantity × PRU for an open position. Not historical net cash deployed after closed quantity.

## Unrealized P&L

Mark-to-market gain or loss versus PRU for remaining quantity.

## Realized P&L

Gain or loss locked by disposals and related realized events (sales, and other realized cash flows modeled by the portfolio engine).

## Net worth

Portfolio valuation plus real-estate equity contributions used on the dashboard (`computeNetWorth`).

## Emergency fund coverage

Months of monthly expenses covered by total livret market value: `livretBalance / depensesMensuelles`. Computed by `computeEmergencyFundHealth` in `@patrimo/core`. Undefined when monthly expenses are zero or negative (indicator hidden).

## Emergency fund health

Status band derived from **Emergency fund coverage**: `insufficient` (&lt; 3 months), `acceptable` ([3, 6)), `healthy` ([6, 12)), `over_allocated` (≥ 12). Shown on web and mobile Dashboards when coverage is defined.

## Risk status band

Qualitative judgement attached to a performance risk metric (annualized volatility, Sharpe ratio, or max drawdown) using fixed product thresholds in `@patrimo/core`. Used so Dashboards can show a human label and color without redefining cutoffs in the UI. When the underlying metric is null (insufficient history), no band is produced.

## No account

A system-owned portfolio group for transactions preserved after account deletion. It is included in portfolio totals and performance, excluded from tax estimates, and cannot be selected when creating a transaction. The reserved identifier is `__NO_ACCOUNT__`.

## Unassigned cash

Reserved cash asset used when a savings account is detached. Deposits, withdrawals, and recorded interest move to this asset under **No account**. The reserved identifier is `__UNASSIGNED_CASH__`.

## Detach

Delete an account while preserving its transactions by moving every source or destination reference to **No account**.

## Cascade deletion

Delete an entity and every dependent record required to prevent invalid references.

## Investment plan

A DCA configuration containing baskets of asset identifiers and target allocations. Persisted in the `DCA` sheet.

## Extra contribution

A non-monthly investment-plan stream (`TRIMESTRIEL` or `ANNUEL`) used by Projection alongside the monthly contribution field. Kept as a separate calendar stream (not divided into the monthly input). Web and mobile Projection may show it as a badge (`extraContributions` / `extraStreams`).

## Price cache

Derived price history stored locally by each application instance. Price caches are not the source of truth and may be removed lazily after the corresponding asset is deleted on another device.

## Price source

How an asset obtains quotes: `coingecko`, `yahoo`, `investir`, `zonebourse`, or `manual`.

## Manual price

A user-entered dated valuation (typically FCPE VL) stored in the optional workbook sheet `Prix manuels`. Only assets whose price source is `manual` use these entries. Automatic market prices remain in local derived caches (`prices.json` / AsyncStorage), not in this sheet.

## Tax estimate

Simplified French-tax heuristic produced by `@patrimo/core` fiscal modules. Indicative only; not a tax filing output.

## See also

- [Key principles](../overview/key-principles.md)
- [Foundations](../architecture/foundations.md)
- [ADR 0001](../adr/0001-share-deletion-rules-across-platforms.md)
- [ADR 0002](../adr/0002-store-manual-prices-in-workbook.md)
- [ADR 0004](../adr/0004-show-non-monthly-streams-on-mobile-projection.md)
- [ADR 0005](../adr/0005-emergency-fund-health-indicator.md)
- [ADR 0006](../adr/0006-portfolio-risk-readability.md)
- [Manual price persistence](../architecture/manual-price-persistence.md)
