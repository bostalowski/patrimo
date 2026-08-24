# Contract: Configurable emergency-fund target & catch-up

- Branch: `feat/emergency-fund-config`
- Slug: `feat-emergency-fund-config`
- Matrix row (FEATURES.md): new row **Emergency fund config** (or extend **Emergency fund health** / **Savings capacity**) — status TBD on merge
- Relates: ADR 0005 (health indicator), ADR 0015 (next-euro P1), ADR 0017 (savings capacity; currently forbids editable targets)

## Context

Today the emergency fund is **derived only**:

| Consumer | Hardcoded rule |
|---|---|
| `computeEmergencyFundHealth` (ADR 0005) | Status bands &lt;3 / [3,6) / [6,12) / ≥12 months |
| `computeSavingsCapacity` (ADR 0017) | Target **6** months; catch-up over **12** months |
| `buildNextEuroPlan` P1 (ADR 0015) | Routes to LIVRET only when status is `insufficient` (&lt; 3 months); gap = `3×expenses − livret` |

Users cannot set **how much** reserve they want, nor **over how long** (implied monthly DCA) to reach it. ADR 0005 and ADR 0017 explicitly deferred editable targets — this branch lifts that exclusion with a new ADR (supersession / follow-on, not silent edit of accepted contracts).

## Scope

- [x] **One behavior:** persist a user-configurable emergency-fund **target** and **catch-up horizon**, use them in `@patrimo/core` for catch-up / capacity math, and expose a settings UI to edit them. Defaults match today’s constants (6 months / 12 months) so existing workbooks behave identically until edited.
- [x] **Core:** schema + serializers + pure helpers; no duplicated thresholds in UI.
- [x] **Web:** edit UI + Dashboard (and savings-capacity consumers) reflect configured values.
- [x] **Mobile:** TBD — see product decisions (parity vs web-first).
- [x] **Docs:** glossary updates; ADR `0018` (proposed → accepted on ship); topic / ARCHITECTURE notes; supersede the “FORBIDDEN editable targets” clauses of ADR 0005 / 0017 via the new ADR.
- [ ] Files / packages expected to change (indicative):
  - `packages/core` — schema, workbook template/serializers, `savings-capacity.ts` (and possibly `emergency-fund.ts` / `next-euro-plan.ts` depending on locked consumers)
  - `src` — settings or dedicated form + Dashboard card copy
  - `mobile/` — only if mobile-in-scope
  - `docs/reference/glossary.md`, `docs/adr/0018-…`, `FEATURES.md` on merge

## Product decisions

Status legend: **LOCKED** = cadrage default for V1 · **OPEN** = must answer before `make branch-ready` / coding.

| # | Decision | Status | Choice |
|---|---|---|---|
| D1 | Target representation | **LOCKED** | **C — both:** store `targetMonths` (primary) + optional absolute `targetAmountOverride`. Prefer override for target-gap computations when present and valid; otherwise use `targetMonths × depensesMensuelles` when expenses &gt; 0. |
| D2 | Catch-up / “temps · DCA” | **LOCKED** (pending confirm) | Store `catchUpHorizonMonths` (integer ≥ 1). Implied monthly contribution toward the gap = `max(0, targetEuro − livretBalance) / catchUpHorizonMonths`. Does **not** auto-write a DCA line (show / feed capacity only). |
| D3 | Defaults when unset / missing sheet | **LOCKED** (pending confirm) | `targetMonths = 6`, `catchUpHorizonMonths = 12` (ADR 0017 constants). Empty / absent config ≡ defaults. |
| D4 | Persistence | **LOCKED** | **Workbook** optional sheet (CONSTRAINTS §1: portfolio intent travels with the file). Single-row or key/value. Sheet name **must** be glossary + `workbook-template` (do not invent at code time). **Rejected for V1:** `data/config.json` only (not portable with workbook). |
| D5 | Health status bands (ADR 0005) | **LOCKED** (pending confirm) | Keep fixed bands 3 / 6 / 12. Personal target is a **planning goal**, not a redefinition of `insufficient` / `healthy`. Card may show progress toward the personal target *in addition* to the health band. |
| D6 | Savings capacity consumer | **LOCKED** (pending confirm) | Replace `SAVINGS_CAPACITY_EF_TARGET_MONTHS` / `CATCH_UP_HORIZON` with configured values (defaults identical). |
| D7 | Next-euro P1 consumer | **LOCKED** | **A — unchanged:** P1 still triggers on `insufficient` (&lt; 3) and fills to 3 months. Configured target affects capacity + configuration UX only in V1. |
| D8 | Platforms | **LOCKED** | Web edit + web/mobile **read** (Dashboard / capacity use shared core). Mobile edit form deferred to a follow-up. |
| D9 | UI surface | **LOCKED** | `Reglages` form (single block): target months, optional absolute target €, catch-up horizon; show derived monthly € and effective target €. |
| D10 | Absolute euro without budget expenses | **LOCKED** | With D1=C: when `targetAmountOverride` is present, it remains usable even if `depensesMensuelles ≤ 0`; months-derived target remains display-only when expenses are available. Health indicator null behavior from ADR 0005 stays unchanged. |

### Proposed V1 lock (if confirmed as a package)

1. **D1 = C (both):** `targetMonths` primary + optional `targetAmountOverride`.
2. **D2–D6** as locked above.
3. **D4 = workbook** optional sheet (name fixed in ADR + glossary before code).
4. **D7 = A** (next-euro unchanged in V1).
5. **D8–D9 = recommended** (`Reglages`, web edit; mobile read only).
6. **D10 locked**: override works without budget expenses; health null rule unchanged.
7. New ADR 0018; ADR 0005 / 0017 get a short “superseded for editable targets by 0018” note (append-only).

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core` — schema round-trip; defaults when missing; savings-capacity with custom target/horizon; serializers
- Layer 3: `make e2e` — workbook I/O + settings/UI write path
- Feature-specific: edit target/horizon → reload workbook → capacity reserve and UI match; unset sheet → same numbers as pre-feature (6 / 12)

## Exclusions

- Not in this branch: auto-create / resize DCA lines or budget `EPARGNE` rows from the EF plan
- Not in this branch: changing ADR 0005 status band cutoffs (unless D5 is reopened)
- Not in this branch: next-euro rewrite (unless D7 = B is locked)
- Not in this branch: Livret A vs LDDS split; push alerts; EF history chart
- Not in this branch: treating EF config as a **Financial goal** row in `Objectifs` (separate concept)
- Do not refactor unrelated modules

## Checker

- [x] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited
- **2026-08-24 — Pass** (see branch [PROGRESS.md](./PROGRESS.md) § Checker): Correctness A, Architecture A, Scope A, Tests A, Docs A

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix
- [ ] Accept ADR 0018; link from glossary + ADR 0005 / 0017 see-also
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

All product decisions are locked for V1 after user confirmation (2026-08-24). `make branch-ready` should now pass once PROGRESS no longer reports blockers.
