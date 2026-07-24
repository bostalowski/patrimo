# Glossary

## Account

A portfolio container with an account type and tax envelope. Transactions reference accounts by identifier.

## Asset

A financial instrument tracked in the `Actifs` workbook sheet. Transactions and investment-plan baskets reference assets by identifier.

## No account

A system-owned portfolio group for transactions preserved after account deletion. It is included in portfolio totals and performance, excluded from tax estimates, and cannot be selected when creating a transaction. The reserved identifier is `__NO_ACCOUNT__`.

## Unassigned cash

Reserved cash asset used when a savings account is detached. Deposits, withdrawals, and recorded interest move to this asset under **No account**. The reserved identifier is `__UNASSIGNED_CASH__`.

## Detach

Delete an account while preserving its transactions by moving every source or destination reference to **No account**.

## Cascade deletion

Delete an entity and every dependent record required to prevent invalid references.

## Investment plan

A DCA configuration containing baskets of asset identifiers and target allocations.

## Price cache

Derived price history stored locally by each application instance. Price caches are not the source of truth and may be removed lazily after the corresponding asset is deleted on another device.
