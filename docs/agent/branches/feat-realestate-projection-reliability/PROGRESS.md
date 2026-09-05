# Progress — `feat-realestate-projection-reliability`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — Maker + Checker done; ready for commit/PR when asked
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md).

- Tier: B
- Framer session / date: 2026-09-02
- Challenger: Pass (2026-09-02)
- Teach-back: accepted (2026-09-02)
- `make branch-ready`: 14/14 Ready (2026-09-02)
- Checker: Pass (2026-09-02)
- Post-nit Maker fixes: docs-only (RP disclaimer + ARCHITECTURE note)
- Checker re-Pass (2026-09-02) — optional under re-check loop (docs-only nits); all dimensions A on re-check
- Harness: re-check loop documented in `docs/howto/maker-checker.md`, `docs/agent/scoring-rubric.md`, `.agents/skills/patrimo-harness/SKILL.md`

- [x] Feature branch + `make branch-contract`
- [x] CONTRACT + Challenger Pass + teach-back + branch-ready
- [x] Core: CRD insurance, rent indexing, CAGR+IRR, fiscal warning helpers, disclaimer constant
- [x] Tests: `loan.test.ts`, `tax.test.ts`, `projection.test.ts` (19) — RED then GREEN
- [x] Web labels + warnings + shared disclaimer (Immobilier, Projection, Investissements)
- [x] Mobile Projection + Investissements › Immo → `@patrimo/core`
- [x] ADR 0028 + glossary + ARCHITECTURE + FEATURES / platforms
- [x] `make verify` green; `make e2e` green (2 passed)
- [x] Checker Pass (2026-09-02) — nits: RP disclaimer + ARCHITECTURE note applied
- [x] Checker re-Pass (2026-09-02) — docs-only nits (optional re-check)
- [x] Harness re-check loop in skill + maker-checker + scoring-rubric

## RED evidence (when Layer 2 applies)

- Case: loan / tax helpers / projection indexing+CRD insurance+cagr/irr (batch)
- Command: `npm test -- packages/core/src/realestate`
- Failure reason: missing `monthlyInsuranceOnBalance`, warning helpers, `cagr`/`irr`/`rentIndexRate` behavior (13 failed / 6 passed before implementation — not compile noise)
- Date: 2026-09-02
- GREEN: same command → 19 passed after production code

## Last verify

- Command: `make verify` then `make e2e`
- Result: verify exit 0 (625 tests); e2e 2 passed
- Date: 2026-09-02

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)
ADR: [0028-realestate-projection-reliability.md](../../adr/0028-realestate-projection-reliability.md)
