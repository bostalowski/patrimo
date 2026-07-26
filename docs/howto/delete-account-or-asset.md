# Delete an account or asset

Shared rules live in `@patrimo/core`. UI differs by platform; behavior must not.

## Before you delete

Deletion is irreversible. Confirm impact counts in the dialog/modal (transactions, orphaned assets, investment plans, price cache keys).

## Delete an account

1. Open the account on web (**Comptes**) or mobile (**Comptes** → edit screen).
2. Start delete and choose a mode:
   - **Cascade** — remove every transaction where the account is source or destination; then remove assets that become unreferenced; remove those assets' manual prices; clean empty DCA baskets/plans; clear local automatic price cache keys for deleted assets.
   - **Detach** — rewrite account references to **No account** (`__NO_ACCOUNT__`); convert savings history to **Unassigned cash** when applicable; keep assets, plans, and manual prices.
3. Confirm.

## Delete an asset

1. Open the asset (mobile: edit screen).
2. Confirm cascade: remove the asset, all referencing transactions, its manual prices, DCA references, empty plans, and local automatic price cache keys.

## Afterward

- Workbook write succeeded → portfolio no longer lists the entity.
- If web reports `cacheCleanupPending: true`, the workbook is already updated; stale price keys may remain until cleaned later.

## See also

- [Deletion pipeline](../architecture/deletion-pipeline.md)
- [ADR 0001](../adr/0001-share-deletion-rules-across-platforms.md)
- [Glossary](../reference/glossary.md) — Detach, Cascade deletion, No account
