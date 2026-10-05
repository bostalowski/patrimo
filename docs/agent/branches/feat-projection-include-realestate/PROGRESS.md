# Progress — `feat-projection-include-realestate`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** Checker **Fail** (2026-10-05) — commit the dirty Maker tree so `main...HEAD` contains core, then re-run `make gauntlet` + Checker
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md).

- Tier: B (behaviour-gate — CONTRACT `verify-behavior` is not `n/a`)
- Framer session / date: 2026-10-05 (worktree `feat-projection-include-realestate`)
- Challenger: skipped (reason: recommended, pas required — pas de nouvelle feuille / ADR ; booléen core + UI)
- Teach-back: accepted (2026-10-05)
- `make branch-ready`: pass 2026-10-05 (15 / 15)

## Done (this branch)

- [x] Worktree + `make branch-contract`
- [x] CONTRACT Intent / cases / decisions LOCKED (Framer)
- [x] Teach-back accepted (humain 2026-10-05, 5 scénarios)
- [x] `make branch-ready` 15 / 15
- [x] Tranche 1 GREEN: `includeRealEstate` on `buildRetirementSources` (E1–E3)
- [x] Tranche 2 GREEN: checkbox + overlay courbe/totaux (N1–N4)
- [x] Checker Fail (2026-10-05) — see section below

## RED evidence (when `verify-behavior` applies)

Per [tdd-red-green.md](../../howto/tdd-red-green.md). Skip if `verify-behavior` is `n/a`.

Maker recorded case-level RED excerpts (below). Template stub left empty.

## Last verify

- Command (Checker, Maker dirty tree): `make verify` (lint 0 errors / 5 pre-existing warnings; typecheck; 805 tests) ; `npm test -- packages/core/src/retraite` (7 passed) ; `npm test -- src/app/projection/projection-include-realestate.test.tsx` (4 passed) ; `make e2e` (5 passed, including `projection-include-realestate.spec.ts`) ; `make gauntlet` (test-guard OK ; **mutation skipped** — no `packages/core/src` in git diff vs `origin/main`)
- Result: verify-static / targeted / e2e green on uncommitted Maker files; gauntlet mutation **not executed**
- Date: 2026-10-05

## Notes

Contract: [CONTRACT.md](./CONTRACT.md) lives in the Maker worktree (uncommitted). Checker sandbox HEAD `4b82ddb` has no branch folder besides this PROGRESS write.

### RED evidence — E1: includeRealEstate false zeros equity and rent (2026-10-05)

- Command: `npm test -- packages/core/src/retraite.test.ts -t E1`
- SHA: 4b82ddb
- Failure excerpt:
```
 ❯ packages/core/src/retraite.test.ts:94:41
     92|    includeRealEstate: false,
     93|   });
     94|   expect(excluded.monthlyRealEstateNet).toBe(0);
       |                                         ^
    95|   for (const scenario of excluded.scenarios) {
     96|    expect(scenario.realEstateEquityNominal).toBe(0);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed | 2 skipped (3)
   Start at  14:36:15
   Duration  401ms (transform 95ms, setup 0ms, collect 148ms, tests 10ms, environment 0ms, prepare 46ms)
```

### RED evidence — E3: horizon 0 include OFF zeros snapshot CF (2026-10-05)

- Command: `npm test -- packages/core/src/retraite.test.ts -t E3`
- SHA: 4b82ddb
- Failure excerpt:
```
 ❯ packages/core/src/retraite.test.ts:149:41
    147|    includeRealEstate: false,
    148|   });
    149|   expect(excluded.monthlyRealEstateNet).toBe(0);
       |                                         ^
    150|   expect(excluded.scenarios[0].realEstateEquityNominal).toBe(0);
    151|  });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed | 2 skipped (3)
   Start at  14:36:16
   Duration  411ms (transform 93ms, setup 0ms, collect 155ms, tests 5ms, environment 0ms, prepare 47ms)
```

### RED evidence — N4/D6: aggregateIncludedRealEstate + overlay points (2026-10-05)

- Command: `npm test -- packages/core/src/retraite.test.ts -t aggregateIncludedRealEstate`
- SHA: 4b82ddb
- Failure excerpt:
```
 ❯ packages/core/src/retraite.test.ts:176:20
    174| 
    175|  it("sums locative yearly equity and zeros when include is false", () …
    176|   const included = aggregateIncludedRealEstate({
       |                    ^
    177|    properties: [property],
    178|    horizonYears: 5,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

 Test Files  1 failed (1)
      Tests  2 failed | 4 skipped (6)
   Start at  14:37:38
   Duration  390ms (transform 91ms, setup 0ms, collect 153ms, tests 3ms, environment 0ms, prepare 42ms)
```

### RED evidence — N1-N4: Projection checkbox Inclure l'immobilier (2026-10-05)

- Command: `npm test -- src/app/projection/projection-include-realestate.test.tsx`
- SHA: 4b82ddb
- Failure excerpt:
```
 ❯ src/app/projection/projection-include-realestate.test.tsx:162:22
    160|  it("N4: residence-only still shows checked box without phantom rents"…
    161|   renderProjection([residence]);
    162|   const box = screen.getByRole("checkbox", {
       |                      ^
    163|    name: /inclure l.immobilier/i,
    164|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯

 Test Files  1 failed (1)
      Tests  4 failed (4)
   Start at  14:38:52
   Duration  1.59s (transform 141ms, setup 0ms, collect 536ms, tests 451ms, environment 327ms, prepare 53ms)
```

## Checker (2026-10-05) — Fail

Separate agent (ADR 0030) in worktree
`/Users/bastien.ostalowski/Workspace/worktrees/feat-projection-include-realestate-feat-projection-include-realestate-checker`
(detached `4b82ddb` = `main` / `feat/projection-include-realestate` tip). **No feature commits.** Implementation exists only as **uncommitted** files in the Maker worktree
`/Users/bastien.ostalowski/Workspace/worktrees/feat-projection-include-realestate`.
Checker sandbox `git diff main...HEAD` is **empty**; `retraite.test.ts` / UI test / CONTRACT are absent here. Product commands below were therefore replayed against the Maker dirty tree (read-only). This file is the only write.

### Evidence run

| Check | Command / path | Result |
|---|---|---|
| Checker sandbox diff | `git diff main...HEAD` in checker worktree | empty (HEAD `4b82ddb`) |
| Cadrage / teach-back | Maker PROGRESS + CONTRACT | `- Teach-back: accepted (2026-10-05)`; Challenger skipped with reason; decisions LOCKED |
| RED | Maker PROGRESS excerpts E1, E3, aggregateIncludedRealEstate, N1–N4 | Failures are missing behavior (flag / helper / checkbox), not compile noise; SHA `4b82ddb` matches uncommitted tip |
| `verify-behavior` core | Maker: `npm test -- packages/core/src/retraite` | **7 passed** (`retraite.test.ts`) |
| `verify-behavior` UI | Maker: `npm test -- src/app/projection/projection-include-realestate.test.tsx` | **4 passed** |
| `verify-static` | Maker: `make verify` | lint 0 errors; typecheck; **805 passed** |
| `verify-e2e` | Maker: `make e2e` | **5 passed** including `checkbox is on by default on /projection` |
| Gauntlet (Maker + checker) | `make gauntlet` | test-guard OK; **mutation skipped — no `packages/core/src` in diff vs `origin/main`**; duplication signal n/a (uncommitted) |

### Coherence code ↔ doc

| Axe | Statut | Constat | Doc ↔ Code |
|---|---|---|---|
| Fidélité décision | ✅ | Default-on session checkbox; `includeRealEstate !== false`; locative overlay via core helpers | CONTRACT D4–D7 ↔ `projection-client.tsx` `useState(true)` ; `retraite.ts` `aggregateIncludedRealEstate` |
| Invariant exclude `RESIDENCE_PRINCIPALE` | ⚠️ | Core filter in `aggregateIncludedRealEstate`; UI **re-filters** the same regime for `currentEquity` | D3 / glossary ↔ `retraite.ts` skip RP ; `envelope-projection.tsx` `currentRealEstateEquity` |
| Décision D6 courbe année par année | ✅ | `addRealEstateEquityToPoints` overlays `years[].equity` | D6 ↔ `retraite.ts` + `envelope-projection.tsx` `chartData` |
| Pas de débordement | ✅ | Immobilier what-if tab still ignores the global checkbox; no workbook column | D2 / exclusions ↔ `RealEstateProjection` props unchanged |
| Liens & pages | ⚠️ | Core ARCHITECTURE + glossary updated; `src/ARCHITECTURE.md` silent; FEATURES / platforms.md already mention the toggle (CONTRACT said matrix on merge) | `packages/core/ARCHITECTURE.md` ; `docs/reference/glossary.md` « Projection include real estate » |
| Ancrage glossaire | ✅ | New toggle named in glossary | glossary ↔ checkbox copy « Inclure l'immobilier » |
| Placement domaine | ⏭️ | Mono-package domain math in `@patrimo/core` | CONSTRAINTS §6–§7 |

### Clean-code (placement / duplication)

- Domain flag and year overlay live in `@patrimo/core` (`aggregateIncludedRealEstate`, `addRealEstateEquityToPoints`, `buildRetirementSources`) — correct layer.
- `envelope-projection.tsx` duplicates the RP exclusion for **current** equity via `currentEquity` instead of a core helper — drift risk vs D3.
- UI tests N1 assert `patrimoineValue() > 10_000` while a 10y Livret path is already > 10_000 without immobilier — does not prove N1 capital inclusion by itself (N2’s decrease on uncheck is the stronger signal).
- e2e creates a Livret only, never a locative, never unchecks — CONTRACT screenshots asked default-on / default-off / retirement rents; only `projection-include-realestate-default-on.png` is present in Maker.

### Scoring table

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | C | Maker dirty-tree `make verify` 805, targeted 7+4, `make e2e` 5 green. Checker sandbox has **no** feature diff. `make gauntlet` **skipped mutation** despite dirty `packages/core/src/retraite.ts` (CONSTRAINTS §27 unmet in substance). e2e does not exercise N1–N4 totals/toggle. |
| Architecture | B | Core owns include/exclude + overlay; Immobilier tab untouched. Minor: RP skip duplicated in UI `currentRealEstateEquity`; `src/ARCHITECTURE.md` not updated. |
| Scope discipline | B | CONTRACT cases N1–N4 / E1–E3 only; mobile / workbook / GoalsAlignment excluded. Early FEATURES.md + `platforms.md` edits belong to On merge. |
| Tests / evidence | B | RED excerpts exist for E1, E3, aggregation, N1–N4 then green targeted tests. Gaps: N1 amount assertion weak; e2e smoke-only; gauntlet mutants not run; E2 is keep-current (no dedicated RED, acceptable). |
| Docs handoff | B | Teach-back accepted + Challenger skip reason recorded (behaviour-gate). Glossary + core ARCHITECTURE present. Checker sandbox cannot see CONTRACT until committed. Screenshot set incomplete vs CONTRACT. |

### Follow-up (required before re-Checker)

1. Commit the Maker dirty set (`retraite.ts` + tests, projection UI/e2e, docs, screenshots) so `git diff origin/main...HEAD` lists `packages/core/src/**`.
2. Re-run `make gauntlet` until mutation actually executes on `retraite.ts` (or document why Stryker is not configured — `stryker.conf.json` exists at repo root).
3. Spawn Checker again on a worktree whose HEAD contains those commits (empty `main...HEAD` must not recur).

Verdict: **Fail**
