# ADR 0009: Account detail, region allocations, and mobile JustETF

- Status: proposed
- Date: 2026-08-16
- implementation_ready: yes
- Amends: [ADR 0008](0008-geographic-allocation.md) (account geo placement; JustETF platform scope; shared JustETF parse; region-level manual allocations; dual country/region views)

```text
Contract (do not invent):
- WHEN the user opens the accounts list (web or mobile)
- THEN the list must not render the full per-account geographic exposure panel
- WHEN the user opens an account from the accounts list
- THEN navigate to a dedicated account detail surface for that account id
- WHEN viewing account detail (web `/comptes/[id]` or mobile account-detail)
- THEN show that account's positions and geographic exposure for that account only;
  empty geo → empty-state message, no error
- WHEN viewing geographic exposure (global, account, or asset) on web or mobile
- THEN show two complementary breakdowns: (1) countries — interactive map+list on
  web, list on mobile; (2) regions — list (or equivalent non-map) using the five
  product regions NORTH_AMERICA, EUROPE, ASIA_PACIFIC, EMERGING, OTHER
- WHEN aggregating the country breakdown
- THEN include only assets whose allocation rows are country-level (ISO 3166-1
  alpha-2 or residual OTHER); exclude assets whose rows are region keys
- WHEN aggregating the region breakdown
- THEN include country-level assets by rolling countries via regionForCountry,
  and include region-level assets by using their region keys as-is
- WHEN the user saves a manual geographic allocation for an asset
- THEN all rows for that asset are either country-level or region-level
  (homogeneous); mixing country codes and region keys on one asset is rejected
- WHEN entering manual geography
- THEN the UI offers a mode switch (countries | regions) and guided pickers:
  regions = closed list of the five product regions with French labels;
  countries = searchable/selectable list of ISO alpha-2 with French labels
  (plus OTHER); free-typed codes outside the picker are not accepted
- WHEN JustETF sync succeeds
- THEN write country-level rows (source=justetf), replacing any previous manual
  rows only under ADR 0008 lock/restore rules; asset becomes country-mode
- WHEN JustETF sync is triggered for an asset with ISIN (web or mobile)
- THEN fetch profile HTML, parse with shared core parser, apply via
  applyFetchedGeographicAllocation
- WHEN JustETF sync is triggered on mobile for an asset without ISIN
- THEN do not show JustETF actions; manual entry only
- WHEN JustETF fetch/parse yields no usable weights or throws
- THEN soft-fail: error to the user; do not write geographic rows
- WHEN ordinary sync runs and current allocation source is manual
- THEN do not overwrite; only explicit restore replaces with source=justetf
- ELSE workbook sheet Exposition geo column Pays stores either an ISO alpha-2,
  OTHER, or a GeographicRegion key; weight/source rules remain ADR 0008;
  mobile account detail and mobile geo lists stay without interactive map
- FORBIDDEN full geo panels on the accounts list; redefining coverage/sum/manual
  lock outside @patrimo/core; duplicating JustETF parse per platform; inventing
  default weights; mixing country and region keys on one asset; free-text geo
  keys outside the guided pickers; interactive map on mobile; bulk JustETF sync
- OPEN (do not implement): interactive map on mobile; PDF factsheet import;
  coverage % KPI; custom user-defined regions beyond the five product regions
```

## Context

ADR 0008 shipped per-account geography on the accounts **list** (overcrowded) and left JustETF sync web-only. Users also often have only **region** factsheet splits (e.g. North America / Europe), while JustETF provides **countries**. Free-typed ISO codes invite typos.

## Decision

- Dedicated **account detail** on web and mobile; accounts list opens it (mobile: list → detail → edit metadata).
- **Two exposure views** everywhere geo is shown: countries and regions.
- Manual entry chooses **countries or regions** per asset (homogeneous rows); guided pickers only (no free-typed keys).
- JustETF sync on **mobile** as on web; HTML **parse + sync orchestration** in `@patrimo/core`.

## Invariants

- ADR 0008 workbook authority, sum validation, manual lock, and deletion cascade remain.
- The five product regions are the only region keys (`NORTH_AMERICA`, `EUROPE`, `ASIA_PACIFIC`, `EMERGING`, `OTHER`).
- Platforms must not fork parse, region mapping, or aggregation rules.
- Country map remains web-only; region view is list-based on both platforms.

## Options considered

| Option | Status | Why |
|---|---|---|
| A — Account detail + dual country/region views + guided entry + core JustETF parse + mobile sync | Retained | Keeps JustETF detail; allows coarse factsheets; prevents typos; list stays readable |
| B — Region-only storage and UI | Rejected | Discards country look-through and the country map |
| C — Free-typed ISO / region strings | Rejected | User-requested guide; typos break aggregation |
| D — Duplicate JustETF parser under `mobile/` | Rejected | Two breakages when markup changes |
| E — Compact geo teaser on accounts list only | Rejected | Still clutters; no clear account home |

## Consequences

**Positives**

- Readable accounts list; clear account geo home.
- Region-only factsheets can be entered without inventing fake countries.
- Dual views: map stays useful; region view covers all geo-backed assets.
- Guided pickers reduce invalid keys.
- Mobile JustETF parity for ISIN assets.

**Negatives**

- Extra mobile navigation hop before account edit.
- Country and region covered totals can differ (region-only assets absent from country view).
- JustETF scraping remains unofficial.
- Longer manual entry UI (mode + pickers).

**To monitor**

- JustETF markup changes.
- User confusion when country coverage &lt; region coverage.
- ISO list UX on mobile (search performance).

## Uncovered cases

- Interactive map on mobile.
- Bulk “sync all ETF ISIN assets”.
- PDF issuer factsheet import.
- User-defined region taxonomies.

## Follow-up

Optional: mobile choropleth; coverage % KPI; issuer PDF geo import.

## See also

- [ADR 0008](0008-geographic-allocation.md)
- [Geographic allocation](../architecture/geographic-allocation.md)
- [Platforms](../overview/platforms.md)
- [Implement geographic allocation](../howto/implement-geographic-allocation.md)
