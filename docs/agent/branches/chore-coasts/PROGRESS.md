# Progress — `chore-coasts`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — wiring landed; optional host validation `coast build && coast run main`
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md). Tier A: mark teach-back / Challenger `n/a`.

- Tier: A
- Framer session / date: 2026-09-01 (this session)
- Challenger: n/a
- Teach-back: n/a
- `make branch-ready`: Pass (2026-09-01)

## Done (this branch)

- [x] Root `Coastfile` (`name = "patrimo"`, `web = 3000`, Cursor + Claude worktree dirs)
- [x] Shared skill `.agents/skills/coasts/SKILL.md` + Cursor/Claude symlinks + `/coasts` command
- [x] Move `patrimo-harness` to `.agents/skills/` with the same symlink layout
- [x] `AGENTS.md` Coast Runtime + README / local-dev-setup optional setup

## RED evidence (when Layer 2 applies)

n/a — Tier A

## Last verify

- Command: `make verify`
- Result: green (90 files / 606 tests)
- Date: 2026-09-01

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)
Inspired by TheMenu/benefits#4342 — adapted: no compose (Excel SoT), Next stays on host.
Cursor skill symlinks use `../../.agents/...` (benefits PR used an extra `../` that does not resolve).
