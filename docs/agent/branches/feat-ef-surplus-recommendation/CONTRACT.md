# Contract: Emergency-fund surplus recommendation (keep investment DCA)

- Branch: `feat/ef-surplus-recommendation`
- Slug: `feat-ef-surplus-recommendation`
- Matrix row (FEATURES.md): **Next-euro plan** + **Savings capacity** (behavior change; web primary; mobile capacity card)
- Relates: ADR 0005 (health bands), ADR 0015 (next-euro — **P1 superseded**), ADR 0017 / 0019 (savings capacity + LIVRET DCA), ADR 0018 (EF config)

## Context

Today **Prochain euro** P1 (ADR 0015) **reallocates** the monthly DCA pool toward LIVRET to reach **3 months** of expenses. That steals from investment DCA (e.g. MSCI) and ignores the configured EF target / horizon and existing LIVRET DCA.

Users want an **advisory** recommendation that:

1. **Keeps** planned investment DCA unchanged.
2. Aims at the **configured** emergency-fund target (Réglages / `Fonds urgence`).
3. Uses **oneshot** when cash after investment DCA covers the full gap; otherwise follows the **catch-up horizon**, deducting planned LIVRET DCA.
4. Surfaces the same math clearly on **Savings capacity** and as a **banner above** Next-euro (body stays DCA / diversification).

## Scope

- [x] **One behavior:** replace next-euro emergency P1 reallocation with a surplus-based LIVRET recommendation (oneshot or monthly), shared in `@patrimo/core`, shown on web Savings capacity + Next-euro banner; mobile capacity card consumes the same core result. Investment DCA is never redirected to LIVRET by this plan.
- [x] **Core:** pure function(s) for EF surplus recommendation + FR copy helpers; wire into `buildNextEuroPlan` (no P1 pool steal) and `computeSavingsCapacity` / capacity copy; unit tests.
- [x] **Web:** capacity card explicit recommendation; Next-euro **separate banner** above DCA steps (not “réallouer le pool” for LIVRET).
- [x] **Mobile:** capacity card recommendation via shared copy (Next-euro UI still absent).
- [x] **Docs:** new ADR (proposed → accepted on ship) superseding ADR 0015 P1 only; glossary + `next-euro-plan.md` / `savings-capacity.md`; append-only see-also on 0015 / 0018 / 0019.
- [x] **Follow-up same PR:** Monthly DCA tilt → Exécution (`buildMonthlyDcaTilt`, ADR 0021): investment pool only, verdicts, capped catch-up, Exécution consumes tilt contributions; card = Tilt DCA du mois + link to Exécution.
- [x] Files / packages expected to change (indicative):
  - `packages/core` — new or extended module (e.g. `emergency-fund-recommendation.ts`), `next-euro-plan.ts`, `savings-capacity*.ts`, `next-euro-copy.ts`, tests
  - `src/components` — `savings-capacity-card.tsx`, `next-euro-plan-card.tsx` (+ tests)
  - `mobile/lib` — capacity card copy wiring
  - `docs/adr/00xx-…`, glossary, topic notes; `FEATURES.md` on merge
  - (tilt) `monthly-dca-tilt.ts`, `dca-execution.tsx`, `investissements/*`
## Product decisions

Status legend: **LOCKED** = cadrage for V1 · **OPEN** = must answer before coding.

| # | Decision | Status | Choice |
|---|---|---|---|
| D1 | EF target for recommendation | **LOCKED** | Configured target from `Fonds urgence` / ADR 0018 (`effectiveEmergencyFundTargetEuro`: months × expenses or € override). **Not** the ADR 0005 “3 months insufficient” fill. |
| D2 | Catch-up horizon | **LOCKED** | Use configured `catchUpHorizonMonths` (default 12) for monthly need when not oneshot. |
| D3 | Capacity base | **LOCKED** | `rawSavings = revenusMensuels − depensesMensuelles` (same as savings capacity; ignore budget `EPARGNE` labels). |
| D4 | Protect investment DCA | **LOCKED** | Always. Cash available for LIVRET **extra** / oneshot = `max(0, rawSavings − plannedInvestmentDcaMonthly)`. Planned investment DCA is never reduced or reallocated by this recommendation. |
| D5 | LIVRET DCA in the math | **LOCKED** | `plannedLivretDcaMonthly` counts toward closing the gap. Monthly “à ajouter” = `max(0, monthlyNeed − plannedLivretDcaMonthly)` then capped by available cash (D4). |
| D6 | Oneshot vs monthly | **LOCKED** | **Oneshot** when `gap ≤ availableCash` (D4), recommend depositing the full `gap` now (advisory). **Else** monthly path: `monthlyNeed = gap / catchUpHorizonMonths`, then D5. |
| D7 | Monthly display amount | **LOCKED** | Show explicit “à ajouter” from D5 (horizon need − LIVRET DCA, capped). UI must make numbers crystal-clear (gap, cible, horizon, déjà prévu LIVRET, à ajouter, oneshot vs mensuel). |
| D8 | LIVRET over / covers need | **LOCKED** | If `plannedLivretDcaMonthly ≥ monthlyNeed` (and not oneshot case with gap already 0): **no** “mets plus”. If `plannedLivret > monthlyNeed` (or need 0 and planned > 0): keep **baisse le LIVRET** alert (existing capacity over-contribution signal). |
| D9 | Gap definition | **LOCKED** | `gap = max(0, effectiveTargetEuro − livretBalance)`. When target euro undefined (no expenses and no override): no EF surplus recommendation (hide / null), consistent with capacity helpers. |
| D10 | Next-euro P1 / pool | **LOCKED** | **Remove** ADR 0015 P1 reallocation (`min(pool, 3×expenses − livret)`). Remaining pool is **investment-oriented** only for P2/P3 (diversification + residual DCA). LIVRET advice is **outside** the DCA envelope. |
| D11 | UI placement | **LOCKED** | **Both:** (1) Savings capacity card recommendation; (2) **banner / block separated above** Next-euro step list. Do **not** rename the Next-euro title; body question stays about DCA envelope. |
| D12 | Next-euro framing | **LOCKED** | Option B: keep « Prochain euro » / DCA question for the step list; EF surplus is a distinct banner (clearly “hors enveloppe DCA”). |
| D13 | Domain ownership | **LOCKED** | All recommendation math + FR recommendation strings in `@patrimo/core`; platforms only render. |
| D14 | Workbook writes | **LOCKED** | Read-only advice. MUST NOT auto-create or resize DCA / budget rows. |
| D15 | Health bands (ADR 0005) | **LOCKED** | Unchanged (3 / 6 / 12 status colors). Personal target does not redefine statuses. |
| D16 | Mobile Next-euro | **LOCKED** | Still absent this branch; mobile gets capacity-card recommendation only. |
| D17 | Docs | **LOCKED** | New ADR superseding **only** next-euro emergency P1 / pool-steal semantics; capacity surplus recommendation documented; append-only links on 0015 / 0018 / 0019. |

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core` (+ card/copy tests under `src` / mobile as touched)
- Layer 3: `make e2e` — Dashboard cards / smoke if UI paths covered; else targeted component tests + verify
- Feature-specific:
  - Investment DCA unchanged in next-euro steps when EF gap exists (no LIVRET steal from MSCI pool)
  - Oneshot when `gap ≤ rawSavings − investmentDca`
  - Monthly: `à ajouter = max(0, gap/horizon − livretDca)` capped by available cash; copy lists gap / prévu / à ajouter
  - `livretDca ≥ monthlyNeed` → no “mets plus”; over → baisse alert
  - Target/horizon from workbook config; defaults 6 / 12 when sheet absent
  - Same euros from core on capacity card and Next-euro banner (web)

## Exclusions

- Not in this branch: auto-create / auto-resize DCA or `EPARGNE` budget lines
- Not in this branch: changing ADR 0005 health band cutoffs
- Not in this branch: mobile Next-euro UI
- Not in this branch: Livret A vs LDDS split; push notifications; EF history chart
- Not in this branch: treating EF config as a Financial goal in `Objectifs`
- Not in this branch: changing diversification P2/P3 algorithm beyond removing EF pool steal
- Do not refactor unrelated modules

## Checker

- [x] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md) — **Pass** 2026-08-24 (see PROGRESS)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix notes for Next-euro / Savings capacity
- [ ] Accept new ADR; leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Decisions D1–D17 locked 2026-08-24 (user Q&A). `make branch-ready` must pass before coding.
