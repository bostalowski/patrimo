# Hard constraints

MUST / MUST NOT rules for Patrimo. Violate none of these without an accepted ADR that supersedes them.

Canonical names: [docs/reference/glossary.md](docs/reference/glossary.md).
Mechanics live in colocated `ARCHITECTURE.md` files (see [docs/DOC_MODEL.md](docs/DOC_MODEL.md)).

## Product

1. MUST treat the Excel `.xlsx` workbook as the source of truth for portfolio state (transactions, assets, accounts, budget, real estate, DCA, manual prices, geographic/sector exposure, diversification targets, financial goals).
2. MUST NOT treat `prices.json`, mobile AsyncStorage automatic prices, or other local caches as recoverable portfolio history.
3. MUST keep tax figures indicative (simplified French-tax heuristics in `@patrimo/core`). MUST NOT present them as a filing engine or legal advice.
4. MUST keep the product local-first: network only for price sources, optional Drive, and release checks.
5. MUST document platform capability gaps as current state until closed ([FEATURES.md](FEATURES.md), [docs/overview/platforms.md](docs/overview/platforms.md)). Feature parity is direction, not a guarantee.

## Domain ownership

6. MUST put portfolio math, schema validation, tax estimates, projection, and deletion rules in `packages/core` (`@patrimo/core`).
7. MUST NOT duplicate deletion, PRU, tax, or other workbook-meaning rules outside `@patrimo/core`.
8. MUST update `packages/core/src/schema.ts`, `workbook-template.ts`, and both platform serializers together when adding a workbook field or sheet.
9. MUST keep behavioral rules that mutate workbook meaning in `@patrimo/core` so web/Electron and mobile cannot diverge silently.

## Workbook & identity

10. MUST require sheets `Transactions`, `Actifs`, and `Comptes` on a valid workbook. Optional sheets are created when first needed.
11. MUST ignore legacy sheet `Allocation cible` on read and remove it on write.
12. MUST treat `__NO_ACCOUNT__` as a reserved transaction reference, not a `Comptes` row. MUST NOT offer `__NO_ACCOUNT__` or `__UNASSIGNED_CASH__` as user-selectable entities when creating data.
13. MUST compute positions from workbook transactions plus latest known prices. Removing a price-cache entry MUST NEVER remove a transaction.

## Persistence & platforms

14. MUST perform pure core mutations in memory; platforms persist with one workbook write.
15. MUST NOT undo a successful workbook write when price-cache cleanup fails.
16. MUST use last-writer-wins for concurrent edits of the same workbook (no distributed lock).
17. Web MUST prefer `data/config.json` `excelPath` over `EXCEL_PATH`.
18. Web `writeWorkbook` MUST write a temp file then `renameSync` onto the target (atomic replace).

## Agent stop criteria

19. MUST NOT declare a task done without a green `make verify` (or equivalent `npm run verify`) for the change set.
20. MUST NOT invent sheet names, enums, or reserved identifiers; use the glossary and `@patrimo/core` schema.
21. MUST discuss before coding any change that contradicts this file, a colocated `ARCHITECTURE.md`, an accepted ADR, or a glossary term.
