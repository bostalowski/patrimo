# Progress — `feat-envelope-overflow-plafond`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — checker **Pass** (PR [#59](https://github.com/bostalowski/patrimo/pull/59))
- **Blocked:** none

## Done (this branch)

- [x] Feature branch `feat/envelope-overflow-plafond`
- [x] CONTRACT from [issue #18](https://github.com/bostalowski/patrimo/issues/18)
- [x] Core `projectEnvelopesWithOverflow` + unit tests
- [x] Web `EnvelopeProjection` + `RetirementIncomeCard` + overflow selector / French copy
- [x] Docs: glossary, ADR 0016, `packages/core/envelope-overflow.md`, FEATURES note
- [x] Checker Pass (2026-08-21)

## Last verify

- Command: `make verify` + `npm test -- packages/core/src/projection` + `make e2e`
- Result: pass (L1 431 tests; L2 7 projection tests; L3 2 e2e)
- Date: 2026-08-21 (re-run by checker; CI green on PR)

## Checker score (2026-08-21)

| Dimension | Grade | Evidence |
|---|---|---|
| Correctness | A | L1/L2/L3 green locally; CI `verify` + `e2e` pass on PR 59; unit cases cover PEA→CTO, partial month, extras streams, fallback capped, source===fallback, auto-add CTO |
| Architecture | A | Overflow math only in `packages/core/src/projection.ts` (`projectEnvelopesWithOverflow`); UI formats metadata; ADR 0016 + topic note; CONSTRAINTS §6 held |
| Scope discipline | B | CONTRACT items only; exclusions respected (no mobile / workbook / multi-hop). Incidental tab reformatting in touched projection UI/core files |
| Tests / evidence | A | Layered verify re-run by checker + 7 projection tests named in CONTRACT |
| Docs handoff | A | Glossary, ADR 0016, `envelope-overflow.md`, FEATURES note, branch PROGRESS + run log |

**Verdict: Pass**

### Note (non-blocking)

When the UI injects a missing overflow target it sets `plafond: undefined`, which bypasses core’s `DEFAULT_ENVELOPE_PLAFONDS` for that auto-added envelope. Default CTO is unaffected (no plafond). Edge only if the user picks PEA/LIVRET as fallback without holding it.

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)
