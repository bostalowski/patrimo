# Contract: Require rework-log row in the merging feature PR

- Branch: `bostalowski/rework-log-in-feature-pr`
- Slug: `bostalowski-rework-log-in-feature-pr`
- Matrix row (FEATURES.md): n/a — harness-only
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

- [x] One behavior for this branch: make `make pr-check` **fail** when `docs/agent/rework-log.md` has no row for the current branch slug, so the row must land in the PR being merged (not a follow-up chore). Update ADR 0026 D8 timing, feature-flow G6/G7, templates, and AGENTS accordingly.
- [x] Files expected: `scripts/pr-check.sh`, `scripts/pr-check.test.ts`, `docs/agent/rework-log.md`, `docs/howto/feature-flow.md`, `docs/howto/pr-checklist.md`, `docs/adr/0026-feature-flow-cadrage-to-merge.md`, `docs/adr/index.md`, `docs/agent/branches/_templates/CONTRACT.md`, `AGENTS.md`, `.agents/skills/patrimo-harness/SKILL.md`, this CONTRACT/PROGRESS.

## Verification

- Layer 1: `make verify` (at least `npm test -- scripts/pr-check.test.ts`)
- Layer 2: n/a
- Layer 3: n/a
- Feature-specific: `make pr-check` READY on this branch once its own rework-log row is present

## Tranches

n/a — Tier A.

| # | Tranche | Behavior cases covered | Layers | PR / commit |
|---|---|---|---|---|
| 1 | Block pr-check without rework-log row | n/a | L1 | pending |

## Exclusions

- Not in this branch: product features, changing Reworked? automation
- Do not refactor unrelated modules

## Checker

- [x] Trivial harness/docs change — checker skipped per maker-checker.md; Pass line in PROGRESS for pr-check

## On merge

- [x] FEATURES.md — n/a
- [x] Append rework-log row **in this PR** (dogfooding the new rule)
- [ ] Leave this folder as archive after merge

## Cadrage gate

Tier A: classic checks only, `make branch-ready` must pass before coding.
