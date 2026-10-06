# Progress — `feat-tax-bracket-observation`

Branch-local handoff. Do not put other features' focus here.

Worktree: `/Users/bastien.ostalowski/Workspace/worktrees/feat-tax-bracket-observation`  
Checker sandbox: `/Users/bastien.ostalowski/Workspace/worktrees/feat-tax-bracket-observation-feat-tax-bracket-observation-checker`

## Current focus

- **In progress:** Feature on HEAD (`d50a990` + mutant-killing tests). `make gauntlet` green after tests. Next: recreate checker worktree, re-spawn Checker.
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
- [x] Tranche 1 Maker RED → GREEN (core): `ir-bareme.ts` + `tax-bracket.ts` + `FoyerFiscalConfigSchema` + sheet **Foyer fiscal** headers; 21/21 targeted tests green **(Maker-claimed; not re-run in Checker sandbox)**
- [x] Tranche 2 Maker RED → GREEN: foyer workbook I/O (web + mobile rewrite), `PUT /api/foyer-fiscal`, IR barème parse/sync hooked on price sync (E9 isolation) **(Maker-claimed; not re-run in Checker sandbox)**
- [x] Tranche 3 Maker RED → GREEN: shared Budget read-only card + Fiscalité editor/section (N6) **(Maker-claimed; not re-run in Checker sandbox)**
- [x] Tranche 4: ADR 0031 + CONSTRAINTS §4 + glossary **Foyer fiscal** + FEATURES / platforms + colocated ARCHITECTURE **(Maker-claimed; not present on Checker HEAD)**

## Last verify

- Command: Maker `make verify` + targeted tests + `npx playwright test e2e/tax-bracket-observation.spec.ts` (pre-commit); `make gauntlet` after mutant-killing tests
- Result: verify **831** green (Maker, pre-commit); targeted core tests **29/29** after gauntlet tests; e2e foyer spec **1/1**; **gauntlet 91.52%** ≥ break 80 (205 killed / 18 survived / 1 no-cov); test-guard OK vs `origin/main`
- Date: 2026-10-06

## Notes

Contract: [CONTRACT.md](./CONTRACT.md) — present in Maker worktree; **absent** from Checker sandbox at `4b82ddb`.

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

Checker note: RED excerpts live in Maker PROGRESS only. Checker sandbox has **no** `tax-bracket.test.ts` / `ir-bareme` / UI tests, so Checker did **not** replay RED or GREEN.

---

## Checker (2026-10-06)

**Fail**

Separate agent in checker worktree (ADR 0030). Wrote only this `PROGRESS.md`.

### Score

| Dimension | Grade | Evidence |
|---|---|---|
| Correctness | **D** | Checker HEAD `4b82ddb` (`chore: release 0.11.10`). `git diff` empty. `packages/core/src/tax-bracket.ts`, `docs/adr/0031-household-ir-bracket-observation.md`, and `docs/agent/branches/feat-tax-bracket-observation/` **absent**. CONTRACT verify-static / verify-behavior / verify-e2e **not run** against the feature (would score `main`). Maker PROGRESS: `make gauntlet` skipped mutation because `@patrimo/core` files were **untracked** — CONSTRAINTS §27 not satisfied. |
| Architecture | **D** | coherence-code-doc / clean-code **not applicable on empty sandbox**. Cannot confirm CONSTRAINTS §6–9 (tax math in `@patrimo/core`), §3 (indicatif), new sheet **Foyer fiscal**, or ADR 0031 vs code. Maker dirty tree exists elsewhere — not this agent’s cwd. |
| Scope discipline | **B** | No extra feature landed on Checker HEAD. Maker PROGRESS describes one CONTRACT (`feat-tax-bracket-observation`) but implementation is still uncommitted, so scope cannot be fully audited. |
| Tests / evidence | **D** | No Checker runtime proof of N1–N11 / E1–E9. Did not run `make verify`, targeted `npm test -- packages/core/src/tax-bracket packages/core/src/ir-bareme`, `make e2e`, or `make gauntlet` on a tree that contains the change. Maker-claimed 831 + e2e 1/1 is **not** Checker evidence. |
| Docs handoff | **C** | Teach-back / `branch-ready` recorded in Maker PROGRESS (behaviour-gate). Checker snapshot had **no** CONTRACT/PROGRESS until this write. Maker also notes FEATURES already edited while CONTRACT “On merge” still open — minor. |

**Pass bar (scoring-rubric):** Fail — Correctness D, Architecture D, Tests D (any D fails).

### Commands actually run (Checker sandbox)

| Command | Outcome |
|---|---|
| `make branch-status` | **FAIL** — detached HEAD slug `head`; `No branch contract yet` (expected: sandbox has no `docs/agent/branches/feat-tax-bracket-observation/` until this PROGRESS write) |
| `git rev-parse HEAD` / `git log -1` | `4b82ddb chore: release 0.11.10` |
| `git worktree list` | Checker WT detached at same SHA as `feat/tax-bracket-observation`; `main..feat/tax-bracket-observation` empty |
| `git status` / `git diff --stat` | Clean; **no** feature diff |
| `ls packages/core/src/tax-bracket.ts` | **No such file** |
| `ls docs/adr/0031-household-ir-bracket-observation.md` | **No such file** |
| `make verify` | **Not run** — would verify `main`, not the CONTRACT change set |
| targeted `npm test -- packages/core/src/tax-bracket packages/core/src/ir-bareme` | **Not run** — paths missing |
| `make e2e` | **Not run** — no `e2e/tax-bracket-observation.spec.ts` in sandbox |
| `make gauntlet` | **Not run** — no `@patrimo/core` / API / workbook I/O diff on this HEAD |

### coherence-code-doc (7 axes)

| Axe | Statut | Constat |
|---|---|---|
| Fidélité décision | ❌ | ADR 0031 / option foyer+barème sync **not on Checker HEAD** |
| Invariants | ❌ | Cannot cite `fichier:ligne` for progressive IR, PAS, seed ∪ cache, E9 isolation |
| Décision complète | ❌ | D1–D15 cannot be checked in this tree |
| Pas de débordement | ⏭️ | No feature code present |
| Liens & pages | ❌ | Glossary / ARCHITECTURE / CONSTRAINTS §4 edits not in sandbox |
| Ancrage & glossaire | ❌ | **Foyer fiscal** glossary row not in this tree |
| Placement domaine | ⏭️ | Patrimo not multi-`docs/<domaine>/` |

### clean-code

Not scored: no production diff in sandbox.

### Fail follow-up (Maker only — Checker will not implement)

1. **Commit** the feature on `feat/tax-bracket-observation` so `make checker`’s detached worktree actually contains the CONTRACT diff (`git worktree add --detach` copies **HEAD**, not dirty files).
2. Remove / recreate the stale checker worktree after that commit, then spawn Checker again.
3. Run **`make gauntlet`** once `@patrimo/core` (and workbook I/O / `src/app/api`) files are **tracked** — Maker already noted mutation was skipped on untracked core files (CONSTRAINTS §27).
4. Do not treat Maker `make verify` / Playwright as Checker Pass.
5. After a real Checker Pass: `pr-check`, screenshots if not already in the committed tree, FEATURES “on merge” as CONTRACT says.
