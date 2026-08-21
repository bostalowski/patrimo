# Contract: <feature name>

- Branch: `<branch>`
- Slug: `<slug>`
- Matrix row (FEATURES.md): <feature / platform> — or n/a for harness-only

## Scope

- [ ] One behavior for this branch:
- [ ] Files / packages expected to change:

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- <path>` (if applicable)
- Layer 3: `make e2e` (required if web UI / API / workbook I/O / settings)
- Feature-specific:

## Exclusions

- Not in this branch:
- Do not refactor unrelated modules

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)
