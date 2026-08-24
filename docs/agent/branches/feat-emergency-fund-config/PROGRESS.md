# Progress — `feat-emergency-fund-config`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** ready for PR (commit pending)
- **Blocked:** none

## Done (this branch)

- [x] Branch + `make branch-contract`
- [x] CONTRACT draft (context vs ADR 0005 / 0015 / 0017, scope, decisions table, exclusions)
- [x] Product decisions locked (D1=C, D4=yes, D7=A, D8-D9 recommended package)
- [x] ADR 0018 accepted and linked from ADR index + glossary
- [x] `@patrimo/core` emergency-fund config model (`Fonds urgence`) with defaults (6 / 12) and optional € override
- [x] Web + mobile workbook serializers updated for `Fonds urgence`
- [x] Savings-capacity math switched from fixed constants to workbook config
- [x] Web settings UI + API route to edit emergency-fund target/horizon
- [x] Dashboard/mobile savings-capacity card copy reflects effective configured target
- [x] Targeted tests added for core config math + API route + card rendering

## Last verify

- Command: `make verify`
- Result: ✅ pass (lint + typecheck + unit tests); 4 pre-existing lint warnings in deletion tests
- Date: 2026-08-24

- Command: `npm test -- packages/core/src/savings-capacity.test.ts packages/core/src/emergency-fund-config.test.ts src/app/api/emergency-fund-config/route.test.ts src/components/savings-capacity-card.test.tsx mobile/lib/savings-capacity-card.test.tsx`
- Result: ✅ pass (5 files, 30 tests)
- Date: 2026-08-24

- Command: `make e2e`
- Result: ✅ pass (2 Playwright specs) when run outside sandbox; sandbox run failed with `uv_interface_addresses` host lookup error
- Date: 2026-08-24

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

Behavior kept intentionally:

- Health bands fixed at 3 / 6 / 12 (`emergency-fund.ts`)
- Next-euro P1 fills to 3 months when `insufficient`

Known follow-up (out of this contract):

- Mobile edit form for emergency-fund config (mobile remains read-only in V1)

## Checker (2026-08-24)

**Verdict: Pass**

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | **A** | `make verify` green (464 tests); targeted 30/30 pass; `make e2e` 2/2 pass (outside sandbox) |
| Architecture | **A** | Domain math in `packages/core/src/emergency-fund-config.ts`; sheet `Fonds urgence` from `workbook-template.ts` + glossary; web/mobile serializers aligned; health (`emergency-fund.ts`) and next-euro P1 unchanged |
| Scope discipline | **A** | D1–D10 implemented; exclusions respected (no DCA auto-write, no band change, no P1 rewrite) |
| Tests / evidence | **A** | Layer 1+2+3 commands run by checker; feature tests cover defaults, custom target/horizon, € override w/ zero expenses, API PUT, web/mobile card copy |
| Docs handoff | **A** | ADR 0018 accepted; glossary + ADR 0005/0017 supersession notes; branch PROGRESS; FEATURES matrix deferred to merge per CONTRACT |

### Scope vs CONTRACT (D1–D10)

| Decision | Status | Proof |
|---|---|---|
| D1 target months + € override | ✅ | `effectiveEmergencyFundTargetEuro` prefers override (`emergency-fund-config.ts` L37–44) |
| D2 catch-up horizon | ✅ | `monthlyEmergencyCatchUpReserve` L47–58 |
| D3 defaults 6 / 12 | ✅ | `normalizeEmergencyFundConfig` + test "falls back to defaults" |
| D4 workbook sheet | ✅ | `SHEET_FONDS_URGENCE`, serializers in `src/lib/excel.ts` + `mobile/lib/excel-mobile.ts` |
| D5 health bands fixed | ✅ | `emergency-fund.ts` thresholds 3/6/12 untouched |
| D6 savings capacity consumer | ✅ | `computeSavingsCapacity` uses config via `monthlyEmergencyCatchUpReserve` |
| D7 next-euro P1 unchanged | ✅ | `next-euro-plan.ts` still `insufficient` + `3 * expenses` |
| D8 web edit / mobile read | ✅ | `EmergencyFundSettings` in `Reglages`; mobile dashboard passes `emergencyFundConfig` |
| D9 Reglages UI block | ✅ | `settings-client.tsx` — months, optional €, horizon, derived preview |
| D10 override without expenses | ✅ | `savings-capacity.test.ts` "uses absolute target override even when monthly expenses are zero" |

### Notes (non-blocking)

- Working tree committed on branch — open PR next.
- `FEATURES.md` matrix update still on merge checklist (CONTRACT "On merge").
- e2e smoke does not assert EF config round-trip explicitly; covered by API + core unit tests.
