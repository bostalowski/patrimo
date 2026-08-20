# Agent guidance

Patrimo is a local wealth-tracking app: an Excel workbook is the portfolio source of truth; `@patrimo/core` owns domain math; web/Electron and mobile are adapters.

## Always load first

1. [CONSTRAINTS.md](CONSTRAINTS.md) — hard MUST / MUST NOT
2. [docs/reference/glossary.md](docs/reference/glossary.md) — canonical names
3. [PROGRESS.md](PROGRESS.md) — current session state

Then read the `ARCHITECTURE.md` for the package you touch (see below).

## Run and verify

```bash
make setup           # npm ci
make verify          # layer 1: lint + typecheck + unit tests
make e2e             # layer 3: Playwright workbook smoke
make verify-full     # layers 1 + 3
make init            # scripts/agent-init.sh (setup + verify + PROGRESS + open contracts)
make next-feature    # print the next open FEATURES contract
make cold-start      # score whether the repo answers the five cold-start questions
```

Equivalent: `npm run verify` / `npm run verify-full`. Feature-scoped tests: `npm test -- <path>`.

### Definition of Done (three layers)

| Layer | Command | When |
|---|---|---|
| 1 Syntax / static | `make verify` | Always before claiming done |
| 2 Behavior | targeted `npm test -- <path>` | Any behavior change |
| 3 System | `make e2e` / `make verify-full` | Web UI, `src/app/api`, workbook I/O, settings |

Do not declare victory on layer 1 alone when layer 3 applies. One feature at a time — see [FEATURES.md](FEATURES.md). Lint currently gates `packages/core` + `src` (mobile lint debt is out of gate).

### Maker ≠ checker

The agent that implements MUST NOT be the sole judge of completion. After green verify, run a **checker** pass (fresh session or explicit checker role) against the sprint contract. Procedure: [docs/howto/maker-checker.md](docs/howto/maker-checker.md). Rubric: [docs/agent/scoring-rubric.md](docs/agent/scoring-rubric.md).

### Session artifacts

Before coding a feature: copy [docs/agent/sprint-contract.md](docs/agent/sprint-contract.md) into the run log or paste a short contract into PROGRESS.

After the session: update PROGRESS; optionally add `docs/agent/runs/YYYY-MM-DD-slug.md` from [docs/agent/runs/README.md](docs/agent/runs/README.md).

Autonomous loops (goal/cron): [docs/howto/agent-loop.md](docs/howto/agent-loop.md).

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
2. **Contract:** pick one open FEATURES row (`make next-feature`); write a sprint contract.
3. **Work:** implement that item only; update colocated ARCHITECTURE / ADR / glossary with the code.
4. **Verify:** layers required by DoD above. Never claim done on failing verify.
5. **Check:** maker/checker pass against contract + rubric.
6. **Handoff:** update PROGRESS.md (done / in-progress / blocked / last verify). Optional run log under `docs/agent/runs/`.

## Next.js

<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know.

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
