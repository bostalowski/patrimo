---
name: coasts
description: Inspect and control Coast instances for the current checkout. Use
  when the user says "/coasts", asks to assign or reassign a Coast, wants to
  run commands or read logs in the matching Coast, wants to create a new Coast,
  or explicitly asks to open Coast UI.
---

# Coasts

Use the Coast CLI directly. Do not add wrappers.

## Orient Yourself

Start by exploring the CLI and docs:

  coast                                             # see all available commands
  coast docs                                        # list all doc pages
  coast search-docs "your question"                 # semantic search

When anything about Coast behavior is unclear, read the docs before guessing:

  coast docs --path concepts_and_terminology/RUN.md
  coast docs --path concepts_and_terminology/BUILDS.md
  coast docs --path concepts_and_terminology/ASSIGN.md
  coast docs --path concepts_and_terminology/PORTS.md
  coast docs --path coastfiles/README.md

## Quick Start

Route requests into one of these modes:

1. **Use Coast** — run `coast lookup`, then use `coast exec`, `coast ps`,
   or `coast logs` with the matching instance.
2. **Create or Assign** — run `coast ls`, then `coast run` to create a new
   Coast or `coast assign` to repoint an existing one.
3. **Open UI** — run `coast ui`.

## What Runs Where

The host and the Coast share the filesystem. Only use `coast exec` for things
that need running services inside the container.

**Use `coast exec` for:**
- Commands that need processes running inside the Coast (if `[services.*]` is added)
- Service restarts or compose operations (if a compose file is added later)
- Shells into the Coast DinD (`coast exec <instance>`)

**Run on the host:**
- Linting (`eslint`), typechecking (`tsc`), formatting
- Git operations
- `npm install` / `make setup`
- Unit tests (`npm test`, `make verify`)
- Next.js (`npm run dev` → 3000) and Electron (`npm run electron:dev`)
- Playwright and browser tests — run the browser on the host. E2e already
  starts its own Next on `:3100` (`FINGRAPHS_E2E_PORT`); do NOT run Playwright
  inside the Coast via `coast exec`. If hitting a Coast-hosted web later,
  prefer the dynamic port from `coast ports` unless the user says otherwise.
- Mobile Expo (`cd mobile && npm start`)
- Static analysis, code generation

Example — Playwright (host, isolated e2e server):

  make e2e
  # or: FINGRAPHS_E2E_PORT=3120 make e2e

## Create and Assign

When `coast lookup` returns no match:

1. Run `coast ls` to see available slots.
2. Prefer `coast run <name> -w <worktree>` to create and assign in one step.
3. If no build exists yet, run `coast build` first.
4. After creating, rerun `coast lookup` to confirm.

When you want to switch an existing Coast to a different worktree:

  coast assign <name> -w <worktree>

That also works for an already assigned or checked-out Coast, but ask the user
first before reassigning an occupied slot.

## Coastfile Setup

If the project needs a new or modified Coastfile, read the docs first:

  coast docs --path coastfiles/README.md

The Coastfile docs cover compose setup, ports, volumes, secrets, shared
services, bare services, and inheritance.

## Safety Rules

- Run `coast lookup` before taking action and again after any topology change.
- Ask before `coast assign`, `coast unassign`, or `coast checkout` if it would
  disrupt an existing slot.
- Prefer creating a new Coast over reusing a checked-out or already-assigned
  one unless the user explicitly wants the existing slot to be reassigned.
- Use `coast docs` or `coast search-docs` before guessing.

## Patrimo specifics

- No compose stack today: workbook Excel is the source of truth (no postgres /
  redis). The Coastfile declares `web = 3000` for port remapping / checkout.
- Classic `npm run dev` (and `make verify` / `make e2e`) remains valid when no
  Coast is assigned. Do not force `coast run` for every session — ask first
  (memory heavy).
- Product harness (`make verify`, `make branch-*`, CONTRACT/DoD) stays on the
  host — see `.agents/skills/patrimo-harness/SKILL.md`. Coasts does not replace it.
- Cursor Parallel Agents: worktrees under `~/.cursor/worktrees/patrimo`
  (see `worktree_dir` in the root Coastfile). Claude Code: `.claude/worktrees`.
- To run Next inside Coast later: add `[services.web]` (Node 24 via
  `[coast.setup]`) and keep `private_paths = [".next"]`.
