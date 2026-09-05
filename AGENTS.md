# Agent guidance

Patrimo is a local wealth-tracking app: an Excel workbook is the portfolio source of truth; `@patrimo/core` owns domain math; web/Electron and mobile are adapters.

## Always load first

1. [CONSTRAINTS.md](CONSTRAINTS.md) — hard MUST / MUST NOT
2. [docs/reference/glossary.md](docs/reference/glossary.md) — canonical names
3. Branch handoff: `make branch-status` (or `docs/agent/branches/<slug>/PROGRESS.md`). On `main`, root [PROGRESS.md](PROGRESS.md).
4. [docs/howto/feature-flow.md](docs/howto/feature-flow.md) — the canonical cadrage → merge sequence (gates G0–G7) referenced throughout this file

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
make branch-ready       # gate: cadrage filled (Tier B: Intent/decisions/teach-back) — before coding
make platform-gaps      # list FEATURES matrix rows still open (inventory, not a claim)
make cold-start         # score whether the repo answers the five cold-start questions
make red CASE=… CMD=…   # gate: write RED evidence only if CMD actually fails (docs/howto/tdd-red-green.md)
make gauntlet           # gate: test-removal guard + scoped mutation on @patrimo/core diffs
make checker            # gate: Checker role in an isolated worktree, PROGRESS-only writes
make pr-check           # gate: branch-ready + RED evidence + Checker Pass recency + diff-size signal
```

Optional isolated runtimes: root [`Coastfile`](Coastfile) + [Coasts](https://coasts.dev)
(see **Coast Runtime** below and [`.agents/skills/coasts/`](.agents/skills/coasts/SKILL.md)).

Equivalent: `npm run verify` / `npm run verify-full`. Feature-scoped tests: `npm test -- <path>`.

### Definition of Done (three layers)

| Layer | Command | When |
|---|---|---|
| 1 Syntax / static | `make verify` | Always before claiming done |
| 2 Behavior | targeted `npm test -- <path>` | Any behavior change |
| 3 System | `make e2e` / `make verify-full` | Web UI, `src/app/api`, workbook I/O, settings |

When Layer 2 applies: **cadrage lock** first ([docs/howto/cadrage-lock.md](docs/howto/cadrage-lock.md) — Intent, decisions, teach-back, Framer ≠ Maker), then implement each CONTRACT behavior case as **RED → GREEN** (failing targeted test for the missing behavior, then minimal production code). Procedure: [docs/howto/tdd-red-green.md](docs/howto/tdd-red-green.md). Skip cadrage-lock deep checks and RED → GREEN when CONTRACT Layer 2 is `n/a` (Tier A).

Do not declare victory on layer 1 alone when layer 3 applies. One CONTRACT per feature branch — see [docs/agent/branches/README.md](docs/agent/branches/README.md). Lint currently gates `packages/core` + `src` (mobile lint debt is out of gate).

### Framer ≠ Maker ≠ checker

- **Cadrage:** Framer fills CONTRACT; Challenger when `Challenger: required`; human teach-back; then `make branch-ready`. Procedure: [docs/howto/cadrage-lock.md](docs/howto/cadrage-lock.md).
- **Done:** The agent that implements MUST NOT be the sole judge of completion. After green verify, run a **checker** pass (fresh session or explicit checker role) against the branch CONTRACT. Procedure: [docs/howto/maker-checker.md](docs/howto/maker-checker.md). Rubric: [docs/agent/scoring-rubric.md](docs/agent/scoring-rubric.md).

### Session artifacts

Before coding: feature branch → `make branch-contract` → Framer fills CONTRACT (Tier B: Intent / cases / decisions / teach-back) → `make branch-ready`. Update branch PROGRESS during the session. Optional dated notes under `docs/agent/runs/`.

On merge: update root [FEATURES.md](FEATURES.md) matrix if platform status changed; root PROGRESS only as a short `main` pointer. The rework-log row lands **in the merging PR** (`make pr-check` requires it).

Autonomous loops: [docs/howto/agent-loop.md](docs/howto/agent-loop.md).

## When to read what

| Read | When |
|---|---|
| [packages/core/ARCHITECTURE.md](packages/core/ARCHITECTURE.md) | Schema, portfolio math, deletion, tax, projection, workbook sheets |
| [src/ARCHITECTURE.md](src/ARCHITECTURE.md) | Next.js UI, API routes, Excel/fs adapters, web price sync |
| [mobile/ARCHITECTURE.md](mobile/ARCHITECTURE.md) | Expo app, Drive/local I/O, mobile UI gaps |
| [electron/ARCHITECTURE.md](electron/ARCHITECTURE.md) | Desktop shell, menus, auto-update |
| [docs/adr/](docs/adr/index.md) | Why a decision was taken; options and contract |
| [docs/howto/feature-flow.md](docs/howto/feature-flow.md) | The canonical G0–G7 gate sequence from cadrage to merge |
| [docs/howto/](docs/howto/) | Step-by-step procedures (dev setup, release, [cadrage-lock](docs/howto/cadrage-lock.md), [tdd-red-green](docs/howto/tdd-red-green.md), implement-*) |
| [docs/overview/platforms.md](docs/overview/platforms.md) | Current web vs mobile capability matrix |
| [docs/DOC_MODEL.md](docs/DOC_MODEL.md) | Where knowledge lives in this repo |
| [`.agents/skills/patrimo-harness/`](.agents/skills/patrimo-harness/SKILL.md) | Shared skill (Cursor + Claude) — procedural checklist (start / done / harness keywords). |
| [`Coastfile`](Coastfile) + [`.agents/skills/coasts/`](.agents/skills/coasts/SKILL.md) | Isolated local runtimes (Coasts) for parallel worktrees / agents — optional; classic `npm run dev` stays valid. |

## Session lifecycle

Full gate-by-gate sequence: [docs/howto/feature-flow.md](docs/howto/feature-flow.md) (G0–G7). Summary:

1. **Init:** `make init` (or `make branch-status` + verify baseline).
2. **Cadrage:** on a feature branch, `make branch-contract` → Framer (and Challenger if required) + teach-back when Tier B, including a `## Tranches` table assigning every behavior case to a PR-sized slice → `make branch-ready` must pass ([cadrage-lock.md](docs/howto/cadrage-lock.md)).
3. **Work:** implement one tranche at a time. When Layer 2 applies: per case **RED → GREEN** ([tdd-red-green.md](docs/howto/tdd-red-green.md)), record RED evidence in branch PROGRESS; update colocated ARCHITECTURE / ADR / glossary with the code.
4. **Verify:** layers required by DoD above, then `make gauntlet` (test-removal guard + scoped mutation on `@patrimo/core`, workbook I/O, or API-route diffs — CONSTRAINTS §27). Never claim done on failing verify or gauntlet.
5. **Check:** `make checker` (isolated worktree) scores the tranche against CONTRACT + rubric; then `make pr-check` before opening the tranche's PR.
6. **Handoff:** update `docs/agent/branches/<slug>/PROGRESS.md`. Before the merging PR: `make rework-log-stamp`. If `pr-check` reports unreworked path overlap, run `make rework-log-propose` (or ask the human, then `REWORK_ACK=yes|no make rework-log-propose`) — never silent markdown edits. On merge: sync FEATURES matrix if needed; short root PROGRESS note if useful.

## Next.js

<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know.

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Coast Runtime

This project **optionally** uses [Coasts](https://coasts.dev) — isolated DinD
runtimes (ports / worktree bind mounts) when working with parallel worktrees or
agents. There is no postgres/redis stack: the Excel workbook is the portfolio
source of truth. The classic host path (`npm run dev` → :3000) remains valid
and is still the default for day-to-day single-checkout work.

The filesystem is shared between the host and the Coast container, so file
edits on either side are visible immediately.

Full workflow: [`.agents/skills/coasts/SKILL.md`](.agents/skills/coasts/SKILL.md)
(also exposed as `.cursor/skills/coasts` and `.claude/skills/coasts`).
Session harness skill: [`.agents/skills/patrimo-harness/`](.agents/skills/patrimo-harness/SKILL.md).

## Discovery

Before the first **Coast** runtime command in a session, run:

```bash
coast lookup
```

This prints the instance name, ports, and example commands. Use that instance
name for subsequent `coast exec` / `coast ports` / `coast logs` calls.

If `coast lookup` has no match, the classic host path is fine — do not create a
Coast unless the user wants isolation / parallel runtimes (Coasts are memory
intensive). Ask before `coast run`.

## What runs where

Only use `coast exec` for things that need the container runtime. Everything
else runs on the host.

Use `coast exec` for:
- Shells into the Coast DinD when debugging the Coast itself
- Commands that need processes defined under `[services.*]` (none today)

Run directly on the host:
- Linting / typecheck / unit tests (`make verify`)
- Git, file search, code generation, `npm install`
- Next.js (`npm run dev` → port 3000) unless a `[services.web]` entry is added
  to the Coastfile later
- Electron (`npm run electron:dev`), Expo mobile
- Playwright e2e (`make e2e` — own Next on `:3100`, never via `coast exec`)

## Creating and assigning

- Prefer `coast assign <existing> -w <worktree>` over creating a new instance.
- Ask before reassigning an occupied Coast or before `coast run`.
- If `coast run` fails for lack of a build: `coast build` first (needs Docker).

## Rules

- Always `coast lookup` before the first Coast runtime command in a session.
- Do not treat Coasts as mandatory when the user is on the classic host path.
- Use `coast docs` / `coast search-docs` before guessing about Coast behavior.
- Harness product commands (`make verify`, `make branch-*`, …) stay on the host —
  they are not replaced by Coasts.
