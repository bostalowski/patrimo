# Implement geographic allocation

Ordered vertical scopes and test strategy for geographic allocation (web + mobile).

> 🚧 Increment scopes 7–9 are Phase 1.5 drafts — confirm after implementation. See [ADR 0009](../adr/0009-account-detail-and-mobile-justetf.md).

## Prerequisites

- Spec: [ADR 0008](../adr/0008-geographic-allocation.md) (accepted), [ADR 0009](../adr/0009-account-detail-and-mobile-justetf.md) (proposed)
- Branch: `feat/account-detail-and-mobile-justetf`
- Phase 0 checklist (ADR 0009): account detail + mobile JustETF cases

## Increment plan

### Scope 1 — Model + workbook persistence (done)

Schema `GeographicAllocation`, sheet `Exposition geo`, template headers, web + mobile Excel serializers, core replace/normalize/validate, deletion cascade.

Tests: `src/lib/geographic-allocation-core.test.ts`, `geographic-allocation-excel.test.ts`, `geographic-allocation-deletion.test.ts`.

### Scope 2 — Aggregation (done)

`aggregateGeographicExposure` / `aggregateGeographicExposureForAccount` in `@patrimo/core`.

Tests: `src/lib/geographic-allocation-aggregate.test.ts`.

### Scope 3 — JustETF sync (done, web path)

Parse JustETF country tables, `applyFetchedGeographicAllocation` with manual lock, soft-fail sync helper.

Tests: `src/lib/prices/justetf-geography.test.ts` (move with parser into core under Scope 8).

### Scope 4 — Web UI (done; account panel location superseded by Scope 7)

`/geographie`, asset detail, `/api/geography` (+ sync). Per-account geo on the accounts **list** is removed in Scope 7.

Tests: `src/components/geographic-exposure-panel.test.tsx`, `src/app/api/geography/route.test.ts`.

### Scope 5 — Mobile UI (done; account panel location superseded by Scope 7)

Plus → Géographie, edit-asset manual weights. Per-account geo on the accounts **list** is removed in Scope 7.

Tests: `mobile/lib/geographic-ui.test.tsx`.

### Scope 6 — Web interactive country map (done)

Replace finance-region donuts on web geo surfaces with choropleth + country list. Mobile map deferred.

Tests: `src/components/geographic-exposure-panel.test.tsx`.

### Scope 7 — Account detail surface (planned)

Web `/comptes/[id]` and mobile account-detail: positions + account geo (dual country/region views); strip full geo from accounts lists; list navigates to detail (mobile: detail → edit-account for metadata).

Tests: web comptes list/detail UI tests; `mobile/lib/geographic-ui.test.tsx` (accounts list + detail).

### Scope 8 — Shared JustETF parse + mobile sync (planned)

Move parse + `applyJustEtfGeographicSync` into `@patrimo/core`; web API route keeps fetch only; mobile edit-asset gains JustETF / restore actions when ISIN present; soft-fail on fetch/parse failure.

Tests: core JustETF geography tests (moved); mobile geographic UI sync cases.

### Scope 9 — Region-level allocations + dual views + guided pickers (planned)

Core: accept homogeneous region keys in `Pays`; country vs region aggregation rules; reject mixed rows. UI (web + mobile): mode countries|regions; closed region list; searchable country picker with French labels; show country and region breakdowns on geo surfaces.

Tests: core allocation/aggregation for region rows; web + mobile guided entry and dual-view UI tests.

## Test strategy

| Level | What it proves |
|---|---|
| Core unit | Validation sum; replace; manual lock; deletion; aggregation; JustETF parse; soft-fail apply |
| Excel adapters | Round-trip sheet; missing sheet = empty; percent ↔ fraction |
| Web / mobile UI | Account list has no full geo; detail shows account geo; mobile JustETF sync / restore / no-ISIN |

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
- [ADR 0009](../adr/0009-account-detail-and-mobile-justetf.md)
