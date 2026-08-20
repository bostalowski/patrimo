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

Open [http://localhost:3000](http://localhost:3000). Configure an Excel path on **Réglages** before using portfolio pages.

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
make verify        # layer 1: lint + typecheck + unit tests
make e2e           # layer 3: Playwright workbook smoke (starts Next on :3000)
make verify-full   # layers 1 + 3
make cold-start    # harness map health (5 questions)
make next-feature  # next open FEATURES contract
```

Or: `npm run verify` / `npm run verify-full`. Agent session bootstrap: `make init`.

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
