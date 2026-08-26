# Contract: <feature name>

- Branch: `<branch>`
- Slug: `<slug>`
- Matrix row (FEATURES.md): <feature / platform> — or n/a for harness-only
- Cadrage tier: A (Layer 2 `n/a`) | B (behavior) — see [cadrage-lock.md](../../howto/cadrage-lock.md)
- Challenger: required | recommended | n/a — required if new ADR / new sheet / structuring core math

## Intent

Tier A: write `n/a — Tier A`. Tier B: fill all bullets.

- Symptom (who / when / pain):
- Suspected cause (`fact` | `hypothesis`):
- Lever (where we act on the cause):
- Success signal (observable):
- Band-aid risk (if we only treat the symptom):

## Behavior cases

Tier A: `n/a — Tier A`. Tier B: observable cases → Layer 2 RED → GREEN slices.

### Nominal

- [ ] If … then …

### Edge

- [ ] If … then …

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

- Layer 1: `make verify`
- Layer 2: `npm test -- <path>` (if applicable) — list **behavior cases** (same as above; RED → GREEN slices); or `n/a`
- Layer 3: `make e2e` (required if web UI / API / workbook I/O / settings)
- Feature-specific:

When Layer 2 applies, makers follow [tdd-red-green.md](../../howto/tdd-red-green.md) (CONSTRAINTS §24).
Tier B cadrage: [cadrage-lock.md](../../howto/cadrage-lock.md) (CONSTRAINTS §25) before Maker.

## Exclusions

- Not in this branch:
- Do not refactor unrelated modules

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when Layer 2 applied; Tier B teach-back / cadrage lock recorded when Layer 2 applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass if `Challenger: required`, then `make branch-ready` must pass before coding.
