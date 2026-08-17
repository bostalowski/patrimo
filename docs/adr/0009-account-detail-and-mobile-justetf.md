# ADR 0009: Account detail and region allocations

- Status: accepted
- Date: 2026-08-16
- implementation_ready: yes
- Amends: [ADR 0008](0008-geographic-allocation.md) (account geo placement; region-level manual allocations; dual country/region views)
- Amended by: [ADR 0011](0011-restore-justetf-geographic-sync.md) (JustETF sync restored)

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
  web, list on mobile; (2) regions — list (or equivalent non-map) using the six
  product regions NORTH_AMERICA, LATIN_AMERICA, EUROPE, ASIA_PACIFIC,
  AFRICA_MIDDLE_EAST, OTHER
- WHEN aggregating the country breakdown
- THEN include only assets whose allocation rows are country-level (ISO 3166-1
  alpha-2 or residual OTHER); exclude assets whose rows are region keys
- WHEN aggregating the region breakdown
- THEN include country-level assets by rolling countries via regionForCountry,
  and include region-level assets by using their region keys as-is
- WHEN the user saves a geographic allocation for an asset
- THEN write source=manual only; all rows for that asset are either country-level
  or region-level (homogeneous); mixing country codes and region keys on one
  asset is rejected
- WHEN entering geography
- THEN the UI offers a mode switch (countries | regions) and guided pickers:
  regions = closed list of the six product regions with French labels;
  countries = searchable/selectable list of ISO alpha-2 with French labels
  (plus OTHER); free-typed codes outside the picker are not accepted
- WHEN reading workbook rows with source=justetf
- THEN treat them as valid allocations for aggregation/display
- WHEN JustETF sync/restore is requested
- THEN follow [ADR 0011](0011-restore-justetf-geographic-sync.md)
- ELSE workbook sheet Exposition geo column Pays stores either an ISO alpha-2,
  OTHER, or a GeographicRegion key; weight sum / absolute look-through: ADR 0010
  (amends ADR 0008); mobile account detail and mobile geo lists stay without
  interactive map
- FORBIDDEN full geo panels on the accounts list; redefining coverage/sum rules
  outside @patrimo/core; inventing default weights; mixing country and region
  keys on one asset; free-text geo keys outside the guided pickers; interactive
  map on mobile
- OPEN (do not implement): interactive map on mobile; PDF factsheet import;
  coverage % KPI; custom user-defined regions beyond the six product regions
```

## Context

ADR 0008 shipped per-account geography on the accounts **list** (overcrowded) and filled weights via JustETF scrape. Users often have only **region** factsheet splits (e.g. North America / Europe). Free-typed ISO codes invite typos. Account detail and guided region/country entry address those UX issues. JustETF sync availability is governed by [ADR 0011](0011-restore-justetf-geographic-sync.md).

## Decision

- Dedicated **account detail** on web and mobile; accounts list opens it (mobile: list → detail → edit metadata).
- **Two exposure views** everywhere geo is shown: countries and regions.
- Manual entry chooses **countries or regions** per asset (homogeneous rows); guided pickers only (no free-typed keys).
- JustETF sync/restore: see ADR 0011 (amends the earlier manual-only write path in this ADR).

## Invariants

- ADR 0008 workbook authority and deletion cascade remain; sum validation and absolute look-through follow ADR 0010.
- The six product regions are the only region keys (`NORTH_AMERICA`, `LATIN_AMERICA`,
  `EUROPE`, `ASIA_PACIFIC`, `AFRICA_MIDDLE_EAST`, `OTHER`). Legacy `EMERGING` maps to `OTHER`.
- Platforms must not fork region mapping or aggregation rules.
- Country map remains web-only; region view is list-based on both platforms.
- Manual geographic writes use `source=manual`; JustETF writes use `source=justetf` (ADR 0011).

## Options considered

| Option | Status | Why |
|---|---|---|
| A — Account detail + dual country/region views + guided entry | Retained | List stays readable; coarse factsheets work; typos reduced |
| B — Region-only storage and UI | Rejected | Discards country look-through and the country map |
| C — Free-typed ISO / region strings | Rejected | User-requested guide; typos break aggregation |
| D — JustETF sync (including mobile) | Amended by ADR 0011 | Initially dropped as unreliable; restored on demand with manual lock |
| E — Compact geo teaser on accounts list only | Rejected | Still clutters; no clear account home |

## Consequences

**Positives**

- Readable accounts list; clear account geo home.
- Region-only factsheets can be entered without inventing fake countries.
- Dual views: map stays useful; region view covers all geo-backed assets.
- Guided pickers reduce invalid keys.

**Negatives**

- Extra mobile navigation hop before account edit.
- Country and region covered totals can differ (region-only assets absent from country view).
- Longer manual entry UI (mode + pickers).

**To monitor**

- User confusion when country coverage &lt; region coverage.
- ISO list UX on mobile (search performance).

## Uncovered cases

- Interactive map on mobile.
- PDF issuer factsheet import.
- User-defined region taxonomies.

## Follow-up

Optional: mobile choropleth; coverage % KPI; issuer PDF geo import.

## See also

- [ADR 0008](0008-geographic-allocation.md)
- [ADR 0011](0011-restore-justetf-geographic-sync.md)
- [Geographic allocation](../architecture/geographic-allocation.md)
- [Platforms](../overview/platforms.md)
- [Implement geographic allocation](../howto/implement-geographic-allocation.md)
