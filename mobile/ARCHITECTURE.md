# Mobile architecture (`mobile/`)

Expo / React Native client. Reads and writes the same Excel workbook contract as web via local file or Google Drive. Domain math stays in `@patrimo/core`.

Hard rules: [CONSTRAINTS.md](../CONSTRAINTS.md). Core map: [packages/core/ARCHITECTURE.md](../packages/core/ARCHITECTURE.md). Gaps: [FEATURES.md](../FEATURES.md), [platforms.md](../docs/overview/platforms.md).

## Codemap

| Area | Where |
|---|---|
| Source abstraction | `mobile/lib/file-source.ts`, `local-file.ts`, `google-drive.ts` |
| Parse / serialize | `mobile/lib/excel-mobile.ts` |
| Writers | `mobile/lib/write-*.ts` calling core |
| Price sync | `mobile/lib/price-sync.ts` → AsyncStorage (not web `prices.json`) |
| UI routes | `mobile/app/**` |
| Projection extras | [projection-extra-contributions.md](projection-extra-contributions.md) |

## Invariants (mobile)

1. One workbook replace/upload after a core transformation.
2. Price-cache cleanup runs after successful workbook write; failure must not roll back the workbook.
3. Manual prices live in workbook sheet `Prix manuels`, not in AsyncStorage.
4. Shared core does not imply full UI parity — document gaps in FEATURES.md / platforms.md.

## What belongs here

| Change | Put it in `mobile/` |
|---|---|
| Mobile write path | `mobile/lib/write-*.ts` + excel-mobile |
| Drive / picker UX | `mobile/lib` + screens |
| Mobile-only UI | `mobile/app` |

## Topic notes

- [projection-extra-contributions.md](projection-extra-contributions.md) — ADR 0004
- Persistence overview (shared): [src/workbook-persistence.md](../src/workbook-persistence.md)
