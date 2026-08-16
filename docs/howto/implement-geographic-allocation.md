# Implement geographic allocation

Ordered vertical scopes and test strategy for geographic allocation (web + mobile). Confirmed against shipped code on `feat/geographic-allocation`.

## Prerequisites

- Spec: [ADR 0008](../adr/0008-geographic-allocation.md) (accepted)
- Branch: `feat/geographic-allocation`
- Phase 0 checklist cases 1–12 (cases 9–12 out of scope)

## Increment plan

### Scope 1 — Model + workbook persistence (done)

Schema `GeographicAllocation`, sheet `Exposition geo`, template headers, web + mobile Excel serializers, core replace/normalize/validate, deletion cascade.

Tests: `src/lib/geographic-allocation-core.test.ts`, `geographic-allocation-excel.test.ts`, `geographic-allocation-deletion.test.ts`.

### Scope 2 — Aggregation (done)

`aggregateGeographicExposure` / `aggregateGeographicExposureForAccount` in `@patrimo/core`.

Tests: `src/lib/geographic-allocation-aggregate.test.ts`.

### Scope 3 — JustETF sync (done, web)

Parse JustETF country tables, `applyFetchedGeographicAllocation` with manual lock, soft-fail sync helper.

Tests: `src/lib/prices/justetf-geography.test.ts`.

### Scope 4 — Web UI (done)

`/geographie`, asset detail, comptes panels, `/api/geography` (+ sync).

Tests: `src/components/geographic-exposure-panel.test.tsx`, `src/app/api/geography/route.test.ts`.

### Scope 5 — Mobile UI (done)

Plus → Géographie, edit-asset manual weights, comptes panels.

Tests: `mobile/lib/geographic-ui.test.tsx`.

### Scope 6 — Web interactive country map (done)

Replace finance-region donuts on web geo surfaces with choropleth + country list. Mobile map deferred.

Tests: `src/components/geographic-exposure-panel.test.tsx`.

## Test strategy

| Level | What it proves |
|---|---|
| Core unit | Validation sum; replace; manual lock; deletion; aggregation; exclude missing; region map |
| Excel adapters | Round-trip sheet; missing sheet = empty; percent ↔ fraction |
| JustETF fetcher | Fixture → ISO weights; errors do not write |
| Web / mobile UI | Covered slices render; empty asset state; manual save; accounts aggregate |

## Commands

```bash
npm test -- src/lib/geographic-allocation
npm test -- src/lib/prices/justetf-geography.test.ts
npm test -- src/components/geographic-exposure-panel.test.tsx src/app/api/geography/route.test.ts
npm test -- mobile/lib/geographic-ui.test.tsx
```

## See also

- [Geographic allocation](../architecture/geographic-allocation.md)
- [ADR 0008](../adr/0008-geographic-allocation.md)
