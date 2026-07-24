# ADR 0001: Centralize deletion rules across platforms

- Status: accepted
- Date: 2026-07-24

## Context

Accounts and assets are workbook source data shared by the web and mobile applications. Transactions reference both entities by identifier, investment plans reference assets, and each application maintains derived price caches.

Deleting an account or asset without coordinating those references can leave the workbook inconsistent. Implementing deletion independently on web and mobile would also allow their behavior to diverge.

The canonical terms used by this decision are defined in the [glossary](../reference/glossary.md).

## Decision

Deletion rules are implemented as pure workbook transformations in `@patrimo/core`. The web and mobile applications call the same transformations and own only platform-specific persistence and presentation.

A reserved account identifier represents **No account**. The identifier is not persisted in the `Comptes` sheet and is not offered when creating transactions.

Transactions assigned to **No account** remain part of net worth and performance calculations. They are excluded from tax estimates because no tax envelope can be inferred safely.

Account deletion supports two modes:

- **Cascade deletion** removes every transaction where the account is the source or destination. A transfer is removed as one complete transaction. Assets no longer referenced by any remaining transaction are deleted with their investment-plan references and local price caches.
- **Detach** rewrites every source or destination account reference to **No account** and preserves the transactions and assets.

Detaching a savings account converts its deposits, withdrawals, and recorded interest into unassigned cash history. Recorded values remain included in net worth; future interest estimation stops because the deleted account rate no longer exists.

Asset deletion removes the asset, every transaction referencing it across all accounts, its investment-plan references, and its local price caches. Empty investment-plan baskets are removed, and a plan without baskets is removed.

Workbook mutations are prepared in memory and persisted with one workbook write. A failed workbook write leaves the previous workbook unchanged. Price caches are derived data: local cleanup follows a successful workbook write, and other devices remove stale entries lazily after loading the updated workbook.

## Invariants

- Web and mobile use the same account and asset deletion rules.
- A persisted transaction never references a deleted account unless it uses the reserved **No account** identifier.
- A persisted transaction never references a deleted asset.
- **No account** positions remain visible and included in portfolio totals and performance.
- **No account** transactions are excluded from tax estimates.
- **No account** is not available for new transactions.
- An asset still referenced by a remaining transaction is not deleted during account cascade deletion.
- Investment-plan baskets and plans cannot remain empty after deletion cleanup.
- Deletion is irreversible and requires explicit confirmation.

## Options considered

### Shared pure transformation in `@patrimo/core`

**Advantages**

- One behavioral contract for web and mobile.
- Deletion rules can be tested without filesystem, network, or UI dependencies.
- Platform persistence remains isolated.

**Disadvantages**

- Portfolio, performance, and tax calculations must recognize the reserved account identifier.
- Platform adapters still require separate persistence tests.

### Duplicate deletion logic in web and mobile

**Advantages**

- Smaller initial changes in each application.

**Disadvantages**

- Cascade rules can diverge.
- Behavioral tests must be duplicated.
- Future reference types require coordinated changes in two implementations.

### Centralize deletion behind the web server

**Advantages**

- One persistence boundary and immediate server-side cache cleanup.

**Disadvantages**

- Mobile could no longer delete data in a local workbook without a server.
- Google Drive and local-file workflows would become network-service dependent.

## Consequences

- A shared deletion module and reserved identifier become part of the core contract.
- Every calculation that groups by account must display and preserve **No account** correctly.
- The web and mobile user interfaces need destructive confirmation flows.
- Price caches on another device can temporarily contain unreachable entries. These entries do not affect calculations and are removed on the next workbook load.
- Concurrent writes to the same workbook retain the existing last-writer behavior.

## Uncovered cases

- Existing workbooks that already contain orphan account or asset identifiers are not repaired automatically.
- Concurrent deletion from multiple devices is not coordinated.
- Deleted accounts and assets cannot be restored.

## Follow-up

- Consider a general workbook integrity checker if orphan repair becomes necessary.
- Consider archival only if restoration becomes a product requirement.

## See also

- [Deletion pipeline](../architecture/deletion-pipeline.md)
- [Glossary](../reference/glossary.md)
- `packages/core/src/deletion.ts`
- `packages/core/src/portfolio.ts`
- `src/lib/excel.ts`
- `mobile/lib/file-source.ts`
