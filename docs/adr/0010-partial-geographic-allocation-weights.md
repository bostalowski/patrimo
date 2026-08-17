# ADR 0010: Partial geographic allocation weights

- Status: accepted
- Date: 2026-08-17
- implementation_ready: yes
- Amends: [ADR 0008](0008-geographic-allocation.md) (weight sum validation; look-through renormalization after dropping `OTHER`)

```text
Contract (do not invent):
- WHEN the user saves a geographic allocation (countries or regions)
- THEN accept rows whose weights are finite, non-negative, non-empty set,
  homogeneous granularity, and 0 < sum(weights) ≤ 1 within
  GEOGRAPHIC_WEIGHT_SUM_TOLERANCE (1e-3); always write source=manual
- WHEN sum(weights) > 1 + GEOGRAPHIC_WEIGHT_SUM_TOLERANCE
- THEN reject the save (do not persist)
- WHEN normalizing workbook geographic rows for an asset
- THEN keep rows that pass the same sum rule (0 < sum ≤ 1 ± tolerance);
  do not drop an asset solely because sum < 1
- WHEN aggregating country or region exposure for a position with a valid
  (possibly partial) allocation
- THEN contribute marketValue * weight for each kept row (absolute weights);
  add those euro contributions to coveredMarketValue for that breakdown;
  do not renormalize kept weights to sum to 1
- WHEN aggregating the country breakdown
- THEN still drop residual country key OTHER before contributing (OTHER is
  never painted); do not redistribute OTHER's weight onto other countries
- WHEN the editor draft sum is not ~100%
- THEN show a non-blocking indicator with the current sum (e.g. "80%
  renseignés"); saving remains allowed when the core sum rule passes
- ELSE negative weights, blank keys, empty weight lists, and mixed
  country/region keys on one asset remain rejected (ADR 0008 / 0009)
- FORBIDDEN requiring sum ≈ 1 to save; inventing default residual rows to
  reach 100%; renormalizing partial (or OTHER-stripped) weights to full
  market value; changing DCA target-sum = 100% rules
- OPEN (do not implement): portfolio coverage % KPI; auto-fill OTHER;
  PDF factsheet import; DCA sum rule changes
```

## Context

ADR 0008 required geographic weights to sum to ~1 so charts stayed “complete.” Users often know only part of a factsheet (e.g. US 70% + JP 10%) and cannot honestly invent the residual. The pain is the **sum-must-be-100% invariant**, not a UI message bug. Root fix: allow partial allocations in `@patrimo/core` and treat the missing fraction as **unreported exposure** (same idea as excluding `OTHER` from the country map, without stretching the known slice to 100% of market value).

Canonical terms: [glossary](../reference/glossary.md) (**Geographic allocation**, **Geographic region**).

## Decision

- Persist and normalize allocations with `0 < sum(weights) ≤ 1` (± tolerance).
- Reject only when the sum exceeds 1 (+ tolerance).
- Aggregate with **absolute** weights (`contribution = marketValue * weight`); covered market value is the sum of those contributions.
- Drop country `OTHER` from the country breakdown without redistributing its weight.
- Show a non-blocking sum indicator in web and mobile editors.

## Invariants

- Workbook remains source of truth; rules live only in `@patrimo/core`.
- Charts never invent countries/regions for the missing fraction or for `OTHER`.
- Homogeneous country vs region rows and guided pickers (ADR 0009) unchanged.
- DCA basket target sum = 100% is out of scope.

## Options considered

| Option | Status | Why |
|---|---|---|
| A — Allow sum &lt; 1; absolute weights; non-blocking UI sum | Retained | Matches progressive factsheet entry; no invented geography |
| B — Keep sum = 1; auto-complete residual as `OTHER` | Rejected | Invents exposure the user did not assert |
| C — Allow save of drafts but exclude from charts until sum = 1 | Rejected | Still hides known exposure the user already entered |
| D — Dual path: renormalize when sum ≈ 1 (incl. after dropping `OTHER`), absolute only when sum &lt; 1 | Rejected | Extra complexity; inconsistent coverage semantics |
| E — Always renormalize known weights to 100% of market value | Rejected | Makes partial allocations look fully covered |

## Consequences

**Positives**

- Users can save incomplete geography and iterate.
- Known weights appear on charts immediately.
- `OTHER` and unentered remainder both stay off the country map without inflating other countries.

**Negatives**

- Assets that previously used `OTHER` only to pad to 100% will show a **lower** country covered market value (known countries no longer absorb the full position).
- Slice % remain over **covered** totals only; large unreported sleeves stay invisible on geo charts (same family of caveat as ADR 0008).

**To monitor**

- Users confusing “slice % of covered” with “% of full portfolio.”
- Floating-point sums near 1.0 (tolerance unchanged).

## Uncovered cases

- Explicit “coverage % of portfolio” KPI.
- Auto-suggest residual `OTHER`.
- Changing DCA Σ cibles = 100%.

## Follow-up

None required for this increment beyond implementing the contract.

## See also

- [ADR 0008](0008-geographic-allocation.md)
- [ADR 0009](0009-account-detail-and-mobile-justetf.md)
- [Geographic allocation](../architecture/geographic-allocation.md)
- [Implement geographic allocation](../howto/implement-geographic-allocation.md)
