# Progress — `feat-projection-include-realestate`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — Checker **Pass** (re-check 2026-10-05 after commit `2625467`)
- **Blocked:** none
- Checker: Pass (2026-10-05)
- Checker evidence: re-check @ `2625467` — `make verify` 805; `npm test -- packages/core/src/retraite` 7; `npm test -- src/app/projection/projection-include-realestate.test.tsx` 4; `make e2e` 5; `make gauntlet` mutation 82.28% ≥ 80 on `retraite.ts`; teach-back + RED E1/E3/N1–N4 present

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
- [x] Feature commit `2625467` — `feat: include real estate in Projection by default`
- [x] Checker Fail (2026-10-05) — empty `main...HEAD` / uncommitted dirty tree (superseded)
- [x] Checker Pass re-check (2026-10-05) — after `2625467` (see section below)

## RED evidence (when `verify-behavior` applies)

Per [tdd-red-green.md](../../howto/tdd-red-green.md). Skip if `verify-behavior` is `n/a`.

Maker recorded case-level RED excerpts (below). Template stub left empty.

## Last verify

- Command (Checker re-check @ `2625467`): `make verify` (lint 0 errors / 5 pre-existing warnings; typecheck; **805** tests) ; `npm test -- packages/core/src/retraite` (**7** passed) ; `npm test -- src/app/projection/projection-include-realestate.test.tsx` (**4** passed) ; `make e2e` (**5** passed, including `projection-include-realestate.spec.ts`) ; `make gauntlet` (test-guard OK vs `origin/main` ; mutation on `packages/core/src/retraite.ts` **82.28%** ≥ break **80**, 65 killed / 14 survived)
- Result: verify-static / targeted / e2e / gauntlet green on committed feature tip
- Date: 2026-10-05

## Notes

Contract: [CONTRACT.md](./CONTRACT.md). Checker sandbox detached HEAD `2625467` (= `feat/projection-include-realestate` tip). Prior Fail was empty `main...HEAD`; feature is now in git history (14 files / +989 −57 vs `main`).

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

## Checker (2026-10-05) — Fail (superseded)

Separate agent (ADR 0030) in worktree
`/Users/bastien.ostalowski/Workspace/worktrees/feat-projection-include-realestate-feat-projection-include-realestate-checker`
(detached `4b82ddb` = `main` / `feat/projection-include-realestate` tip). **No feature commits.** Implementation existed only as **uncommitted** files in the Maker worktree. Checker sandbox `git diff main...HEAD` was **empty**; gauntlet mutation skipped. Verdict **Fail** — follow-up: commit feature so `main...HEAD` lists `packages/core/src/**`, then re-Checker.

## Checker re-check (2026-10-05) — Pass

Separate agent (ADR 0030) in worktree
`/Users/bastien.ostalowski/Workspace/worktrees/feat-projection-include-realestate-feat-projection-include-realestate-checker`
(detached `2625467` — `feat: include real estate in Projection by default`). Re-check after prior Fail (empty `main...HEAD`). This file is the only write.

### Evidence run

| Check | Command / path | Result |
|---|---|---|
| Checker sandbox diff | `git log/diff main...HEAD` @ `2625467` | **1 commit**; 14 files incl. `packages/core/src/retraite.ts`, projection UI, e2e, glossary, core ARCHITECTURE |
| Cadrage / teach-back | PROGRESS + CONTRACT | Teach-back accepted (2026-10-05); Challenger skipped with reason; decisions LOCKED; `branch-ready` 15/15 |
| RED | PROGRESS excerpts E1, E3, N4/aggregate, N1–N4 | Failures are missing behavior (flag / helper / checkbox), not compile noise |
| `verify-behavior` core | `npm test -- packages/core/src/retraite` | **7 passed** |
| `verify-behavior` UI | `npm test -- src/app/projection/projection-include-realestate.test.tsx` | **4 passed** |
| `verify-static` | `make verify` | lint 0 errors / 5 warnings; **805 passed** |
| `verify-e2e` | `make e2e` | **5 passed** incl. `checkbox is on by default on /projection` |
| Gauntlet | `make gauntlet` | test-guard OK; mutate `retraite.ts` **82.28%** (65 killed / 14 survived) ≥ break **80** |

### Coherence code ↔ doc

| Axe | Statut | Constat | Doc ↔ Code |
|---|---|---|---|
| Fidélité décision | ✅ | Default-on session checkbox; `includeRealEstate !== false`; locative overlay via core helpers | CONTRACT D4–D7 ↔ `projection-client.tsx` `useState(true)` ; `retraite.ts` `aggregateIncludedRealEstate` |
| Invariant exclude `RESIDENCE_PRINCIPALE` | ⚠️ | Core filter in `aggregateIncludedRealEstate`; UI **re-filters** the same regime for `currentEquity` | D3 / glossary ↔ `retraite.ts` skip RP ; `envelope-projection.tsx` `currentRealEstateEquity` |
| Décision D6 courbe année par année | ✅ | `addRealEstateEquityToPoints` overlays `years[].equity` | D6 ↔ `retraite.ts` + `envelope-projection.tsx` `chartData` |
| Pas de débordement | ✅ | Immobilier what-if tab ignores global checkbox; no workbook column | D2 / exclusions ↔ `RealEstateProjection` props unchanged |
| Liens & pages | ⚠️ | Core ARCHITECTURE + glossary updated; `src/ARCHITECTURE.md` silent; FEATURES / platforms.md already mention toggle (CONTRACT On merge) | `packages/core/ARCHITECTURE.md` ; glossary « Projection include real estate » |
| Ancrage glossaire | ✅ | Toggle named in glossary | glossary ↔ checkbox « Inclure l'immobilier » |
| Placement domaine | ⏭️ | Domain math in `@patrimo/core` | CONSTRAINTS §6–§7 |

### Clean-code (placement / duplication)

- Domain flag and year overlay live in `@patrimo/core` (`aggregateIncludedRealEstate`, `addRealEstateEquityToPoints`, `buildRetirementSources`) — correct layer.
- `envelope-projection.tsx` duplicates RP exclusion for **current** equity via `currentEquity` instead of a core helper — drift risk vs D3 (Architecture dock, not ownership violation).
- UI test N1 asserts `patrimoineValue() > 10_000` while a 10y Livret path is already > 10_000 without immobilier — N2’s decrease on uncheck is the stronger capital-inclusion signal.
- e2e creates a Livret only, never a locative, never unchecks — CONTRACT screenshots asked default-on / default-off / retirement rents; only `projection-include-realestate-default-on.png` present.
- Gauntlet duplication signal: shared prop/typing blocks between `envelope-projection.tsx` and `projection-client.tsx` (informational).

### Scoring table

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | B | `make verify` 805; targeted 7+4; `make e2e` 5; `make gauntlet` **82.28%** on committed `retraite.ts` (prior Fail closed). Edge gaps: e2e smoke-only (no locative / uncheck); 14 survivors under break threshold. |
| Architecture | B | Core owns include/exclude + overlay; Immobilier tab untouched. Minor: RP skip duplicated in UI `currentRealEstateEquity`; `src/ARCHITECTURE.md` not updated. |
| Scope discipline | B | CONTRACT cases N1–N4 / E1–E3 only; mobile / workbook / GoalsAlignment excluded. Early FEATURES.md + `platforms.md` edits belong to On merge. |
| Tests / evidence | B | RED excerpts for E1, E3, aggregation, N1–N4 then green targeted tests. Gaps: N1 amount assertion weak; e2e smoke-only; E2 keep-current (no dedicated RED header, acceptable). Combined `N1-N4` header covers the UI suite RED. |
| Docs handoff | B | Teach-back accepted + Challenger skip reason (behaviour-gate). Glossary + core ARCHITECTURE present. Screenshot set incomplete vs CONTRACT (default-on only). |

### Prior Fail items vs this re-check

| Prior item | Status |
|---|---|
| Empty `main...HEAD` / uncommitted Maker tree | **Closed** — commit `2625467` |
| Gauntlet mutation skipped (no `packages/core/src` in diff) | **Closed** — mutation **82.28%** ≥ 80 |
| Checker sandbox missing feature files | **Closed** — HEAD has core + UI + e2e + docs |

### Nits (optional — not Fail)

1. **tests/e2e** — Strengthen e2e with a locative + uncheck path; add default-off / rents screenshots if CONTRACT still wants them.
2. **tests/ui** — N1 could assert delta vs financial-only (or absolute equity) instead of `> 10_000`.
3. **clean-code** — Extract current locative equity sum into core next to `aggregateIncludedRealEstate` to avoid UI RP filter drift.
4. **docs** — Optional `src/ARCHITECTURE.md` note for the Projection toggle; FEATURES matrix On-merge already partly done.

Verdict: **Pass**
