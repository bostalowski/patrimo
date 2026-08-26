# Agent guidance

Patrimo is a local wealth-tracking app: an Excel workbook is the portfolio source of truth; `@patrimo/core` owns domain math; web/Electron and mobile are adapters.

## Always load first

1. [CONSTRAINTS.md](CONSTRAINTS.md) — hard MUST / MUST NOT
2. [docs/reference/glossary.md](docs/reference/glossary.md) — canonical names
3. Branch handoff: `make branch-status` (or `docs/agent/branches/<slug>/PROGRESS.md`). On `main`, root [PROGRESS.md](PROGRESS.md).

Then read the `ARCHITECTURE.md` for the package you touch (see below).

## Run and verify

```bash
make setup              # npm ci
make verify             # layer 1: lint + typecheck + unit tests
make e2e                # layer 3: Playwright workbook smoke
make verify-full        # layers 1 + 3
make init               # setup + verify + branch status + gaps + cold-start
make branch-contract    # create CONTRACT + PROGRESS for current feature branch
make branch-status      # print branch cadrage / handoff
make branch-ready       # gate: cadrage filled, no blocker — run before coding
make platform-gaps      # list FEATURES matrix rows still open (inventory, not a claim)
make cold-start         # score whether the repo answers the five cold-start questions
```

Equivalent: `npm run verify` / `npm run verify-full`. Feature-scoped tests: `npm test -- <path>`.

### Definition of Done (three layers)

| Layer | Command | When |
|---|---|---|
| 1 Syntax / static | `make verify` | Always before claiming done |
| 2 Behavior | targeted `npm test -- <path>` | Any behavior change |
| 3 System | `make e2e` / `make verify-full` | Web UI, `src/app/api`, workbook I/O, settings |

When Layer 2 applies: implement each CONTRACT case as **RED → GREEN** (failing targeted test for the missing behavior, then minimal production code). Procedure: [docs/howto/tdd-red-green.md](docs/howto/tdd-red-green.md). Skip when CONTRACT Layer 2 is `n/a`.

Do not declare victory on layer 1 alone when layer 3 applies. One CONTRACT per feature branch — see [docs/agent/branches/README.md](docs/agent/branches/README.md). Lint currently gates `packages/core` + `src` (mobile lint debt is out of gate).

### Maker ≠ checker

The agent that implements MUST NOT be the sole judge of completion. After green verify, run a **checker** pass (fresh session or explicit checker role) against the branch CONTRACT. Procedure: [docs/howto/maker-checker.md](docs/howto/maker-checker.md). Rubric: [docs/agent/scoring-rubric.md](docs/agent/scoring-rubric.md).

### Session artifacts

Before coding: feature branch → `make branch-contract` → fill CONTRACT. Update branch PROGRESS during the session. Optional dated notes under `docs/agent/runs/`.

On merge: update root [FEATURES.md](FEATURES.md) matrix if platform status changed; root PROGRESS only as a short `main` pointer.

Autonomous loops: [docs/howto/agent-loop.md](docs/howto/agent-loop.md).

## When to read what

| Read | When |
|---|---|
| [packages/core/ARCHITECTURE.md](packages/core/ARCHITECTURE.md) | Schema, portfolio math, deletion, tax, projection, workbook sheets |
| [src/ARCHITECTURE.md](src/ARCHITECTURE.md) | Next.js UI, API routes, Excel/fs adapters, web price sync |
| [mobile/ARCHITECTURE.md](mobile/ARCHITECTURE.md) | Expo app, Drive/local I/O, mobile UI gaps |
| [electron/ARCHITECTURE.md](electron/ARCHITECTURE.md) | Desktop shell, menus, auto-update |
| [docs/adr/](docs/adr/index.md) | Why a decision was taken; options and contract |
| [docs/howto/](docs/howto/) | Step-by-step procedures (dev setup, release, [tdd-red-green](docs/howto/tdd-red-green.md), implement-*) |
| [docs/overview/platforms.md](docs/overview/platforms.md) | Current web vs mobile capability matrix |
| [docs/DOC_MODEL.md](docs/DOC_MODEL.md) | Where knowledge lives in this repo |

## Session lifecycle

1. **Init:** `make init` (or `make branch-status` + verify baseline).
2. **Contract:** on a feature branch, `make branch-contract` (or edit existing CONTRACT) → `make branch-ready` must pass.
3. **Work:** implement that contract only. When Layer 2 applies: per case **RED → GREEN** ([tdd-red-green.md](docs/howto/tdd-red-green.md)), record RED evidence in branch PROGRESS; update colocated ARCHITECTURE / ADR / glossary with the code.
4. **Verify:** layers required by DoD above. Never claim done on failing verify.
5. **Check:** maker/checker pass against CONTRACT + rubric.
6. **Handoff:** update `docs/agent/branches/<slug>/PROGRESS.md`. On merge, sync FEATURES matrix + short note on root PROGRESS if useful.

## Next.js

<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know.

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
