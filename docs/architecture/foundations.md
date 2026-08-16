# Foundations

Mechanical invariants that remain true across Patrimo platforms. Canonical terms live in the [glossary](../reference/glossary.md).

## System shape

```text
                    +------------------+
                    |  Excel workbook  |  source of truth
                    +--------+---------+
                             |
           +-----------------+-----------------+
           |                                   |
           v                                   v
   Web / Electron adapters              Mobile adapters
   (fs + API routes + JSON)             (xlsx buffer + Drive/local
                                         + AsyncStorage)
           |                                   |
           +-----------------+-----------------+
                             |
                             v
                      @patrimo/core
                 schema · portfolio · deletion
                 tax estimates · projection · DCA
```

## Invariants

1. **Workbook authority** — Portfolio positions are computed from workbook transactions plus the latest known prices. Removing a price cache entry never removes a transaction.
2. **Required sheets** — A valid workbook contains at least `Transactions`, `Actifs`, and `Comptes`. `Budget`, `Immobilier`, `DCA`, `Prix manuels`, and `Exposition geo` are optional and created when first needed.
3. **Pure core mutations** — Modules such as `deletion.ts` transform an in-memory `Workbook` and do not perform I/O. Platforms persist the result with one workbook write.
4. **Config path precedence (web/Electron)** — `data/config.json` `excelPath` wins over `EXCEL_PATH`.
5. **Production workbook cache** — Web `loadWorkbook()` may reuse an in-memory cache when `mtimeMs` is unchanged and `NODE_ENV === "production"`. Writes clear the cache.
6. **Atomic workbook replace (web)** — `writeWorkbook` writes a temporary file then `renameSync`s onto the target path.
7. **No account semantics** — `__NO_ACCOUNT__` is a reserved transaction reference, not a `Comptes` row. Positions remain in net worth and performance; tax estimates skip those transactions; new transaction forms exclude the identifier.
8. **Tax estimates are simplified** — Rates and holding-period heuristics in `tax-rules.ts` are indicative. Progressive IR option and full filing rules are not modeled.
9. **Concurrent edits** — Multiple writers of the same workbook follow last-writer-wins. There is no distributed lock.
10. **Platform feature gaps** — Shared core does not imply identical UI coverage. See [Platforms](../overview/platforms.md).

## Guardrails for contributors

- Do not duplicate deletion, PRU, or tax rules outside `@patrimo/core`.
- Do not treat `prices.json` or mobile AsyncStorage automatic prices as recoverable portfolio history. Manual prices live in the workbook sheet `Prix manuels`.
- Do not offer `__NO_ACCOUNT__` or `__UNASSIGNED_CASH__` as user-selectable entities when creating data.
- When adding a workbook field, update `packages/core/src/schema.ts`, `workbook-template.ts`, and both platform serializers together.

## See also

- [Key principles](../overview/key-principles.md)
- [Workbook persistence](workbook-persistence.md)
- [Deletion pipeline](deletion-pipeline.md)
- [ADR 0001](../adr/0001-share-deletion-rules-across-platforms.md)
- [ADR 0002](../adr/0002-store-manual-prices-in-workbook.md)
- [ADR 0008](../adr/0008-geographic-allocation.md)
- [ADR 0009](../adr/0009-account-detail-and-mobile-justetf.md)
- [Manual price persistence](manual-price-persistence.md)
- [Geographic allocation](geographic-allocation.md)
