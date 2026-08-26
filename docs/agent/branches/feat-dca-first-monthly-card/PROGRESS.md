# Progress — `feat-dca-first-monthly-card`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — checker Pass; branch ready for merge
- **Blocked:** none

## Cadrage lock (amendment 2026-08-26)

Human accepted UX follow-up on same branch (post-checker):

- EF surplus copy moves from ThisMonthCard → EmergencyFundCard
- ThisMonthCard / « Ce mois-ci » removed from Dashboard (Exécution = DCA action)
- Stock breach alert → DashboardExposureAlert (only when breach)
- EF surplus visible when investment pool === 0 (fixes prior accepted gap)

Teach-back: amendment scenarios (CONTRACT 1–2, 5 rewritten) accepted with the UX follow-up above.

## Done (this branch)

- [x] Branch + `make branch-contract`
- [x] Initial cadrage + teach-back + Challenger Pass
- [x] Diversification: stop mounting NextEuroPlanCard
- [x] Exécution: `useTilt` default false, not persisted (D9)
- [x] ADR 0022 + glossary + next-euro-plan.md + FEATURES Notes (updated twice)
- [x] **Follow-up:** EmergencyFundCard surplus + DashboardExposureAlert; ThisMonthCard removed
- [x] CONTRACT synced to amendment (cases / D2 D7 D10 / teach-back / out-of-scope)
- [x] Dashboard page wiring test (`src/app/dashboard-page.test.ts`)
- [x] Layer 1 `make verify` green (528 tests)
- [x] Layer 3 `make e2e` green (2 passed) after Playwright Chromium install

## RED evidence (when Layer 2 applies)

Per [tdd-red-green.md](../../howto/tdd-red-green.md).

### Dashboard IA follow-up (2026-08-26)

- Case: EF surplus on EmergencyFundCard; DashboardExposureAlert breach D8; no Ce mois-ci
- Command: `npm test -- src/components/emergency-fund-card.test.tsx src/components/dashboard-exposure-alert.test.tsx packages/core/src/this-month-copy.test.ts`
- Failure reason: ThisMonthCard still owned EF banner; EmergencyFundCard had no surplus prop
- GREEN: same command — 14 passed; `make verify` green

### Dashboard page wiring (2026-08-26)

- Case: page mounts EmergencyFundCard + DashboardExposureAlert; omits ThisMonthCard / NextEuroPlanCard
- Command: `npm test -- src/app/dashboard-page.test.ts`
- GREEN: 1 passed (source assertion added with follow-up commit)

### ThisMonthCard + this-month-copy (2026-08-26, superseded by follow-up)

- Case: Ce mois-ci title / saved DCA lead / EF banner / stock breach D8 / hide pool=0
- Command: `npm test -- packages/core/src/this-month-copy.test.ts src/components/this-month-card.test.tsx`
- Failure reason: stubs returned PLACEHOLDER / empty lead / empty breach keys / card null
- GREEN: same command — 13 passed (ThisMonthCard since removed)

### Exécution tilt default (2026-08-26)

- Case: useTilt off when tilt/adjust_plan; remount resets (D9)
- Command: `npm test -- src/app/investissements/dca-execution.test.tsx`
- GREEN: 3 passed

### Diversification no NextEuroPlanCard (2026-08-26)

- Case: D1 — page does not mount NextEuroPlanCard
- Command: `npm test -- src/app/diversification/diversification-page.test.ts`
- GREEN: 1 passed

## Last verify

- Command: `make verify` + `make e2e`
- Result: verify green (528 tests); e2e green (2 passed)
- Date: 2026-08-26 (CONTRACT sync + follow-up commit prep)
- Layer 2 targeted: 19 passed (`dashboard-page` + EF + exposure + this-month-copy + dca-execution + diversification)

## Checker (2026-08-26, initial — pre follow-up)

Role: checker (distinct session). Rubric: [scoring-rubric.md](../../scoring-rubric.md).

**Verdict: Pass** on initial ThisMonthCard scope. Re-checker needed after Dashboard IA follow-up.

## Checker (2026-08-26, re-checker — post follow-up)

Role: checker (fresh session). Rubric: [scoring-rubric.md](../../scoring-rubric.md). Evaluated working tree (follow-up uncommitted vs `HEAD`).

| Dimension | Grade | Evidence |
|---|---|---|
| Correctness | **B** | `make verify` green (528 tests). Layer 2 targeted: 18/18. Working tree matched amendment; `HEAD` still had ThisMonthCard. Layer 3 missing at review time. |
| Architecture | **A** | Breach D8 + alert copy in `@patrimo/core`; thin UI adapters. |
| Scope discipline | **C** | CONTRACT cases/decisions/teach-back still described removed « Ce mois-ci ». |
| Tests / evidence | **B** | RED → GREEN recorded; no page-level wiring test yet. |
| Docs handoff | **C** | CONTRACT stale; follow-up uncommitted. |

**Verdict: Fail** — see maker follow-ups below (addressed same day).

**Maker follow-ups (done 2026-08-26):**

1. [x] Commit Dashboard IA follow-up
2. [x] Rewrite CONTRACT behavior cases + D2/D7/D10 + teach-back + out-of-scope
3. [x] Re-run `make e2e` (green after Playwright install)
4. [x] Re-request checker

## Checker (2026-08-26, re-checker #2 — post follow-up commit)

Role: checker (fresh session). Rubric: [scoring-rubric.md](../../scoring-rubric.md). Evaluated **HEAD** `41940d3` (stashed dirty working tree for verify/e2e).

| Dimension | Grade | Evidence |
|---|---|---|
| Correctness | **A** | `make verify` green (528 tests on HEAD). Layer 2 targeted: 19/19 (EF + exposure + this-month-copy + dashboard-page + dca-execution + diversification). `make e2e` green (2 passed). |
| Architecture | **A** | Breach D8 + alert copy in `@patrimo/core/this-month-copy`; `DashboardExposureAlert` + `EmergencyFundCard` thin adapters; Exécution opt-in only (D9). |
| Scope discipline | **A** | CONTRACT amendment cases / D1–D10 / out-of-scope respected on HEAD; no mobile / no tilt core deletion. |
| Tests / evidence | **A** | RED → GREEN recorded per case cluster; page wiring test asserts `EmergencyFundCard` + `DashboardExposureAlert`, omits `ThisMonthCard` / `NextEuroPlanCard`. |
| Docs handoff | **A** | CONTRACT synced to amendment; teach-back + cadrage lock in PROGRESS; ADR 0022 + glossary + FEATURES Notes updated. |

**Verdict: Pass** on HEAD `41940d3`.

**Working-tree warning (not part of Pass):** unstaged changes delete `DashboardExposureAlert` (+ tests) and invert `dashboard-page.test.ts` — violates CONTRACT nominal case 3 / D2 / D3 / D8. Run `git restore src/app/page.tsx src/app/dashboard-page.test.ts src/components/dashboard-exposure-alert.tsx src/components/dashboard-exposure-alert.test.tsx` before merge.

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

Maker session 2026-08-26: initial RED → GREEN; follow-up same day per human UX feedback; CONTRACT sync + e2e after checker Fail.
