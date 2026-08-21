# PR checklist (harness)

Before merge:

- [ ] Layer 1: `make verify` is green locally (CI `verify` job).
- [ ] Layer 3: `make e2e` green when the PR touches web UI, `src/app/api`, workbook I/O, or settings (CI `e2e` job always runs smoke).
- [ ] If you changed code under `packages/core`, `src/`, `mobile/`, or `electron/`, the neighboring `ARCHITECTURE.md` (or topic note) still matches reality.
- [ ] New concepts appear in [docs/reference/glossary.md](docs/reference/glossary.md) when they are canonical names.
- [ ] Structuring decisions have an ADR when required by [docs/DOC_MODEL.md](docs/DOC_MODEL.md).
- [ ] [FEATURES.md](../FEATURES.md) matrix updated if platform status changed; branch [CONTRACT/PROGRESS](../agent/branches/README.md) present for scoped work; root [PROGRESS.md](../PROGRESS.md) only if useful as a `main` pointer.
- [ ] Non-trivial product PRs: [maker/checker](maker-checker.md) Pass noted (run log or PR description).
- [ ] Tax copy remains indicative unless an accepted ADR says otherwise.
