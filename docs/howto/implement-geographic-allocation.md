# Implement geographic allocation

> 🚧 Anticipated plan (Phase 1.5 draft) — confirm after implementation. See [ADR 0008](../adr/0008-geographic-allocation.md).

Ordered vertical scopes and test strategy for geographic allocation (web + mobile).

## Prerequisites

- Spec: [ADR 0008](../adr/0008-geographic-allocation.md) (`proposed` until Phase 5)
- Branch: `feat/geographic-allocation`
- Phase 0 checklist cases 1–12 (cases 9–12 out of scope)

## Increment plan

### Scope 1 — Model + workbook persistence

Schema `GeographicAllocation` (+ workbook field), sheet `Exposition geo`, template headers, web + mobile Excel serializers, core upsert/replace/normalize/validate (sum ≈ 1), deletion cascade hook.

Covers cases: 1 (persist shape), 2 (manual write path foundation), 8 (invalid rejection).

### Scope 2 — Aggregation

Pure `aggregateGeoExposure` (and account-scoped variant) in `@patrimo/core`: covered-only weighting, country slices, region rollup via fixed map.

Covers cases: 3, 4 (math), 6 (exclude without allocation).

### Scope 3 — JustETF sync

Platform fetcher(s) by ISIN → map countries to ISO/`OTHER` → core replace with `source=justetf`; skip when `manual`; explicit restore path; soft-fail on network/parse errors.

Covers cases: 1, 7.

### Scope 4 — Web UI

Nav “Géographie”, global donut (region + country), asset detail view/edit/sync, accounts page per-account geo.

Covers cases: 2, 3, 4 (web), 6 (asset empty state).

### Scope 5 — Mobile UI

Same capabilities on mobile (global entry, asset, accounts).

Covers case: 5.

## Test strategy

| Level | What it proves |
|---|---|
| Core unit | Validation sum; replace; manual lock skip; deletion cleanup; aggregation weights; exclude missing; region map |
| Excel adapters | Round-trip sheet; missing sheet = empty; percent ↔ fraction like DCA |
| JustETF fetcher | Maps sample HTML/fixture to weights; errors do not write |
| Web / mobile UI | Covered slices render; empty asset state; accounts aggregate |

## Commands

```bash
npm test -- <targeted patterns per scope>
```

## See also

- [Geographic allocation](../architecture/geographic-allocation.md)
- [ADR 0008](../adr/0008-geographic-allocation.md)
