# Web / Electron app architecture (`src/`)

Next.js App Router UI, API routes, Excel/fs adapters, and web price fetchers. Domain math stays in `@patrimo/core` (re-exported via `@/lib/...` where needed).

Hard rules: [CONSTRAINTS.md](../CONSTRAINTS.md). Core map: [packages/core/ARCHITECTURE.md](../packages/core/ARCHITECTURE.md).

## Codemap

| Area | Where |
|---|---|
| Excel load/save | `src/lib/excel.ts`, `src/lib/config.ts` — [workbook-persistence.md](workbook-persistence.md) |
| Price sync | `src/lib/prices/*`, `src/app/api/prices/*` — [price-sync.md](price-sync.md) |
| REST mutations | `src/app/api/**` calling core + excel helpers |
| UI pages | `src/app/**` |
| Invested display | [asset-invested-display.md](asset-invested-display.md) |
| Desktop shell | [electron/ARCHITECTURE.md](../electron/ARCHITECTURE.md) |

## Dependency direction

```text
src/  ----->  @patrimo/core
electron/ hosts Next; does not reimplement domain math
```

## What belongs here

| Change | Put it in `src/` |
|---|---|
| New REST mutation | `src/app/api/...` + excel adapter |
| Web-only UI | `src/app` / `src/components` |
| Automatic price fetchers | `src/lib/prices/` |

When adding a workbook field: update core schema/template **and** both platform serializers together.

## Topic notes

- [workbook-persistence.md](workbook-persistence.md)
- [price-sync.md](price-sync.md)
- [asset-invested-display.md](asset-invested-display.md)
- Platforms matrix: [docs/overview/platforms.md](../docs/overview/platforms.md)
- How-to setup: [docs/howto/local-dev-setup.md](../docs/howto/local-dev-setup.md)
