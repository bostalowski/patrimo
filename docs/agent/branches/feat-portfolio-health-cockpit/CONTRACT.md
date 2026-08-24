# Contract: Unified portfolio health cockpit

- Branch: `feat/portfolio-health-cockpit`
- Slug: `feat-portfolio-health-cockpit`
- Matrix row (FEATURES.md): new row **Portfolio health cockpit** — web `done`, mobile `absent` (V1)
- Issue: [bostalowski/patrimo#52](https://github.com/bostalowski/patrimo/issues/52)

## Context

Patrimo already exposes health signals on separate surfaces (emergency fund, savings capacity, risk bands, diversification coherence, financial goals, fees, next-euro plan). Relating them requires visiting multiple pages. Beginners need one glance; advanced users still want drill-down. Savings capacity (ADR 0017) is available — no longer blocked.

## Scope

- [x] **One behavior:** add a web Dashboard **cockpit** section: **5 traffic-light pills** (reuse existing `@patrimo/core` assessments) + **one** recommended next-action sentence. Each pill links to its deep page. **No** proprietary score `/100`.
- [x] **Core (required):** composition + tone mapping + next-step selection live in `@patrimo/core` (CONSTRAINTS §6–7) — platforms only render. New pure builder (e.g. `buildPortfolioHealthCockpit`) that:
  - Accepts already-derived inputs (or thin wrappers calling existing pure fns) — **must not** re-implement EF / goals / coherence / risk / savings thresholds
  - Maps each signal to a unified tone `ok` | `watch` | `breach` (or equivalent) via the locked table below
  - Omits a pill when the underlying assessment is `null` / hidden
  - Selects **one** next-action (copy key + deep-link target) with the priority below
- [x] **Web:** Dashboard section above or beside the existing health cards row (`src/app/page.tsx`); new presentational component(s); pills are links
- [x] **Docs:** glossary term(s); short core topic note; **ADR** (tone map + next-step priority + fee deferral vs ADR 0007)
- [x] Files / packages expected to change:
  - `packages/core/src/portfolio-health-cockpit.ts` (+ tests) — name flexible if colocated better
  - `packages/core/ARCHITECTURE.md` + topic note; export in `index.ts` / `package.json` as needed
  - `src/app/page.tsx` + `src/components/portfolio-health-cockpit*.tsx` (+ unit tests)
  - `docs/reference/glossary.md`, ADR under `docs/adr/`, `FEATURES.md` on merge

## Product decisions (locked for V1)

### Signals included (5)

| Pill | Source (existing) | Deep link (web) |
|---|---|---|
| Fonds d'urgence | `computeEmergencyFundHealth` | `/budget` |
| Capacité d'épargne | `computeSavingsCapacity` | `/dca` if `over_committed`, else `/budget` |
| Diversification | `assessDiversificationCoherence` | `/diversification` |
| Risque | risk status bands (`assessRiskMetricStatus` on vol + drawdown) | `/` (Dashboard performance block; optional `#performance` if an id exists or is added lightly) |
| Objectifs | `assessFinancialGoals` | `/objectifs` |

### Signals deferred

| Signal | Why |
|---|---|
| **Fees** (all-in / drag) | ADR 0007 **FORBIDDEN** alert/color bands for “too expensive”. Cockpit traffic-lights would need an ADR that supersedes/amends 0007. Out of V1. |
| Budget as its own pill | Covered indirectly by savings capacity + emergency fund. |
| Mobile UI | Same pattern as next-euro (ADR 0015): web first; mobile `absent` until a follow-up. |

### Unified tone map (core only)

| Signal | `ok` | `watch` | `breach` |
|---|---|---|---|
| Emergency fund | `healthy` | `acceptable`, `over_allocated` | `insufficient` |
| Savings capacity | `comfortable` | `tight` | `over_committed` |
| Diversification | `aligned` | `watch` | `misaligned` |
| Risk (single pill) | both vol ∈ {low} and drawdown ∈ {mild} when present; missing metric ignored | any moderate / marked (and no breach) | any high / severe |
| Goals | goals present, not `oversubscribed`, and no goal with trajectory `behind` | any `behind` (and not oversubscribed), or incomplete profile / incomplete goals only | `oversubscribed` |

Hide pill when source returns `null` (no goals, no coherence bands, no EF, no savings capacity, both risk metrics null).

Sharpe is **not** part of the cockpit risk pill (Dashboard RiskBadges stay as today).

### Next-action sentence (one only)

Priority (first match wins):

1. **Next-euro plan** when `buildNextEuroPlan` is non-null: use the **first** step as the recommended action (human FR one-liner + link `/diversification`). This is the “actionable rebalancing” preference from #52.
2. Else the **worst** visible pill tone (`breach` before `watch`); if several at same tone, fixed order: emergency → savings → diversification → risk → goals. Link = that pill’s deep link. Copy = short FR sentence naming the signal (no new math).
3. Else if all visible pills are `ok` (or only ok pills): one calm sentence (“Rien d’urgent — surveille le Dashboard.”) linking `/`.

Platforms must not invent a different priority.

### UI shape

- Traffic-light pills (label + tone color) — not a score, gauge, or `/100`
- One next-action line under the pills
- Existing Dashboard cards (EF, savings, next-euro, goals, performance) **stay**; cockpit **composes**, does not replace them in V1

### Persistence

Derived only — **no** workbook sheet / field.

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core/src/portfolio-health-cockpit` (+ component tests under `src/components/`)
  - Cases: each tone map row; hide when null; next-euro wins over breach pill; breach ordering; all-ok calm copy; risk uses worst of vol/drawdown only
- Layer 3: `make e2e` — web Dashboard UI change
- Feature-specific: manual Dashboard glance with known workbook (EF red + next-euro present → next-euro sentence)

## Exclusions

- Not in this branch: proprietary aggregate score /100 (needs separate ADR if ever wanted)
- Not in this branch: fee traffic-light / fee pill (blocked by ADR 0007 until superseded)
- Not in this branch: mobile cockpit UI
- Not in this branch: removing or redesigning existing health cards
- Not in this branch: new threshold constants that duplicate EF / savings / coherence / risk / goals rules
- Not in this branch: workbook writes, auto-rebalance, push alerts
- Do not refactor unrelated modules

## Checker

- [x] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited
- **Pass** 2026-08-24 — see branch [PROGRESS.md](./PROGRESS.md) checker table

## On merge

- [x] Add root [FEATURES.md](../../../../FEATURES.md) row **Portfolio health cockpit** (web done / mobile absent)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)
