# Agent guidance

Patrimo is a local wealth-tracking app: an Excel workbook is the portfolio source of truth; `@patrimo/core` owns domain math; web/Electron and mobile are adapters.

## Always load first

1. [CONSTRAINTS.md](CONSTRAINTS.md) — hard MUST / MUST NOT
2. [docs/reference/glossary.md](docs/reference/glossary.md) — canonical names
3. [PROGRESS.md](PROGRESS.md) — current session state

Then read the `ARCHITECTURE.md` for the package you touch (see below).

## Run and verify

```bash
make setup         # npm ci
make verify        # lint + typecheck + unit tests
make verify-full   # verify + Playwright e2e
make init          # scripts/agent-init.sh (setup + verify + PROGRESS)
```

Equivalent: `npm run verify`. Feature-scoped tests: `npm test -- <path>`.

**Stop criteria:** do not declare victory without green `make verify` and targeted tests for the feature. One feature at a time — see [FEATURES.md](FEATURES.md). Lint currently gates `packages/core` + `src` (mobile lint debt is out of gate).

## When to read what

| Read | When |
|---|---|
| [packages/core/ARCHITECTURE.md](packages/core/ARCHITECTURE.md) | Schema, portfolio math, deletion, tax, projection, workbook sheets |
| [src/ARCHITECTURE.md](src/ARCHITECTURE.md) | Next.js UI, API routes, Excel/fs adapters, web price sync |
| [mobile/ARCHITECTURE.md](mobile/ARCHITECTURE.md) | Expo app, Drive/local I/O, mobile UI gaps |
| [electron/ARCHITECTURE.md](electron/ARCHITECTURE.md) | Desktop shell, menus, auto-update |
| [docs/adr/](docs/adr/index.md) | Why a decision was taken; options and contract |
| [docs/howto/](docs/howto/) | Step-by-step procedures (dev setup, release, implement-*) |
| [docs/overview/platforms.md](docs/overview/platforms.md) | Current web vs mobile capability matrix |
| [docs/DOC_MODEL.md](docs/DOC_MODEL.md) | Where knowledge lives in this repo |

## Session lifecycle

1. **Init:** `make init` (or read PROGRESS.md + run verify baseline).
2. **Work:** one FEATURES.md item; update colocated ARCHITECTURE / ADR / glossary with the code.
3. **Verify:** `make verify` (+ targeted tests). Never claim done on failing verify.
4. **Handoff:** update PROGRESS.md (done / in-progress / blocked / last verify). Optionally add `docs/agent/runs/YYYY-MM-DD-slug.md`.

## Next.js

<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know.

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
