# Progress — `feat-ef-surplus-recommendation`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — wording FR + capacity UI removed; ready to commit/push
- **Blocked:** none

## Done (this branch)

- [x] Product Q&A locked (cible Réglages, oneshot vs horizon, capacité = revenus−dépenses, protéger DCA investi, déduire DCA LIVRET, UI capacité + bandeau Prochain euro, baisse si sur-plan)
- [x] Branch + CONTRACT + PROGRESS created
- [x] `make branch-ready` Pass (9/9)
- [x] Core: `computeEmergencyFundSurplusRecommendation` + FR copy; wire into savings capacity + next-euro
- [x] Remove next-euro P1 pool steal (`emergency_fund` step kind gone)
- [x] Web: capacity card surplus line; Next-euro EF banner above DCA steps
- [x] Mobile: capacity card surplus line via shared copy
- [x] Docs: ADR 0020 accepted; glossary + topic notes; append-only links on 0015 / 0018 / 0019
- [x] Layer 1 `make verify` green (pre-tilt)
- [x] Layer 2 targeted core + card tests green (pre-tilt)
- [x] Layer 3 `make e2e` green (port 3120 — :3100 was occupied by a stale next)
- [x] Checker Pass (2026-08-24) — see below
- [x] **Follow-up (same branch):** `buildMonthlyDcaTilt` + Exécution wiring + ADR 0021; card **Ajustement DCA du mois** (no “tilt” in UI); EF banner kept
- [x] Removed Savings capacity card/banners from web + mobile Dashboard / Investissements / DCA / Projection

## Last verify

- Command: targeted vitest after tilt merge onto this branch
- Result: 25 tests pass (tilt + next-euro + card + investissements client)
- Date: 2026-08-24
- Note: full `make verify` + e2e still needed before push; prior checker Pass covered ADR 0020 only — re-checker needed for tilt

## Checker (2026-08-24)

- Role: distinct checker (not maker)
- Verdict: **Pass**
- Evidence re-run: targeted vitest — 8 files / 72 tests pass (`emergency-fund-recommendation`, `next-euro-plan`, `next-euro-copy`, `savings-capacity`, `savings-capacity-copy`, web + mobile capacity / next-euro cards)
- Layers 1 + 3: accepted from maker Last verify (same day); no contradictions found in code review

### Rubric

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | A | P1 pool steal removed (`next-euro-plan.ts`); oneshot/monthly/none + cap + LIVRET deduct tested; UI banner/capacity wired; maker L1–L3 green + checker L2 re-run |
| Architecture | A | Math + FR copy in `@patrimo/core`; platforms render only; ADR 0020 + ARCHITECTURE / glossary / topic notes aligned; no workbook writes |
| Scope discipline | B | CONTRACT items only; exclusions respected. Hygiene finding fixed (`.next-e2e*` gitignore + tsconfig). |
| Tests / evidence | A | Unit coverage for core paths + card tests; e2e recorded green |
| Docs handoff | A | Branch PROGRESS + ADR 0020 + append-only see-also; FEATURES deferred to merge (CONTRACT On merge) |

### CONTRACT checklist

| Scope item | Status |
|---|---|
| One behavior: surplus LIVRET advice; no investment DCA redirect | Pass |
| Core pure fn + wire next-euro / capacity + unit tests | Pass |
| Web: capacity reco + Next-euro banner above steps | Pass |
| Mobile: capacity card via shared copy | Pass |
| Docs: ADR 0020; glossary; topic notes; append-only 0015/0018/0019 | Pass |

Feature-specific verify (spot-check):

| Criterion | Status |
|---|---|
| No LIVRET steal from investment pool in next-euro steps | Pass (`does not steal investment DCA…` test) |
| Oneshot when `gap ≤ availableCash` | Pass |
| Monthly à ajouter = max(0, need − livretDca) capped | Pass |
| `livretDca ≥ monthlyNeed` → no mets plus; over → baisse | Pass (mode none + existing livret reco) |
| Target/horizon from config; defaults 6/12 | Pass (`normalizeEmergencyFundConfig`) |
| Same core euros capacity + Next-euro banner | Pass (shared `computeEmergencyFundSurplusRecommendation` / copy) |

### Findings (non-blocking — maker before PR)

1. **Hygiene:** Fixed — `/.next-e2e*/` in `.gitignore`; removed port-specific `.next-e2e-3120` includes from `tsconfig.json` (keep conventional `.next-e2e` only).
2. **Out of scope note (no fail):** `buildNextEuroPlan` still uses `computeMonthlyDcaPool` (includes LIVRET) for P2/P3. CONTRACT explicitly excludes changing P2/P3 beyond removing EF steal. Optional follow-up: investment-only pool for next-euro.

### Remaining before merge claim

- [x] Checker pass
- [x] Maker: gitignore / tsconfig hygiene for `.next-e2e-3120` (finding 1)
- [ ] On merge: FEATURES.md matrix notes for Next-euro / Savings capacity

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

Supersedes next-euro P1 pool-steal (ADR 0015) with surplus-based LIVRET advice; health bands (ADR 0005) and EF config sheet (ADR 0018) unchanged.
