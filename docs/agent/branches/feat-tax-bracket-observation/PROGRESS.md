# Progress — `feat-tax-bracket-observation`

Branch-local handoff. Do not put other features' focus here.

Worktree: `/Users/bastien.ostalowski/Workspace/worktrees/feat-tax-bracket-observation`  
Checker sandbox: `/Users/bastien.ostalowski/Workspace/worktrees/feat-tax-bracket-observation-feat-tax-bracket-observation-checker`

## Current focus

- **In progress:** Checker Pass on `7ea7587` published into this worktree. Next: `make pr-check` / open the feature PR (D1 — one open PR).
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md). Behaviour-gate (Intent + cases + teach-back).

- Tier: B (behavior)
- Framer session / date: 2026-10-05 (worktree `feat-tax-bracket-observation`)
- Challenger: Pass (2026-10-05)
- Teach-back: accepted (2026-10-05) — scenarios 1–7 re-accepted after Challenger amendments
- `make branch-ready`: OK (2026-10-05) — score 15/15

## Done (this branch)

- [x] Feature branch + dedicated worktree + `make branch-contract`
- [x] Framer CONTRACT: N1–N11 / E1–E9, D1–D15 (incl. sync barème, PAS, dual-UI)
- [x] Looked up official barème revenus 2025 (service-public / CGI / OpenFisca): 11 600 / 29 579 / 84 577 / 181 917
- [x] Challenger: Fail (2026-10-05) — CONTRACT.md patched (N11, D14, D15, resolve/parse, dual-UI, E3, soft exclusions)
- [x] Teach-back: accepted (2026-10-05) — scenarios 1–7 re-accepted after Challenger amendments
- [x] Challenger: Pass (2026-10-05) — prior Fail items locked; Intent/cases/decisions/Tranches/teach-back align; no new product scope
- [x] `make branch-ready` OK (2026-10-05) — 15/15
- [x] Tranche 1 Maker RED → GREEN (core): `ir-bareme.ts` + `tax-bracket.ts` + `FoyerFiscalConfigSchema` + sheet **Foyer fiscal** headers
- [x] Tranche 2 Maker RED → GREEN: foyer workbook I/O (web + mobile rewrite), `PUT /api/foyer-fiscal`, IR barème parse/sync hooked on price sync (E9 isolation)
- [x] Tranche 3 Maker RED → GREEN: shared Budget read-only card + Fiscalité editor/section (N6)
- [x] Tranche 4: ADR 0031 + CONSTRAINTS §4 + glossary **Foyer fiscal** + FEATURES / platforms + colocated ARCHITECTURE
- [x] Commits on `feat/tax-bracket-observation`: `d50a990` (feat) + `7ea7587` (gauntlet mutant-killing tests)

## Last verify

- Command (Checker, 2026-10-06, HEAD `7ea7587`): `make setup` then `make verify`; targeted `npm test -- packages/core/src/tax-bracket packages/core/src/ir-bareme …`; `make e2e`; `make gauntlet`
- Result: **verify-static** 119 files / **836** tests; **verify-behavior** 9 files / **45/45**; **verify-e2e** **5/5** (incl. `e2e/tax-bracket-observation.spec.ts`); **gauntlet** mutation **91.52%** ≥ break 80 (205 killed / 18 survived / 1 no-cov); test-guard OK vs `origin/main`
- Date: 2026-10-06

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

**Official thresholds (income year 2025)** — for teach-back, not for the human to memorize:

| Quotient (par part) | Taux |
|---|---|
| ≤ 11 600 € | 0 % |
| ≤ 29 579 € | 11 % |
| ≤ 84 577 € | 30 % |
| ≤ 181 917 € | 41 % |
| above | 45 % |

Golden pin (N11): RNI 30 000 € / 1 part → IR progressif ≈ 2 103,99 € ; PAS ≈ 7,0 %.

Source pattern: OpenFisca YAML (same family as Livret ADR 0024), fetched during price sync → `data/ir-bareme.json` / AsyncStorage + core seed. Frais-pro min/max stay embedded (D15).

Detached Checker HEAD: `make branch-status` reports slug `head` (no `docs/agent/branches/head/`). CONTRACT/PROGRESS live under `docs/agent/branches/feat-tax-bracket-observation/` on this SHA — Checker read those files directly.

## RED evidence (when `verify-behavior` applies)

Per [tdd-red-green.md](../../howto/tdd-red-green.md). Entries appended by `make red` below.

Voided: first `make red` (2026-10-05) failed for `vitest: command not found` (setup missing) — not missing-behavior. Valid re-RED recorded after stubs + `make setup`.

### RED evidence — VOID (wrong reason: vitest missing) Tranche1 (2026-10-05)

- Command: `npm test -- packages/core/src/tax-bracket packages/core/src/ir-bareme`
- SHA: 4b82ddb
- Failure excerpt: `sh: vitest: command not found` — **void**; not missing-behavior.

### RED evidence — Tranche1 N1-N4 N7-N9 N11 E1-E3 E5-E8: observeTaxBracket + ir-bareme seed/resolve + foyer schema (2026-10-05)

- Command: `npm test -- packages/core/src/tax-bracket packages/core/src/ir-bareme`
- SHA: 4b82ddb
- Failure excerpt:
```
 ❯ packages/core/src/tax-bracket.test.ts:343:33
    341| describe("IR_BAREME_SEED available for observation offline", () => {
    342|  it("observation works with seed only (no cache)", () => {
    343|   expect(IR_BAREME_SEED.length).toBeGreaterThanOrEqual(1);
       |                                 ^
    344|   const r = ok(
    345|    observeTaxBracket({

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[20/20]⎯

 Test Files  2 failed (2)
      Tests  20 failed | 1 passed (21)
```

### RED evidence — Tranche2 N5 N10 E4 E9: foyer workbook I/O + IR bareme sync/parse (2026-10-05)

- Command: `npm test -- src/lib/ir-bareme src/lib/foyer-fiscal-excel.test.ts`
- SHA: 4b82ddb
- Failure excerpt:
```
      8|  throw new Error("syncIrBareme not implemented");
       |        ^
 ❯ src/lib/ir-bareme/sync.test.ts:105:24
 Test Files  3 failed (3)
      Tests  7 failed | 1 passed (8)
```

### RED evidence — Tranche3 N6: Budget read-only card + Fiscalite foyer editor/section (2026-10-06)

- Command: `npm test -- src/components/tax-bracket-observation-card.test.tsx src/app/fiscalite/foyer-fiscal-section.test.tsx`
- SHA: 4b82ddb
- Failure excerpt:
```
 Test Files  2 failed (2)
      Tests  4 failed (4)
   Start at  09:12:45
```

---

## Checker (2026-10-06)

- Checker: Pass (2026-10-06)
- Checker evidence: HEAD `7ea7587`; `make verify` 836 passed; targeted 45/45 (tax-bracket, ir-bareme, workbook-template, ir-bareme sync/parse, foyer-fiscal-excel, foyer-fiscal API, observation card, foyer section); `make e2e` 5/5 including `indicative household IR observation`; `make gauntlet` 91.52% (205 killed / 18 survived / 1 no-cov) ≥ break 80; test-guard OK vs `origin/main`; cadrage Teach-back accepted + Challenger Pass in this file; N11 pin `irAnnuelIndicatif` ≈ 2103.99 in `packages/core/src/tax-bracket.test.ts`

Separate agent in checker worktree (ADR 0030). Wrote only this `PROGRESS.md`.

### Score

| Dimension | Grade | Evidence |
|---|---|---|
| Correctness | **A** | `origin/main...HEAD` is `d50a990` + `7ea7587` (49 files). **verify-static** `make verify`: lint/typecheck + **836** tests. **verify-behavior** 45/45 including N11 golden (`toBeCloseTo(2_103.99, 2)`). **verify-e2e** Playwright **5 passed** (`e2e/tax-bracket-observation.spec.ts` — Fiscalité + Budget same pack). **gauntlet** CONSTRAINTS §27: test-guard OK; mutation **91.52%** (ir-bareme 88 / schema 90.91 / tax-bracket 93.46 / workbook-template 100) ≥ break 80. Surviving mutants (e.g. `quotient <= upper` vs `<` at `tax-bracket.ts:77`) sit below threshold. |
| Architecture | **A** | CONSTRAINTS §3/§6: math in `packages/core/src/tax-bracket.ts` (`progressiveTaxOnQuotient`, not TMI×RNI) + `ir-bareme.ts` (pure seed/merge/resolve, no network). API `src/app/api/foyer-fiscal/route.ts` only `FoyerFiscalConfigSchema` + `replaceWorkbook` (no tax reimplementation). D7/E9: `syncIrBareme` never throws; price `POST` still runs `syncPrices` in parallel (`src/app/api/prices/sync/route.ts`). D10: no write-through to `tmiAssocie`. D11: mobile `excel-mobile.ts` parse/rewrite sheet; no mobile observation UI. D14: Budget `TaxBracketObservationCard … readOnly`; Fiscalité owns PUT. D15: `FRAIS_PRO_*` embedded. ADR 0031 + glossary **Foyer fiscal** + core/src/mobile ARCHITECTURE match. Gauntlet duplication web/mobile YAML parse is Livret-style adapter split (informational; CONSTRAINTS §8 serializers), not a second tax engine. |
| Scope discipline | **A** | Diff is CONTRACT surfaces only (core IR observer, **Foyer fiscal** sheet, foyer API, IR cache sync on price gesture, Budget card + Fiscalité section, ADR/glossary/FEATURES). Exclusions held: no Budget upsert from foyer, no PER/immobilier TMI sync, no décote/QF/CEHR, no mobile UI, no dedicated barème sync button. |
| Tests / evidence | **A** | Behaviour-gate RED headers present for Tranches 1–3 (missing-behavior, not vitest-missing void). Checker re-ran green targeted tests + e2e + gauntlet. PR screenshots under `docs/agent/branches/feat-tax-bracket-observation/ui/` (`fiscalite-empty-cta`, `fiscalite-configured`, `budget-card`). |
| Docs handoff | **A** | Teach-back accepted + Challenger Pass + `branch-ready` 15/15. ADR 0031 accepted; CONSTRAINTS §4 allowlist; glossary **Foyer fiscal**; FEATURES/platforms Fiscalité row. CONTRACT Tranches PR column still says “not yet shipped” (process leftover, not product drift). On-merge rework-log still Maker’s `pr-check` follow-up. |

**Pass bar (scoring-rubric):** Pass — Correctness A, Architecture A, Scope A, Tests A, Docs A; no D.

### Commands actually run (Checker sandbox)

| Command | Outcome |
|---|---|
| `git log -1` | `7ea7587 test: kill surviving IR/foyer mutants for gauntlet` (detached HEAD) |
| `git diff --stat origin/main...HEAD` | 49 files, +2803/−20 |
| `make branch-status` | exit 2 — slug `head` on detached HEAD; CONTRACT read at `docs/agent/branches/feat-tax-bracket-observation/CONTRACT.md` |
| `make setup` | `npm ci` (eslint missing before this; first `make verify` was 127) |
| `make verify` | **PASS** — 119 files, 836 tests |
| `npm test -- packages/core/src/tax-bracket packages/core/src/ir-bareme packages/core/src/workbook-template.test.ts src/lib/ir-bareme src/lib/foyer-fiscal-excel.test.ts src/app/api/foyer-fiscal/route.test.ts src/components/tax-bracket-observation-card.test.tsx src/app/fiscalite/foyer-fiscal-section.test.tsx` | **PASS** — 9 files, 45 tests |
| `make e2e` | **PASS** — 5 passed (13.7s) |
| `make gauntlet` | **PASS** — test-guard OK; mutation 91.52% ≥ 80 |

### coherence-code-doc (7 axes)

| Axe | Statut | Constat | Doc ↔ Code |
|---|---|---|---|
| Fidélité décision | ✅ | Official barème sync during price sync + progressive IR + PAS conseil; not hardcoded millésime-only UI and not full CGI engine | ADR 0031 Decision ↔ `observeTaxBracket`, `syncIrBareme` |
| Invariant « indicative / no décote QF CEHR » | ✅ | Card disclaimer + CONSTRAINTS §3 comment on core module | ADR 0031 invariants ↔ `tax-bracket-observation-card.tsx` |
| Invariant « core pure » | ✅ | `@patrimo/core` has no fetch; platforms own YAML/cache | ADR 0031 invariant 2 ↔ `ir-bareme.ts` vs `src/lib/ir-bareme/fetch.ts` |
| Invariant « no Budget write / no TMI write-through » | ✅ | PUT replaces `foyerFiscalConfig` only | ADR 0031 invariants 3–4 ↔ `foyer-fiscal/route.ts` |
| Invariant « frais-pro embedded » | ✅ | 10% / 509 / 14555 constants, not OpenFisca abatpro fetch | ADR 0031 invariant 5 ↔ `FRAIS_PRO_*` in `ir-bareme.ts` |
| Décision complète | ✅ | D1–D15 landed (Fiscalité editor, Budget read-only, seed ∪ cache latest, E9 isolation) | CONTRACT D-table ↔ files above |
| Pas de débordement | ✅ | No mobile observation UI, no décote math | ADR 0031 uncovered ↔ no extra modules |
| Liens & pages | ✅ | Glossary, core/src/mobile ARCHITECTURE, `price-sync.md`, `workbook-persistence.md` | ADR 0031 see-also |
| Ancrage « Foyer fiscal » | ✅ | Glossary entry + `SHEET_FOYER_FISCAL = "Foyer fiscal"` | glossary.md ↔ `workbook-template.ts` |
| Placement domaine / lifecycle | ⏭️ | Patrimo not multi-`docs/<domaine>/` | — |

### clean-code

- Placement: tax math in `@patrimo/core`; route is validation + persist; UI formats core result (SRP).
- Duplication: web vs mobile OpenFisca parse and excel foyer row mapping — same adapter pattern as Livret rates; gauntlet lists 368 informational blocks; not a second progressive-IR implementation.
- Anti-patterns: none that contradict CONSTRAINTS (no domain math in UI; PAS helper guards divide-by-zero E8).
