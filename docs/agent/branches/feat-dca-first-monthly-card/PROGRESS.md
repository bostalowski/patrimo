# Progress — `feat-dca-first-monthly-card`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — checker **Pass** (2026-08-26); ready to merge
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md).

- Tier: B
- Framer session / date: 2026-08-26
- Challenger: Pass (2026-08-26) — re-review after Fail fixes
- Teach-back: accepted (2026-08-26) — scenarios 1–6
- `make branch-ready`: Pass (2026-08-26) — 14/14

## Done (this branch)

- [x] Branch + `make branch-contract`
- [x] CONTRACT Intent / cases / decisions LOCKED
- [x] Teach-back accepted (human confirm scenarios 1–5; scenario 6 accepted 2026-08-26 — same intent, covered by D3/D8 tests)
- [x] Challenger Fail → CONTRACT fixes → Challenger Pass
- [x] ThisMonthCard + `this-month-copy` (EF / saved DCA / breach D8 / hide pool=0)
- [x] Diversification: stop mounting NextEuroPlanCard
- [x] Exécution: `useTilt` default false, not persisted (D9)
- [x] ADR 0022 + glossary + next-euro-plan.md + FEATURES Notes
- [x] Layer 1 `make verify` green
- [x] Layer 3 `make e2e` green (2 passed)

## RED evidence (when Layer 2 applies)

Per [tdd-red-green.md](../../howto/tdd-red-green.md).

### ThisMonthCard + this-month-copy (2026-08-26)

- Case: Ce mois-ci title / saved DCA lead / EF banner / stock breach D8 / hide pool=0
- Command: `npm test -- packages/core/src/this-month-copy.test.ts src/components/this-month-card.test.tsx`
- Failure reason: stubs returned PLACEHOLDER / empty lead / empty breach keys / card null — missing DCA-first monthly guidance (not compile noise)
- GREEN: same command — 13 passed

### Exécution tilt default (2026-08-26)

- Case: useTilt off when tilt/adjust_plan; remount resets (D9)
- Command: `npm test -- src/app/investissements/dca-execution.test.tsx`
- Failure reason: `useState(tiltAvailable)` left checkbox checked (expected false)
- GREEN: same command — 3 passed

### Diversification no NextEuroPlanCard (2026-08-26)

- Case: D1 — page does not mount NextEuroPlanCard; AllocationCoherenceCard remains
- Command: `npm test -- src/app/diversification/diversification-page.test.ts`
- Failure reason: page.tsx still imported/mounted NextEuroPlanCard
- GREEN: same command — 1 passed

## Last verify

- Command: `make verify` + `make e2e`
- Result: verify green (529 tests); e2e 2 passed
- Date: 2026-08-26 (checker re-run same day)

## Checker (2026-08-26)

Role: checker (distinct session). Rubric: [scoring-rubric.md](../../scoring-rubric.md).

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | A | Layer 1 `make verify` 529 passed; Layer 2 targeted 17/17; Layer 3 `make e2e` 2 passed. Cases covered: EF banner, saved-DCA lead (no tilt/oriente), D3/D8 breach filter, hide pool=0 via null plan, Diversification no NextEuroPlanCard, Exécution useTilt false + remount. |
| Architecture | A | FR/copy + breach key selection in `@patrimo/core` (`this-month-copy.ts`); UI mounts only; ADR 0022 accepted; tilt math kept (D5). |
| Scope discipline | A | Diff matches CONTRACT scope; exclusions respected (no mobile, no tilt delete, no capacity UI, no ADR 0012 tone change). |
| Tests / evidence | A | RED evidence recorded for three Layer 2 paths; checker re-ran green targeted suite + verify + e2e. Scenario 6 behavior covered by `ignores watch…flow_misalign` + card D8 test. |
| Docs handoff | A | ADR 0022 + glossary + next-euro-plan + FEATURES Notes done; cadrage lock / teach-back scenarios 1–6 recorded. |

**Verdict: Pass** (no D; all dimensions A).

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

Maker session 2026-08-26: RED → GREEN for card / Exécution / Diversification; ADR 0022.
Checker Pass 2026-08-26 — merge when ready (FEATURES Notes already updated).
