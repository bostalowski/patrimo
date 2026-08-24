# Contract: Emergency-fund config + LIVRET DCA in savings capacity

- Branch: `feat/emergency-fund-config`
- Slug: `feat-emergency-fund-config`
- Matrix row (FEATURES.md): **Emergency fund config** + extend **Savings capacity** / **Investment plan (DCA)** — status TBD on merge
- Relates: ADR 0005 (health), ADR 0015 (next-euro), ADR 0017 (savings capacity), ADR 0018 (EF config)

## Context

### Phase A (done on this branch)

Users can configure emergency-fund **target** and **catch-up horizon** in workbook sheet `Fonds urgence`. Savings capacity uses those values for the **implied** monthly catch-up reserve. Health bands and next-euro P1 stay unchanged (ADR 0018).

### Phase B (this extension — user 2026-08-24)

The implied reserve is not a real contribution plan. Users want a **real workbook DCA** toward épargne de sécurité (`envelope: LIVRET`), and that plan must feed **savings-capacity / emergency catch-up analysis** — without double-counting against investment DCA. If the LIVRET DCA **exceeds** the catch-up need, the product must **alert**.

Today’s gaps:

| Gap | Why it hurts |
|---|---|
| DCA UI requires asset baskets | Awkward / invalid for cash LIVRET deposits |
| `computeMonthlyDcaPool` sums **all** envelopes | LIVRET DCA competes with investable surplus *and* sits beside an implied EF reserve → double-count risk |
| No over-contribution signal | User can over-fund LIVRET vs personal target without warning |

## Scope

### Phase A — configurable target & horizon (done)

- [x] Persist EF target + catch-up horizon (`Fonds urgence`); defaults 6 / 12.
- [x] Core helpers + web Reglages edit; mobile read; savings capacity uses config.
- [x] ADR 0018; glossary; health bands + next-euro P1 unchanged.

### Phase B — LIVRET DCA accounted in capacity (todo)

- [x] **One behavior:** allow a real `DcaConfig` with `envelope: LIVRET` suited to cash deposits (no broker basket), and make `computeSavingsCapacity` split LIVRET vs investment DCA so LIVRET contributions count toward the emergency catch-up path; **alert** when planned LIVRET DCA exceeds the implied catch-up need.
- [x] **Core:** capacity math + helpers; schema/UI rules for LIVRET plans; tests. No duplicated thresholds in UI.
- [x] **Web:** DCA planner supports LIVRET cash mode; capacity card (+ DCA soft warning surface) shows LIVRET planned vs need and over-contribution alert.
- [x] **Mobile:** read path via shared core (capacity card); LIVRET cash-mode edit polish deferred unless already trivial in existing Investissements form.
- [x] **Docs:** ADR follow-on (0019) superseding ADR 0017 “all DCA = investment pool” for capacity; glossary + `savings-capacity.md` / DCA notes; append-only notes on ADR 0017 / 0018.
- [x] Files / packages expected to change (indicative):
  - `packages/core` — `savings-capacity.ts`, possibly `next-euro-plan.ts` (`computeMonthlyDcaPool` split helpers), `schema` / DCA validation for LIVRET lines, tests
  - `src` — `dca-config-card` / planner LIVRET mode; `savings-capacity-card` (+ over-commit banner if reused)
  - `mobile/` — capacity card copy only unless edit is free
  - `docs/adr/0019-…`, glossary, topic notes; `FEATURES.md` on merge

## Product decisions

Status legend: **LOCKED** = cadrage for V1 · **OPEN** = must answer before coding.

### Phase A (locked — shipped on branch)

| # | Decision | Status | Choice |
|---|---|---|---|
| D1 | Target representation | **LOCKED** | Months primary + optional absolute € override. |
| D2 | Catch-up horizon | **LOCKED** | `catchUpHorizonMonths`; implied need = `max(0, targetEuro − livret) / horizon`. Does **not** auto-write DCA. |
| D3 | Defaults | **LOCKED** | 6 months / 12 months when sheet absent. |
| D4 | Persistence | **LOCKED** | Workbook sheet `Fonds urgence`. |
| D5 | Health bands | **LOCKED** | Fixed 3 / 6 / 12 (ADR 0005). |
| D6 | Capacity uses config | **LOCKED** | Configured target/horizon replace former constants. |
| D7 | Next-euro P1 | **LOCKED** | Unchanged (`insufficient` → fill to 3 months). |
| D8–D10 | Platforms / UI / override w/o expenses | **LOCKED** | As ADR 0018. |

### Phase B (locked 2026-08-24 after user confirm)

| # | Decision | Status | Choice |
|---|---|---|---|
| D11 | Stay on branch | **LOCKED** | Extend this CONTRACT; do not open a second feature branch for Phase B. |
| D12 | Persistence of EF contribution plan | **LOCKED** | **Real `DcaConfig`** in sheet `DCA` with `envelope: LIVRET`. Not a parallel field on `Fonds urgence`. User creates/edits the plan in Investissements / DCA (no auto-create from Reglages). |
| D13 | LIVRET plan shape | **LOCKED** | Cash deposit stream: when `envelope === LIVRET`, **no broker asset basket required**. Schema/UI allow empty `lines` (or a single non-asset placeholder cleared on persist) for LIVRET only; other envelopes keep `lines.min(1)` + assets. Execution / share-buy UI is N/A for LIVRET (show as dépôt mensuel). |
| D14 | Capacity split | **LOCKED** | `plannedLivretDcaMonthly` = monthlyize configs with `envelope === LIVRET`. `plannedInvestmentDcaMonthly` = all other envelopes. Implied catch-up **need** stays `monthlyEmergencyCatchUpReserve` (config). Effective EF monthly outflow for surplus = `max(need, plannedLivretDcaMonthly)`. Investment status compares **investment** DCA only to `investableSurplus = rawSavings − that outflow`. |
| D15 | Under-plan (planned &lt; need) | **LOCKED** | No special alert. Card continues to show implied need / remaining gap as today (copy may mention planned LIVRET vs need). |
| D16 | Over-plan (planned &gt; need) | **LOCKED** | **Alert.** Dedicated signal from core (e.g. `emergencyOverContributing: true` and/or positive `emergencyOverContribution = plannedLivret − need`). Surfaces: Dashboard capacity card + soft warning on web DCA page. Does **not** by itself force investment status to `over_committed` (that status stays investment-vs-surplus). When `need === 0` and `plannedLivret &gt; 0`, still alert (over-funding past target). |
| D17 | Multiple LIVRET DCA configs | **LOCKED** | Sum monthlyized amounts (same as pool helpers). |
| D18 | Next-euro / Projection / coherence | **LOCKED** | **Unchanged in Phase B** except capacity split helpers may be shared. Next-euro still reallocates the full monthly pool per ADR 0015 (no LIVRET-exclusion rewrite). Projection may already include LIVRET streams — leave behavior unless broken by empty lines (fix if needed). |
| D19 | Docs | **LOCKED** | New ADR 0019 (accepted on ship) for LIVRET DCA + capacity accounting + over-contribution alert; append-only see-also on 0017 / 0018. |
| D20 | Mobile edit of LIVRET cash DCA | **LOCKED** | Web must support create/edit. Mobile: if existing form already allows `LIVRET` + can save without assets after schema change, keep it; else defer polish (read capacity still works). |

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core` — LIVRET vs investment split; outflow = max(need, plannedLivret); over-contribution flag; LIVRET empty-lines schema; capacity card / banner copy tests as touched
- Layer 3: `make e2e` — workbook I/O; DCA LIVRET save path if covered by smoke, else API/unit + targeted UI test
- Feature-specific:
  - Create LIVRET DCA → capacity shows planned LIVRET and reduces surplus without double-counting investment DCA
  - `plannedLivret &gt; need` → alert visible on capacity (+ web DCA warning)
  - `plannedLivret ≤ need` → no over-contribution alert; investment status unchanged in meaning
  - No LIVRET DCA → same numbers as Phase A (implied need only)

### Phase C — readable state + recommendation copy (todo)

- [x] **One behavior:** make Dashboard (web + mobile) **Savings capacity** and web **Next-euro** cards state the question, the current state, and an explicit recommendation in plain French — without changing domain math or workbook writes.
- [x] Shared FR copy helpers in `@patrimo/core` (web + mobile consume the same strings).
- [x] Soft banners on web DCA / Investissements / Projection use the same recommendation wording when over-committed / LIVRET over-contributing.
- [x] Tests for card / banner copy updated; no new ADR (UX only; ADRs 0015 / 0017 / 0019 semantics unchanged).

## Product decisions (Phase C)

| # | Decision | Status | Choice |
|---|---|---|---|
| D21 | Stay on branch | **LOCKED** | Extend this CONTRACT; UX polish on the same cards, not a second feature branch. |
| D22 | Domain math | **LOCKED** | Unchanged. Copy / layout only. |
| D23 | Card pattern | **LOCKED** | Each card shows: (1) short question, (2) status / lead figure, (3) explicit **À faire** recommendation sentence, (4) supporting numbers secondary. |
| D24 | Next-euro lead | **LOCKED** | Lead sentence from the first actionable step (buy with € > 0, else first step); full step list remains. |
| D25 | Titles | **LOCKED** | Keep titles « Capacité d'épargne » and « Prochain euro »; clarify via subtitle + recommendation, not rename. |

## Exclusions

- Not in this branch: **auto-create / resize** DCA or budget `EPARGNE` rows from Reglages / implied reserve
- Not in this branch: changing ADR 0005 status band cutoffs
- Not in this branch: next-euro rewrite to prefer personal EF target or exclude LIVRET from the reallocation pool (D18)
- Not in this branch: Livret A vs LDDS split; push/OS notifications; EF history chart
- Not in this branch: treating EF config as a **Financial goal** in `Objectifs`
- Not in this branch: forcing investment `over_committed` solely because LIVRET over-contributes (separate alert — D16)
- Not in this branch: renaming glossary terms or changing next-euro priorities
- Not in this branch: mobile Next-euro UI (still absent per ADR 0015)
- Do not refactor unrelated modules

## Checker

- [x] Phase B scored Pass (2026-08-24) — historical
- [ ] Fresh session or distinct checker role will score **Phase C** with [scoring-rubric.md](../../scoring-rubric.md) after implementation
- Pass bar: no D on correctness; architecture ≥ B; evidence cited

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix (EF config + savings capacity / DCA notes)
- [ ] Accept ADR 0018 (already) + ADR 0019; link glossary + ADR 0017 / 0018 see-also
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Phase A locked 2026-08-24. Phase B decisions D11–D20 locked. Phase C decisions D21–D25 locked (UX copy: question + état + reco; math unchanged). `make branch-ready` must pass before Phase C coding.
