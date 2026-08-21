# Progress — `feat-envelope-overflow-plafond`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** maker implementation complete — awaiting checker pass ([maker-checker](../../../howto/maker-checker.md))
- **Blocked:** none

## Done (this branch)

- [x] Feature branch `feat/envelope-overflow-plafond`
- [x] CONTRACT from [issue #18](https://github.com/bostalowski/patrimo/issues/18)
- [x] Core `projectEnvelopesWithOverflow` + unit tests
- [x] Web `EnvelopeProjection` + `RetirementIncomeCard` + overflow selector / French copy
- [x] Docs: glossary, ADR 0016, `packages/core/envelope-overflow.md`, FEATURES note

## Last verify

- Command: `make verify` + `npm test -- packages/core/src/projection` + `make e2e`
- Result: pass (L1 431 tests; L2 7 projection tests; L3 2 e2e)
- Date: 2026-08-21

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

Checker: open a fresh session, score against CONTRACT + [scoring-rubric.md](../../scoring-rubric.md). Do not treat maker self-assessment as done.
