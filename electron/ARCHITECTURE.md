# Electron architecture (`electron/`)

Desktop shell that embeds the Next.js web app. Does not reimplement portfolio math.

Hard rules: [CONSTRAINTS.md](../CONSTRAINTS.md). Web map: [src/ARCHITECTURE.md](../src/ARCHITECTURE.md).

## Codemap

| Concern | Where |
|---|---|
| Main process | `electron/main.cjs` |
| Window / menu / IPC | same |
| Packaged data dir | Application Support via `FINGRAPHS_DATA_DIR` |
| Auto-update / GitHub releases | main process helpers |
| Builder config | `electron-builder.yml` |
| Scripts | root `package.json` (`electron:dev`, `electron:build`, `electron:pack`) |

## Boundaries

- Electron hosts Next; domain rules stay in `@patrimo/core`.
- Native concerns only: file dialogs, menus, update checks, packaging.
- Release CI: `.github/workflows/release.yml` and `release-on-merge.yml`.

## See also

- [docs/howto/cut-a-desktop-release.md](../docs/howto/cut-a-desktop-release.md)
- [docs/howto/local-dev-setup.md](../docs/howto/local-dev-setup.md)
