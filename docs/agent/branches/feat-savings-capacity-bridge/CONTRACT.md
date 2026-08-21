# Contract: Savings capacity bridge (budget → DCA)

- Branch: `feat/savings-capacity-bridge`
- Slug: `feat-savings-capacity-bridge`
- Matrix row (FEATURES.md): new row **Savings capacity** — web `done`, mobile `done` (Dashboard) / soft warnings web-only
- Issue: [bostalowski/patrimo#51](https://github.com/bostalowski/patrimo/issues/51)

## Context

Budget (`summarizeBudget`) and emergency-fund coverage (ADR 0005) already exist. DCA plans define planned contributions (`computeMonthlyDcaPool`). The sides are not connected: users cannot see **how much they can actually invest** after expenses and a path to the emergency-fund target, nor whether current DCA overshoots that capacity.

Complementary to **Next-euro plan** (ADR 0015): next-euro reallocates an *existing* DCA pool; this feature answers whether that pool (and extras) fits cashflow capacity.

## Scope

- [x] **One behavior:** compute an **investable surplus** from budget + emergency-fund catch-up reserve, compare it to the monthlyized DCA plan total, expose status `comfortable` / `tight` / `over_committed`, and surface it on Dashboards (card next to emergency fund) plus soft warnings on web DCA / Projection when over-committed. **No auto-resize of DCA** — show the gap only.
- [x] **Core (required):** math lives in `@patrimo/core` (CONSTRAINTS §6) — not duplicated in UI.
  - New pure function (e.g. `computeSavingsCapacity`) composing:
    - `rawSavings = revenusMensuels − depensesMensuelles` (`summarizeBudget`; **do not** subtract budget `EPARGNE` lines — those are intentional savings labels, not a second capacity source)
    - Emergency catch-up reserve: see product decisions below
    - `investableSurplus = max(0, rawSavings − monthlyEmergencyReserve)` (or allow negative surplus with status over-committed — locked below)
    - `plannedDcaMonthly = computeMonthlyDcaPool(dca)` (already monthlyizes `MENSUEL` / `TRIMESTRIEL` / `ANNUEL`)
    - Status from planned vs surplus thresholds
  - Return enough fields for UI: raw savings, reserve, surplus, planned DCA, gap (`planned − surplus`), status; `null` when indicator must hide
- [x] **Web:** Dashboard card beside emergency fund; soft warning banner/copy on DCA page and Projection when `over_committed`
- [x] **Mobile:** Dashboard card only (parity with emergency-fund card); no DCA/Projection soft warnings in V1
- [x] **Docs:** glossary terms; short core topic note; ADR (recommended — lasting thresholds / hide rules)
- [x] Files / packages expected to change:
  - `packages/core/src/savings-capacity.ts` (+ tests) — or colocated name if better fit
  - `packages/core/ARCHITECTURE.md` + topic note
  - `src/app/page.tsx` + new card component; soft warnings on DCA + Projection surfaces
  - `mobile/app/index.tsx` + mobile card
  - `docs/reference/glossary.md`, ADR under `docs/adr/`, `FEATURES.md` on merge

## Product decisions (locked for V1)

| Decision | Choice |
|---|---|
| Raw savings | `revenusMensuels − depensesMensuelles` only (ignore budget `EPARGNE` for capacity) |
| EF target months | **6** (lower bound of ADR 0005 `acceptable` / start of `healthy`) |
| Catch-up horizon `N` | **12** months — `monthlyEmergencyReserve = max(0, (targetMonths − coverageMonths) × depensesMensuelles / N)` |
| When coverage ≥ 6 | `monthlyEmergencyReserve = 0` |
| When `depensesMensuelles ≤ 0` | No EF reserve path; still compute capacity from raw savings if `revenusMensuels > 0`, else **hide** (`null`) |
| When `revenusMensuels ≤ 0` | **Hide** (`null`) — no meaningful capacity |
| Negative surplus | Allowed (`investableSurplus` can be &lt; 0); status is always `over_committed` if planned &gt; surplus |
| Planned DCA | `computeMonthlyDcaPool` only (workbook DCA configs; Projection UI extras that are not in the sheet are out of scope) |
| Status bands | `comfortable` if `planned ≤ 0.8 × surplus` (and surplus ≥ 0); `tight` if `planned ≤ surplus`; `over_committed` if `planned > surplus` (incl. surplus &lt; 0 with planned &gt; 0). When planned = 0 and surplus ≥ 0 → `comfortable` |
| Hide when no DCA and surplus ≥ 0? | **Show** the card anyway (capacity is useful without DCA); soft warnings only when `over_committed` |
| Persistence | Derived only — **no** workbook sheet / field |
| Who computes | `@patrimo/core` only; platforms format |
| DCA mutation | **Forbidden** in V1 |

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core/src/savings-capacity` (cases: healthy EF → reserve 0; gap catch-up; over-committed; hide when no revenus; TRIMESTRIEL/ANNUEL in pool; comfortable/tight boundaries)
- Layer 3: `make e2e` — web Dashboard / DCA or Projection UI change
- Feature-specific: manual Dashboard check with known budget + livret + DCA; over-committed shows soft warning on DCA and Projection

## Exclusions

- Not in this branch: auto-resize / rewrite of DCA plans or budget `EPARGNE` lines
- Not in this branch: editable EF target / catch-up horizon in UI (constants only)
- Not in this branch: mobile DCA or Projection soft warnings
- Not in this branch: changing next-euro pool source to budget capacity (ADR 0015 stays DCA-pool-based)
- Not in this branch: Projection-only extra contribution streams that are not persisted as `DcaConfig`
- Do not refactor unrelated modules

## Checker

- [x] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited
- **Verdict (2026-08-21):** Pass with notes — see PROGRESS checker findings

## On merge

- [x] Add / update root [FEATURES.md](../../../../FEATURES.md) row **Savings capacity**
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)
