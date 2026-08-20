# PR checklist (harness)

Before merge:

- [ ] `make verify` is green locally (CI runs the same).
- [ ] If you changed code under `packages/core`, `src/`, `mobile/`, or `electron/`, the neighboring `ARCHITECTURE.md` (or topic note) still matches reality.
- [ ] New concepts appear in [docs/reference/glossary.md](docs/reference/glossary.md) when they are canonical names.
- [ ] Structuring decisions have an ADR when required by [docs/DOC_MODEL.md](docs/DOC_MODEL.md).
- [ ] [FEATURES.md](../FEATURES.md) / [PROGRESS.md](../PROGRESS.md) updated if the change closes or starts scoped work.
- [ ] Tax copy remains indicative unless an accepted ADR says otherwise.
- [ ] For workbook-path or settings changes, consider `make e2e` (Playwright smoke).
