# Key principles

Patrimo is a local wealth-tracking product. These commitments constrain product and code changes.

## Excel workbook is the source of truth

Transactions, assets, accounts, budget lines, properties, DCA plans, manual prices, and geographic allocations live in a `.xlsx` workbook. Local JSON and AsyncStorage automatic price files are derived caches, not authoritative portfolio state.

## Shared domain logic lives in `@patrimo/core`

Portfolio math, schema validation, tax estimates, projection, and deletion rules belong in `packages/core`. Platform packages own I/O, UI, and persistence adapters only.

## Platforms share one workbook contract

Web/Electron and mobile read and write the same sheet model. Behavioral rules that mutate workbook meaning must stay in `@patrimo/core` so platforms cannot diverge silently.

## Automatic prices are derived and local

Automatic market price history is cached per application instance. Manual prices are workbook data (see [ADR 0002](../adr/0002-store-manual-prices-in-workbook.md)). Cache cleanup never undoes a successful workbook write. Stale automatic cache entries on another device are removed lazily after the workbook no longer references the asset.

## Tax figures are indicative

Fiscal modules apply simplified French-tax heuristics hardcoded in `@patrimo/core`. They are estimates for personal planning, not a filing engine and not legal advice.

## Local-first operation

Desktop can run without an external application server (Electron embeds Next.js). Mobile can operate on a local file or Google Drive. Network calls are limited to price sources, optional Drive access, and release checks.

## Feature parity is the product direction

Web/Electron and mobile should converge to the same user-facing capabilities over the shared workbook. Today they are not feature-identical; document gaps as current state until closed. See [Platforms](platforms.md).

## See also

- [Foundations](../architecture/foundations.md)
- [Glossary](../reference/glossary.md)
- [ADR 0001](../adr/0001-share-deletion-rules-across-platforms.md)
- [ADR 0002](../adr/0002-store-manual-prices-in-workbook.md)
