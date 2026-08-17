# Implement geographic allocation

Ordered vertical scopes and test strategy for geographic allocation (web + mobile).

## Prerequisites

- Spec: [ADR 0008](../adr/0008-geographic-allocation.md) (accepted), [ADR 0009](../adr/0009-account-detail-and-mobile-justetf.md) (accepted), [ADR 0010](../adr/0010-partial-geographic-allocation-weights.md) (accepted — partial weights)
- Branch (current increment): `fix/geo-partial-allocation-weights`

## Increment plan (ADR 0010)

### Scope A — Core validation + absolute aggregation (done)

Allow `0 < sum ≤ 1` on replace/normalize; reject sum &gt; 1; aggregate with absolute weights; drop country `OTHER` without renormalizing. Covers Phase 0 cases 1, 2, 4, 5.

Tests: `src/lib/geographic-allocation-core.test.ts`, `src/lib/geographic-allocation-aggregate.test.ts`, region cases as needed in `src/lib/geographic-region-allocation.test.ts`.

### Scope B — Editor sum indicator (web + mobile) (done)

Non-blocking current-sum feedback on geographic editors; save still allowed under Scope A rules. Covers Phase 0 case 3.

Tests: `src/components/geographic-exposure-panel.test.tsx`, `mobile/lib/geographic-ui.test.tsx`.

---

## Prior increments (done)

### Scope 1 — Model + workbook persistence (done)

Schema `GeographicAllocation`, sheet `Exposition geo`, template headers, web + mobile Excel serializers, core replace/normalize/validate, deletion cascade.

Tests: `src/lib/geographic-allocation-core.test.ts`, `geographic-allocation-excel.test.ts`, `geographic-allocation-deletion.test.ts`.

### Scope 2 — Aggregation (done)

`aggregateGeographicExposure` / `aggregateGeographicExposureForAccount` in `@patrimo/core`.

Tests: `src/lib/geographic-allocation-aggregate.test.ts`.

### Scope 3 — JustETF sync (removed)

Earlier scrape/sync path deleted. Geography writes are manual-only (`source=manual`). Legacy `source=justetf` rows remain readable.

### Scope 4 — Web UI (done; account panel location superseded by Scope 7)

`/geographie`, asset detail, `/api/geography` (manual POST only). Per-account geo on the accounts **list** is removed in Scope 7.

Tests: `src/components/geographic-exposure-panel.test.tsx`, `src/app/api/geography/route.test.ts`.

### Scope 5 — Mobile UI (done; account panel location superseded by Scope 7)

Plus → Géographie, edit-asset manual weights. Per-account geo on the accounts **list** is removed in Scope 7.

Tests: `mobile/lib/geographic-ui.test.tsx`.

### Scope 6 — Web interactive country map (done)

Replace finance-region donuts on web geo surfaces with choropleth + country list. Mobile map deferred.

Tests: `src/components/geographic-exposure-panel.test.tsx`.

### Scope 7 — Account detail surface (done)

Web `/comptes/[id]` and mobile account-detail: positions + account geo (dual country/region views); strip full geo from accounts lists; list navigates to detail (mobile: detail → edit-account for metadata).

Tests: `src/app/comptes/comptes-account-detail.test.tsx`; `mobile/lib/geographic-ui.test.tsx`.

### Scope 8 — Shared JustETF parse + mobile sync (removed)

JustETF parse, `/api/geography/sync`, and mobile sync actions removed. Manual entry only.

### Scope 9 — Region-level allocations + dual views + guided pickers (done)

Core: homogeneous region keys; country vs region aggregation. UI: mode countries|regions; closed region list; searchable/selectable country picker; dual breakdowns on geo surfaces.

Tests: `src/lib/geographic-region-allocation.test.ts`; web + mobile geographic UI picker/dual-view cases.

## Test strategy

| Level | What it proves |
|---|---|
| Core unit | Partial sum accepted; sum &gt; 1 rejected; absolute aggregation; OTHER not redistributed; replace; deletion |
| Excel adapters | Round-trip sheet; missing sheet = empty; percent ↔ fraction |
| Web / mobile UI | Non-blocking sum indicator; account list has no full geo; detail shows account geo; guided manual pickers; no JustETF actions |

## Commands

```bash
npm test -- src/lib/geographic-allocation
npm test -- src/components/geographic-exposure-panel.test.tsx src/app/api/geography/route.test.ts
npm test -- mobile/lib/geographic-ui.test.tsx
```

## See also

- [Geographic allocation](../architecture/geographic-allocation.md)
- [ADR 0008](../adr/0008-geographic-allocation.md)
- [ADR 0009](../adr/0009-account-detail-and-mobile-justetf.md)
