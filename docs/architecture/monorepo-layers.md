# Monorepo layers

Patrimo is an npm workspaces monorepo.

## Packages

| Path | Package | Responsibility |
|---|---|---|
| `packages/core` | `@patrimo/core` | Schema, pure calculations, workbook template headers, deletion |
| `src/` | `patrimo` (root) | Next.js web UI, API routes, Excel/fs adapters, price fetchers |
| `electron/` | (root main) | Desktop shell, embedded Next server, native menus, auto-update |
| `mobile/` | `patrimo-mobile` | Expo app, client-side workbook I/O, Drive OAuth, spot prices |

## Dependency direction

```text
mobile  ----------+
                  |
web (src/) -------+---->  @patrimo/core
                  |
electron ---------+  (hosts web; does not reimplement domain math)
```

Web modules under `src/lib/*.ts` often re-export `@patrimo/core` entry points so App Router code can import via `@/lib/...`.

## What belongs where

| Change | Put it in |
|---|---|
| New transaction type semantics, PRU rule, tax constant | `packages/core` |
| New Excel column / sheet header | `packages/core` schema + `workbook-template.ts`, then both serializers |
| New REST mutation | `src/app/api/...` calling core + `src/lib/excel.ts` |
| New mobile write path | `mobile/lib/write-*.ts` calling core + `excel-mobile` |
| Native file dialog / update check | `electron/` |

## Tooling

| Concern | Location |
|---|---|
| Web/Electron scripts | root `package.json` |
| Mobile scripts | `mobile/package.json` |
| Shared tests (Vitest) | root `npm test` — includes `src/` and `mobile/` suites configured in `vitest.config.ts` |
| Release DMG | `.github/workflows/release.yml` on `v*` tags |

## See also

- [Foundations](foundations.md)
- [Platforms](../overview/platforms.md)
- [Local development setup](../howto/local-dev-setup.md)
