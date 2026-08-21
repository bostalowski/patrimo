# Contract: Envelope contribution overflow at plafond

- Branch: `feat/envelope-overflow-plafond`
- Slug: `feat-envelope-overflow-plafond`
- Matrix row (FEATURES.md): Projection / web (mobile deferred)
- Issue: [bostalowski/patrimo#18](https://github.com/bostalowski/patrimo/issues/18)

## Context

`projectInvestment` already clips monthly/stream contributions when `invested >= plafond` (`plafondReachedMonth`). The clipped surplus is discarded. Users expect that amount to keep being invested elsewhere (typically PEA → CTO).

## Scope

- [x] **One behavior:** when a projected envelope stops accepting contributions because of its plafond, the surplus for remaining months is routed into a fallback envelope (default **CTO**), and the UI states which envelope receives the overflow and from when.
- [x] **Core (required):** overflow routing lives in `@patrimo/core` (CONSTRAINTS §6) — not duplicated in web cards.
  - Extend or wrap `projectInvestment` so multi-envelope projection can apply single-hop overflow.
  - Default fallback: `CTO`. Optional global `overflowEnvelope` override (projection params / UI), not a workbook column in V1.
  - Return enough metadata for UI copy (source envelope, target, month/year of first overflow, monthly surplus when constant).
  - Extra contribution streams (`TRIMESTRIEL` / `ANNUEL`) participate in the same clip → overflow path as monthly.
- [x] **Web:** wire `EnvelopeProjection` and `RetirementIncomeCard` so totals and charts use overflow-aware results; surface a short French message (e.g. « PEA plafond atteint en année 5 → 500 €/mois redirigés vers CTO »).
- [x] **Docs:** glossary term for overflow; short note in `packages/core/ARCHITECTURE.md` (or topic note); ADR if the API shape is a lasting product decision (recommended).
- [x] Files / packages expected to change:
  - `packages/core/src/projection.ts` (+ tests)
  - `src/app/projection/envelope-projection.tsx`
  - `src/app/projection/projection-client.tsx` (`RetirementIncomeCard`)
  - `docs/reference/glossary.md`, ADR under `docs/adr/`, optional core topic note

## Product decisions (locked for V1)

| Decision | Choice |
|---|---|
| Fallback default | `CTO` |
| Config granularity | **Global** `overflowEnvelope` for the projection view (not per-source-envelope map) |
| Persistence | **UI / session only** — not a workbook field / sheet column |
| Hop count | **Single hop** — surplus goes to the fallback once; if the fallback is also at plafond that month, remaining surplus is dropped (no chain) |
| Self-overflow | If source === fallback, no redirect (clip as today) |
| Envelopes without plafond | Unchanged; can receive overflow |
| Who computes | `@patrimo/core` only; platforms display |

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core/src/projection` (overflow cases: mid-horizon PEA→CTO, partial first month, extras streams, fallback also capped, source===fallback)
- Layer 3: `make e2e` — web Projection UI change
- Feature-specific: manual Projection check with PEA near 150k€ plafond and positive monthly → overflow message + CTO final value increases vs baseline without overflow

## Exclusions

- Not in this branch: mobile Projection / retirement UI parity (follow-up OK)
- Not in this branch: workbook schema, `Comptes.Plafond` semantics, or DCA plan mutation
- Not in this branch: multi-hop cascade (A→B→C) or per-envelope overflow map
- Not in this branch: `projectLivret`; `retraite.ts` / financial-goals callers (plain `projectInvestment`); fiscal-advice PFU surplus copy
- Do not refactor unrelated modules

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited

## On merge

- [x] Update root [FEATURES.md](../../../../FEATURES.md) Projection notes if web behavior deserves a note (status stays `done` / mobile still `partial`)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)
