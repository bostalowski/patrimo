# Local development setup

## Prerequisites

- Node.js 24+ (see `.nvmrc`; `engines.node` is `>=24`)
- npm
- For mobile: Android/iOS toolchain as required by Expo 57 (JDK 17–21 for Android builds)
- For Electron packaging: macOS (DMG targets are mac-only in `electron-builder.yml`)

## Install

From the repository root:

```bash
npm install
```

## Web (browser)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On a fresh checkout (no `data/config.json` yet), `predev` auto-seeds a sample
workbook (`data-fixtures/sample-portfolio.xlsx` → `data/sample-portfolio.xlsx`)
so portfolio pages have data immediately — dev-only, see
`scripts/ensure-dev-data.mjs`. It never overwrites an existing
`data/config.json`; point **Réglages** at your own `.xlsx` at any time to
replace it. Production builds (`build`, `start`, `electron:build`,
`electron:pack`) never run this step.

Optional env file: copy `.env.local.example` to `.env.local`.

## Electron (desktop window)

```bash
npm run electron:dev
```

Starts Next.js and opens an Electron window on `localhost:3000`.

## Mobile

```bash
cd mobile
npm start
```

Opens Metro and can load the app in Expo Go. For Google Drive OAuth, Expo Go is not supported (Google rejects `exp://` redirect URIs). Use a native build instead:

```bash
cd mobile
npm run android
# or
npm run ios
```

`npm run android` picks a JDK 17–21 and the Android SDK automatically when possible. Google Drive also needs `EXPO_PUBLIC_GOOGLE_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (see `mobile/.env.example`).

## Test and lint

```bash
make verify        # verify-static: lint + typecheck + unit tests
make e2e           # verify-e2e: Playwright workbook smoke (isolated Next on :3100)
                   # UI PRs: also capture screenshots — docs/howto/ui-screenshots-in-pr.md
make verify-full   # verify-static + verify-e2e
make cold-start         # harness map health (5 questions)
make branch-contract    # CONTRACT + PROGRESS for current feature branch
make branch-status      # print branch cadrage
make branch-ready       # cadrage gate before coding
make platform-gaps      # FEATURES matrix rows still open (inventory)
```

Or: `npm run verify` / `npm run verify-full`. Agent session bootstrap: `make init`.

## Optional: Coasts

[Coasts](https://coasts.dev) — root [`Coastfile`](../../Coastfile) + skill
[`.agents/skills/coasts/`](../../.agents/skills/coasts/SKILL.md). Isolates ports /
worktree bind mounts for parallel agents. Not part of DoD; classic `npm run dev`
stays the default. See `AGENTS.md` → **Coast Runtime**.

## Build artifacts

| Command | Output |
|---|---|
| `npm run build` | Next production build |
| `npm run electron:pack` | Unpackaged `.app` under `release/` |
| `npm run electron:build` | `.dmg` / `.zip` under `release/` |

## See also

- [Configure the Excel source](configure-excel-source.md)
- [Monorepo layers](../architecture/monorepo-layers.md)
- Root [README](../../README.md) for end-user install
