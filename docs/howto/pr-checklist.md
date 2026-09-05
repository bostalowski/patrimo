# PR checklist (harness)

This page is a human-readable summary. The actual gate is `make pr-check`
(gate G6 in [feature-flow.md](feature-flow.md)) — it replays `branch-ready`,
checks RED evidence, Checker Pass recency/citation, and diff size, and the
CI `harness` job runs it on every `pull_request`. Do not treat this list as
the enforcement mechanism; treat it as what `make pr-check` is checking.

Before merge:

- [ ] `make pr-check` is green (or its Tier-A subset, when Layer 2 is `n/a`).
- [ ] Layer 1: `make verify` is green locally (CI `verify` job).
- [ ] Layer 3: `make e2e` green when the PR touches web UI, `src/app/api`, workbook I/O, or settings (CI `e2e` job always runs smoke).
- [ ] `make gauntlet` is green on a diff touching `@patrimo/core`, workbook I/O, or `src/app/api` (CONSTRAINTS §27).
- [ ] If you changed code under `packages/core`, `src/`, `mobile/`, or `electron/`, the neighboring `ARCHITECTURE.md` (or topic note) still matches reality.
- [ ] New concepts appear in [docs/reference/glossary.md](docs/reference/glossary.md) when they are canonical names.
- [ ] Structuring decisions have an ADR when required by [docs/DOC_MODEL.md](docs/DOC_MODEL.md).
- [ ] [FEATURES.md](../FEATURES.md) matrix updated if platform status changed; branch [CONTRACT/PROGRESS](../agent/branches/README.md) present for scoped work; root [PROGRESS.md](../PROGRESS.md) only if useful as a `main` pointer.
- [ ] Non-trivial product PRs: [maker/checker](maker-checker.md) Pass noted in PROGRESS with cited evidence (not just a bare `Pass` line).
- [ ] Tax copy remains indicative unless an accepted ADR says otherwise.
- [ ] On the last tranche of a CONTRACT that merges: `make rework-log-stamp`, and if `make pr-check` reports overlap with unreworked rows, set those rows' `Reworked?` to `yes` in the same PR.
