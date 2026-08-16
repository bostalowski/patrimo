# ADR 0008: Geographic allocation in the workbook

- Status: proposed
- Date: 2026-08-16
- implementation_ready: yes

```text
Contract (do not invent):
- WHEN an asset has a geographic allocation
- THEN it is a set of rows (assetId, country, weight) with source justetf|manual,
  weights in [0, 1], and sum(weights) within 1e-3 of 1.0
- WHEN JustETF sync succeeds for an ETF with ISIN and the asset has no manual allocation
- THEN replace that asset's rows with JustETF country weights (source=justetf)
- WHEN the asset already has source=manual
- THEN JustETF sync must not overwrite; only an explicit "restore from JustETF" may replace
- WHEN the user saves a manual allocation
- THEN replace all rows for that asset with source=manual (after validation)
- WHEN building portfolio / account / global geo slices
- THEN weight each country by position.marketValue * country.weight;
  include only positions with marketValue > 0 and a valid allocation;
  slice percentages are over that covered market-value total (sum to ~100%)
- WHEN an asset has no allocation (crypto, cash, missing ETF data, …)
- THEN exclude it from geo donuts; asset detail must show that allocation is absent
- WHEN displaying regions
- THEN map each stored country code to a fixed product region
  (NORTH_AMERICA | EUROPE | ASIA_PACIFIC | EMERGING | OTHER); unknown → OTHER
- WHEN an asset is deleted
- THEN remove all of its geographic allocation rows (same cascade idea as Prix manuels)
- ELSE workbook sheet "Exposition geo" is optional; missing sheet = empty collection;
  Excel column "Poids %" is percent 0–100 (same pattern as DCA "Cible %");
  country is ISO 3166-1 alpha-2 or OTHER
- FORBIDDEN treating fund domicile as geography; Yahoo as geo source; sector allocation;
  temporal history of allocations; /comptes/[id] detail page; inventing default weights;
  overwriting manual rows on ordinary JustETF sync; putting geo math only in UI
- OPEN (do not implement): none blocking
```

## Context

Users cannot see look-through geographic exposure of their wealth. Price sources (including Yahoo chart) return prices only. JustETF profile pages expose country weights for many ETFs by ISIN. Root cause is missing workbook-backed allocation data, not missing charts.

Canonical terms: [glossary](../reference/glossary.md) (**Geographic allocation**, **Geographic region**, **Allocation source**).

## Decision

- Persist look-through country weights in optional workbook sheet `Exposition geo`.
- Shared pure mutations and aggregation live in `@patrimo/core`.
- Fill via JustETF when possible; allow manual entry/edit; lock manual against silent overwrite.
- Surface global, per-asset, and per-account views on web and mobile (account geo on existing accounts pages).

## Invariants

- Workbook remains source of truth for allocations (not a derived local-only cache).
- Aggregation and validation rules live only in `@patrimo/core`.
- Platforms own JustETF I/O and UI; they must not redefine coverage or sum rules.
- Donuts never invent exposure for assets without rows.

## Options considered

| Option | Status | Why |
|---|---|---|
| A — Workbook sheet + core aggregation + JustETF/manual + web/mobile UI | Retained | Matches Excel-as-truth and Phase 0 choices |
| B — Local cache only (no Excel) | Rejected | Breaks multi-device / Drive sync truth |
| C — Single country tag per asset | Rejected | Wrong for world ETFs (look-through required) |
| D — Yahoo domicile / profile country | Rejected | Confuses fund domicile with exposure |

## Consequences

**Positives**

- Correct look-through semantics for ETFs; editable for everything else.
- Same sheet contract on web and mobile.

**Negatives**

- JustETF scraping is unofficial and can break.
- Covered-only donuts can look “fully diversified” while a large crypto/cash sleeve is invisible on the chart.

**To monitor**

- JustETF markup / AJAX changes.
- Country→region map completeness for exotic holdings.

## Uncovered cases

- Sector allocation.
- Historical allocation time series.
- Dedicated account detail route.

## Follow-up

Optional: richer country→region map; “coverage % of portfolio” KPI (not in v1 checklist).

## See also

- [Geographic allocation](../architecture/geographic-allocation.md)
- [Implement geographic allocation](../howto/implement-geographic-allocation.md)
- [Excel workbook schema](../reference/excel-workbook.md)
- [ADR 0002](0002-store-manual-prices-in-workbook.md) — same persistence pattern family
