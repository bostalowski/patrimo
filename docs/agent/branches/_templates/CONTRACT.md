# Contract: <feature name>

- Branch: `<branch>`
- Slug: `<slug>`
- Matrix row (FEATURES.md): <feature / platform> — or n/a for harness-only
- Cadrage tier: A (`verify-behavior` `n/a`) | B (behavior) — see [cadrage-lock.md](../../howto/cadrage-lock.md)
- Challenger: required | recommended | n/a — required if new ADR / new sheet / structuring core math

## Intent

Tier A: write `n/a — Tier A`. Tier B: fill all bullets.

- Symptom (who / when / pain):
- Suspected cause (`fact` | `hypothesis`):
- Lever (where we act on the cause):
- Success signal (observable):
- Band-aid risk (if we only treat the symptom):

## Behavior cases

Tier A: `n/a — Tier A`. Tier B: observable cases → `verify-behavior` RED → GREEN slices.
Give each Nominal/Edge case a stable ID (`N1`, `N2`, … / `E1`, `E2`, …) — the
`## Tranches` table below references cases **by ID only**, so `make branch-ready`
can check every case is assigned to a tranche.

### Nominal

- [ ] N1: If … then …

### Edge

- [ ] E1: If … then …

### Out of scope

- [ ] Explicitly not in this branch: …

## Product decisions

Status: **LOCKED** = cadrage for this branch · **OPEN** = must answer before coding.
Tier A: one row `n/a — Tier A` or omit table body with a single n/a line under the heading.

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | | OPEN | | |

## Teach-back

Tier A: `n/a — Tier A`. Tier B: list 3–5 scenarios; human acceptance recorded in PROGRESS (`Teach-back: accepted`).

- [ ] Scenario 1:
- [ ] Scenario 2:
- [ ] Scenario 3:

## Scope

- [ ] One behavior for this branch:
- [ ] Files / packages expected to change:

## Verification

- `verify-static`: `make verify`
- `verify-behavior`: `npm test -- <path>` (if applicable) — list **behavior cases** (same as above; RED → GREEN slices); or `n/a`
- `verify-e2e`: `make e2e` (required if web UI / API / workbook I/O / settings); or `n/a`
- Screenshots (when `verify-e2e` covers web UI): list screens / states to capture for the PR body — see [ui-screenshots-in-pr.md](../../howto/ui-screenshots-in-pr.md); or `n/a`
- Feature-specific:

When `verify-behavior` applies, makers follow [tdd-red-green.md](../../howto/tdd-red-green.md) (CONSTRAINTS §24).
Tier B cadrage: [cadrage-lock.md](../../howto/cadrage-lock.md) (CONSTRAINTS §25) before Maker.

## Tranches

One tranche = one small, separately-reviewable unit — either its own stacked
PR (merged before the next tranche's commits push) or a commit landing in
one already-open PR reviewed incrementally; pick the mechanic explicitly in
a product decision, since GitHub diffs branch-vs-base (CONSTRAINTS §26;
[feature-flow.md](../../howto/feature-flow.md)). Tier A: one row is enough
(`n/a` behavior cases). Tier B: every `N#`/`E#` case above must appear in at
least one row's "Behavior cases covered" cell, **as bare IDs only** (no
prose after the IDs — `make branch-ready` parses this column with a simple
token match).

| # | Tranche | Behavior cases covered | Verify bands | PR / commit |
|---|---|---|---|---|
| 1 | | | | not yet shipped |

## Exclusions

- Not in this branch:
- Do not refactor unrelated modules

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when `verify-behavior` applied; Tier B teach-back / cadrage lock recorded when `verify-behavior` applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed
- [ ] Append / refresh the [rework-log](../../rework-log.md) row **in this PR** via `make rework-log-stamp`; if overlap fires, human yes/no via `make rework-log-propose` (never silent auto-ack)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass if `Challenger: required`, then `make branch-ready` must pass before coding.
