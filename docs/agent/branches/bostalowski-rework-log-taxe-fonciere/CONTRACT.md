# Contract: Add rework-log row for the taxe foncière feature

- Branch: `bostalowski/rework-log-taxe-fonciere`
- Slug: `bostalowski-rework-log-taxe-fonciere`
- Matrix row (FEATURES.md): n/a — Real estate already `done` on web; no matrix change
- Cadrage tier: A (Layer 2 `n/a`)
- Challenger: n/a

## Intent

n/a — Tier A.

## Behavior cases

n/a — Tier A.

## Product decisions

n/a — Tier A.

## Teach-back

n/a — Tier A.

## Scope

- [x] One behavior for this branch: append one row to `docs/agent/rework-log.md` for the just-merged `bostalowski-ajout-taxe-fonci-re` feature ([PR #77](https://github.com/bostalowski/patrimo/pull/77), merged 2026-09-05), per ADR 0026 D8; note the merge on root `PROGRESS.md`; mark the archived branch CONTRACT On merge checkboxes.
- [x] Files / packages expected to change: `docs/agent/rework-log.md`, root `PROGRESS.md`, `docs/agent/branches/bostalowski-ajout-taxe-fonci-re/{CONTRACT,PROGRESS}.md`, plus this branch's CONTRACT/PROGRESS.

## Verification

- Layer 1: `make verify`
- Layer 2: n/a
- Layer 3: n/a
- Feature-specific: n/a

## Tranches

n/a — Tier A.

| # | Tranche | Behavior cases covered | Layers | PR / commit |
|---|---|---|---|---|
| 1 | Post-merge docs (rework-log + PROGRESS archive) | n/a | L1 only | pending |

## Exclusions

- Not in this branch: any product code, FEATURES.md matrix change, other rework-log rows
- Do not refactor unrelated modules

## Checker

- [x] Trivial docs-only change — checker may be skipped per maker-checker.md ("Trivial doc-only or comment-only changes may skip checker"); Pass line recorded in PROGRESS for `pr-check`

## On merge

- [ ] Update root FEATURES.md matrix if platform status changed — n/a
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier A: classic checks only, `make branch-ready` must pass before coding.
