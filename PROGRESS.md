# Progress

Session handoff for agents and humans. Update at end of every meaningful session.

## Current focus

- **In progress:** none (harness alignment wave complete)
- **Blocked:** none

## Done (recent)

- [x] CONSTRAINTS.md + AGENTS.md router + docs/DOC_MODEL.md
- [x] Makefile / npm verify + typecheck + CI workflow
- [x] PROGRESS.md / FEATURES.md
- [x] Colocated ARCHITECTURE.md (core / src / mobile / electron) + topic notes + architecture stubs
- [x] Playwright workbook critical-path e2e (`make e2e`)
- [x] Agent init script + Cursor harness rule + PR checklist + cold-start howto
- [x] Lint gate scoped to `packages/core` + `src` (mobile lint debt deferred)

## Next

- [ ] Expand mobile lint into the verify gate when debt is paid down
- [ ] Optionally add `make e2e` to CI (`verify-full`)
- [ ] Run a cold-start test in a fresh session ([docs/howto/cold-start-test.md](docs/howto/cold-start-test.md))

## Last verify

- Command: `make verify` (+ `npm run e2e`)
- Result: pass
- Date: 2026-08-20

## Notes

Keep this file short. Detailed run notes go under `docs/agent/runs/`.
