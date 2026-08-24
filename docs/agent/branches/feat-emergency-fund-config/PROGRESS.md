# Progress — `feat-emergency-fund-config`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **Ready for merge:** Phase B checker **Pass** (2026-08-24). Commit Phase B working tree if needed; then `FEATURES.md` + PR per On merge checklist.
- **Blocked:** none

## Done (this branch)

### Phase A — EF config

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
- [x] Checker pass Phase A (2026-08-24)

### Phase B — LIVRET DCA

- [x] CONTRACT extended (D11–D20) after user confirm: stay on branch; real `DcaConfig` LIVRET; alert when planned &gt; need
- [x] ADR 0019 accepted; glossary + `savings-capacity.md`; append-only see-also on ADR 0017 / 0018
- [x] Core: split LIVRET vs investment DCA; outflow = max(need, plannedLivret); over-contribution signal
- [x] Schema: empty `lines` allowed for `envelope === LIVRET` only; Excel serializers round-trip cash plans
- [x] Web DCA cash mode (hide baskets; dépôt mensuel); API skips basket checks for empty LIVRET
- [x] Web + mobile capacity cards show LIVRET planned vs need + over alert
- [x] Web DCA / Investissements soft banners: investment over-commit + emergency over-contribution
- [x] Mobile: LIVRET save without assets; list shows « Dépôt mensuel (cash) »
- [x] Layer 1–3 verify + Phase B checker Pass (2026-08-24)

## Last verify

Checker re-ran (2026-08-24):

- Command: `make verify`
- Result: ✅ pass (lint 0 errors / 4 pre-existing deletion-test warnings; typecheck; **478** unit tests)
- Date: 2026-08-24 (Phase B checker)

- Command: `npm test -- packages/core/src/savings-capacity.test.ts packages/core/src/next-euro-plan.test.ts src/lib/dca-excel.test.ts src/components/savings-capacity-card.test.tsx src/components/savings-capacity-overcommit-banner.test.tsx mobile/lib/savings-capacity-card.test.tsx`
- Result: ✅ pass (6 files, **57** tests)
- Date: 2026-08-24 (Phase B checker)

- Command: `make e2e` (outside sandbox)
- Result: ✅ pass (2/2 Playwright workbook critical-path specs)
- Date: 2026-08-24 (Phase B checker)

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

Phase A behavior kept:

- Health bands fixed at 3 / 6 / 12 (`emergency-fund.ts`)
- Next-euro P1 fills to 3 months when `insufficient`
- Implied catch-up from Reglages does **not** auto-write DCA (D2)

Phase B behavior:

- User-authored LIVRET `DcaConfig` counts in capacity (`plannedLivretDcaMonthly`)
- Alert when `plannedLivretDca &gt; implied need` (including need = 0)
- Investment `over_committed` stays investment-vs-surplus only

## Checker (Phase B — 2026-08-24)

**Verdict: Pass**

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | **A** | Checker re-ran: `make verify` green (478 tests); targeted 57/57; `make e2e` 2/2 |
| Architecture | **A** | Capacity split + over flags in `packages/core/src/savings-capacity.ts`; pool helpers in `next-euro-plan.ts`; LIVRET empty-lines in `schema.ts` `superRefine`; UI only surfaces `emergencyOverContributing` |
| Scope discipline | **A** | D11–D20 covered; exclusions held (no auto-create DCA, no ADR 0005 band change, next-euro still `computeMonthlyDcaPool` full pool @ L257, no investment `over_committed` from LIVRET alone) |
| Tests / evidence | **A** | Core split/over/schema tests; `dca-excel` LIVRET round-trip; web/mobile card + emergency banner tests; e2e workbook smoke |
| Docs handoff | **A** | ADR 0019 accepted + index/glossary/`savings-capacity.md`; see-also on 0017/0018; this PROGRESS updated |

### Scope vs CONTRACT Phase B (D11–D20)

| Decision | Status | Proof |
|---|---|---|
| D11 Stay on branch | ✅ | Single CONTRACT; WIP = 1 |
| D12 Real LIVRET `DcaConfig` | ✅ | Sheet `DCA` / web `dca-config-card` cash persist; no parallel `Fonds urgence` field |
| D13 Empty lines LIVRET only | ✅ | `schema.ts` L130–141; web cash mode; `dca-excel` round-trip; mobile `draftToConfig` forces `lines: []` for LIVRET |
| D14 Capacity split | ✅ | `savings-capacity.ts` L103–109; tests “splits LIVRET vs investment…” |
| D15 Under-plan no special alert | ✅ | Under-plan case: `emergencyOverContributing === false` when planned ≤ need |
| D16 Over-plan alert | ✅ | Core flags; Dashboard card + `SavingsCapacityEmergencyOverBanner` on DCA (+ Investissements); status stays investment-vs-surplus (test “without forcing investment over_committed”) |
| D17 Multiple LIVRET sum | ✅ | Test “sums multiple LIVRET configs…” |
| D18 Next-euro unchanged | ✅ | `computeNextEuroPlan` still uses full `computeMonthlyDcaPool`; only shared split helpers added |
| D19 Docs ADR 0019 | ✅ | `docs/adr/0019-livret-dca-savings-capacity.md` + links |
| D20 Mobile edit | ✅ | Mobile save without assets (`investissements.tsx` L191–199); list « Dépôt mensuel (cash) » |

### Notes (non-blocking)

- Phase B implementation was still uncommitted in the working tree at checker time (maker should commit before PR).
- `FEATURES.md` matrix still on merge checklist (CONTRACT On merge).
- e2e smoke does not exercise LIVRET DCA save UI; covered by unit + component tests per CONTRACT “else” clause.
- Emergency soft banner also on Investissements (extra surface beyond “web DCA page”) — aligned, not scope blow-up.

## Checker (Phase A — 2026-08-24)

**Verdict: Pass** (historical)

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | **A** | `make verify` green (464 tests); targeted 30/30 pass; `make e2e` 2/2 pass (outside sandbox) |
| Architecture | **A** | Domain math in `packages/core/src/emergency-fund-config.ts`; sheet `Fonds urgence`; serializers aligned |
| Scope discipline | **A** | D1–D10 implemented; then exclusions respected for Phase A |
| Tests / evidence | **A** | Layer 1+2+3 |
| Docs handoff | **A** | ADR 0018; glossary; branch PROGRESS |

### Scope vs CONTRACT Phase A (D1–D10)

| Decision | Status | Proof |
|---|---|---|
| D1–D10 | ✅ | See prior checker notes / `emergency-fund-config.ts` + Reglages |

### Notes (non-blocking)

- Phase B reopened scope on same branch by CONTRACT update (WIP = 1 preserved).
- `FEATURES.md` matrix still on merge checklist.
