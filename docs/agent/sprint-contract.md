# Sprint contract template

**Preferred:** on a feature branch, run `make branch-contract` and edit `docs/agent/branches/<slug>/CONTRACT.md` (copied from [branches/_templates/CONTRACT.md](branches/_templates/CONTRACT.md)).

Convention: [branches/README.md](branches/README.md).

Legacy / inline copy (same fields):

```markdown
# Contract: <feature name>

- Branch: `<branch>`
- Slug: `<slug>`
- Matrix row (FEATURES.md): <feature / platform>

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
- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited
```

## Rules

1. One CONTRACT per feature branch (WIP = 1 on that branch).
2. Exclusions are as important as scope — they stop drive-by refactors.
3. Verification commands must be executable; “looks good” is not a criterion.
4. Update the contract if scope changes mid-branch; never silently expand.
5. Do not use root `PROGRESS.md` for feature focus — use `docs/agent/branches/<slug>/PROGRESS.md`.
