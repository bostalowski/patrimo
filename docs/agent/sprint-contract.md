# Sprint contract template

Copy into `docs/agent/runs/YYYY-MM-DD-slug.md` or paste a short version into [PROGRESS.md](../../PROGRESS.md) **before** coding.

```markdown
# Sprint contract: <feature name>

## Scope
- [ ] One behavior from FEATURES.md: <row / platform>
- [ ] Files / packages expected to change:

## Verification
- Layer 1: `make verify`
- Layer 2: `npm test -- <path>` (if applicable)
- Layer 3: `make e2e` (required if web UI / API / workbook I/O / settings)
- Feature-specific command from FEATURES open-work contract:

## Exclusions
- Not in this sprint:
- Do not refactor unrelated modules

## Checker
- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited
```

## Rules

1. One open FEATURES item only (WIP = 1).
2. Exclusions are as important as scope — they stop drive-by refactors.
3. Verification commands must be executable; “looks good” is not a criterion.
4. Update the contract if scope changes mid-session; never silently expand.
