# ADR 0024: Official Livret A / LDDS rate series (sync + quinzaine math)

- Status: accepted
- Date: 2026-08-30
- implementation_ready: yes
- Extends: CONSTRAINTS §4 (network allowlist) — regulated livret rates join price sources

```text
Contract (do not invent):

LIVRET interest estimation / projection:
  uses official rate series only (seed ∪ cache)
  account.rate is UI mirror / create prefill — NEVER feeds math

Quinzaine math:
  rate_in_force at quinzaine start × principal / 24
  deposit/withdrawal value dates unchanged (no daily prorata)
  after INTERET on D → estimate only after D
  before first palier → first palier (D5)
  projection future → last known palier (no anticipation)

Source (D1):
  fetch/merge DURING price sync (web POST /api/prices/sync + mobile syncPrices)
  NOT Excel; NOT core network I/O; NOT separate UX button

Cache (D1b):
  web: data/livret-rates.json (like prices.json)
  mobile: AsyncStorage
  merge by effectiveFrom; incoming wins
  embedded LIVRET_RATE_SEED in @patrimo/core for cold start / offline

Network source (D1c):
  OpenFisca-France parameter YAML (arrêtés mirrored):
  openfisca_france/parameters/taxation_capital/epargne/livret_a/taux.yaml
  via raw.githubusercontent.com/openfisca/openfisca-france/...
  A ≡ LDDS (same series)

Isolation (D9):
  livret rate fetch failure MUST NOT fail price sync
  MUST NOT wipe rate cache on error

UI V1 (D6):
  web LIVRET form shows current regulated rate + prefills rate on create
  no dedicated rate-sync button
```

## Context

LIVRET accrued-interest estimates used a single `Comptes.Taux` scalar. French
regulated booklets change rate by dated palier; banks accrue by quinzaine at the
rate in force. Users want bank-faithful estimates and a series kept fresh the
same way market prices are synced, without putting a national barème into the
workbook source of truth.

## Decision

1. Put types, seed, resolve/merge helpers, and quinzaine math in `@patrimo/core`
   (`livret-rates.ts`, `livret.ts`). Core stays pure: series in, state out.
2. Platforms fetch OpenFisca YAML during price sync, merge into a local cache,
   and pass `effectiveLivretRateSeries(cache)` into `buildPortfolio`.
3. Extend CONSTRAINTS §4: network is allowed for regulated Livret A/LDDS rates
   (same family as price sources), documented here.

## Invariants

1. `account.rate` never enters estimation or projection math.
2. Core performs no network I/O.
3. Rate cache is not recoverable portfolio history (CONSTRAINTS §2 spirit).
4. Price sync succeeds even when the rate fetch fails; cache is preserved.
5. Livret A and LDDS share one series.

## Options considered

### Option A — Seed-only at release (rejected)

**Advantages:** No network; simpler.

**Disadvantages:** Stale between ships; human preferred sync with prices.

### Option B — Excel rate sheet (rejected)

**Advantages:** Visible in workbook.

**Disadvantages:** National barème ≠ portfolio SoT; dual write risk.

### Option C — Sync with prices + seed + cache (chosen)

**Advantages:** Fresh rates; offline via seed; core purity; same UX gesture.

**Disadvantages:** Depends on OpenFisca mirror staying current (fallback = seed).

## Consequences

- Web `data/livret-rates.json` and mobile AsyncStorage grow a derived cache.
- ADR extends CONSTRAINTS §4 allowlist.
- OpenFisca YAML parse is best-effort; malformed responses leave cache intact.

## Uncovered cases

- LEP / CEL / PEL series; historical plafonds; auto-`INTERET`; A vs LDDS split.

## Follow-up

- Optional: surface non-blocking rate-sync error in sync UI meta.
- Mobile account form parity when that form is touched.

## See also

- Branch contract: `docs/agent/branches/feat-livret-official-rate-series/`
- [CONSTRAINTS.md](../../CONSTRAINTS.md) §4
- [glossary](../reference/glossary.md) — Livret rate series
- `packages/core/src/livret-rates.ts`, `src/lib/livret-rates/`, `mobile/lib/livret-rates.ts`
