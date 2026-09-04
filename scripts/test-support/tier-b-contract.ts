// Minimal, valid Tier B CONTRACT/PROGRESS builder for branch-ready/pr-check tests.
// Not a *.test.ts file — vitest won't collect it.

export function minimalTierBContract(opts: { tranchesRow: string; challengerRequired?: boolean } = { tranchesRow: "" }) {
  return `# Contract: Fixture feature

- Branch: \`feat/fixture\`
- Slug: \`feat-fixture\`
- Matrix row (FEATURES.md): n/a
- Cadrage tier: B (behavior)
- Challenger: ${opts.challengerRequired ? "required" : "n/a"}

## Intent

- Symptom (who / when / pain): fixture symptom text long enough
- Suspected cause (\`fact\`): fixture cause text long enough
- Lever (where we act on the cause): fixture lever text long enough
- Success signal (observable): fixture success text long enough
- Band-aid risk (if we only treat the symptom): fixture risk text long enough

## Behavior cases

### Nominal

- [ ] N1: If fixture condition then fixture outcome
- [ ] N2: If fixture condition then fixture outcome

### Edge

- [ ] E1: If fixture edge condition then fixture outcome

### Out of scope

- [ ] Explicitly not in this branch: fixture exclusion

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | Fixture decision | LOCKED | Fixture choice | Fixture alternative |

## Teach-back

- [ ] Scenario 1: fixture scenario

## Scope

- [x] One behavior for this branch: fixture scope
- [x] Files / packages expected to change: fixture files

## Verification

- Layer 1: \`make verify\`
- Layer 2: \`npm test -- fixture\`
- Layer 3: n/a
- Feature-specific: fixture

## Tranches

${opts.tranchesRow}

## Exclusions

- Not in this branch: fixture exclusion detail here

## Checker

- [ ] Fresh session or distinct checker role will score with scoring-rubric.md

## On merge

- [ ] Update root FEATURES.md matrix if platform status changed

## Cadrage gate

Tier B: all product decisions LOCKED, teach-back accepted, then make branch-ready must pass.
`;
}

export function minimalProgress(opts: { challengerPass?: boolean } = {}) {
  return `# Progress — fixture

## Current focus

- **In progress:** fixture
- **Blocked:** none

## Cadrage lock

- Tier: B
- Teach-back: accepted (2026-01-01)
${opts.challengerPass ? "- Challenger: Pass (2026-01-01)\n" : ""}
## Notes
`;
}
