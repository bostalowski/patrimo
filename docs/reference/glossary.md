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
- [Manual price persistence](../architecture/manual-price-persistence.md)
