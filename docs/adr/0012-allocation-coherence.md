# ADR 0012: Diversification target bands and coherence

- Status: accepted
- Date: 2026-08-18
- implementation_ready: yes

```text
Contract (do not invent):

Diversification target = { key, minPct, maxPct } persisted in workbook sheet
  "Cibles diversification". Partial plans allowed (Σ min/max need not be 1).
  Empty collection is valid (clears the plan).

Keys (after trim + upper case; legacy EMERGING → OTHER):
  - ISO 3166-1 alpha-2 country (US, FR, …)
  - product region (NORTH_AMERICA, LATIN_AMERICA, EUROPE, ASIA_PACIFIC,
    AFRICA_MIDDLE_EAST, OTHER)
  - CRYPTO
FORBIDDEN as keys: free labels, asset ids, sector names.

Overlap (save rejects; parse first-wins then drops later overlapping rows):
  - same normalized key
  - country C and region R when regionForCountry(C) === R
  - CRYPTO overlaps only CRYPTO
  - two distinct countries never overlap; two distinct regions never overlap

Bands: 0 ≤ minPct ≤ maxPct ≤ 1; min === max allowed.
Save/API rejects invalid_key, invalid_band, duplicate_key, overlapping_keys.
Impossible plans (e.g. Σ minPct > 1) are savable.

Independent axes (geo and CRYPTO overlap by design):
  Geographic and CRYPTO bands answer different questions on the same capital.
  The same euro may count toward a geo band AND toward the CRYPTO band.
  Summing geo % and crypto % is meaningless; each axis uses full liquid MV
  (stock) or full annual DCA (flow) as its own denominator.

Look-through for geo numerators (all asset types, including CRYPTO):
  reuse Exposition geo rules (ADR 0008/0010): valid per-asset sum 0 < sum ≤ 1;
  country OTHER rows dropped without redistribution; region-level rows stay
  region-level.
  Country band K: only country-level rows with country === K.
    Region-only assets contribute 0 to country bands.
  Region band R: country-level rows with regionForCountry(country) === R
    (excluding dropped OTHER country rows)
    PLUS region-level rows whose key === R.
  CRYPTO assets with Exposition geo rows contribute to geo bands via look-through
    like any other asset type.

CRYPTO numerator: full market value (or full annualized DCA) of assets with
  type === CRYPTO, independent of Exposition geo rows.

Portfolio breakdown (Diversification page):
  geo slices (countries + regions) + unmapped geo = 100 % of liquid MV.
  crypto slice is a separate axis on the same liquid MV denominator.
  unmapped geo = liquidInvested − sum(absolute geo contributions); crypto MV
    is NOT subtracted from unmapped.

Denominator (stock): sum of positions with marketValue > 0 (all types).
  Missing geo contributes 0 to geo numerators and still sits in the denominator.
Denominator (flow): sum of annualized DCA by asset (computeFlowMixByAsset).
  WHEN annualDcaTotal === 0 THEN do not emit flow findings.

In-band: value ∈ [minPct − 1e-3, maxPct + 1e-3].

assessDiversificationCoherence:
  WHEN targets empty OR liquidInvested === 0 THEN return null (hide card).
  WHEN targets non-empty and liquidInvested > 0 THEN per-target stockPct
    and, if annualDcaTotal > 0, flowPct.
  Findings ONLY:
    band_drift    : stockPct outside band
    flow_misalign : annualDcaTotal > 0 AND flowPct outside band
  Status: misaligned if any finding; else aligned.
  No watch status. No geo_coverage_gap / unmapped_stock / category_drift.

Persistence:
  WHEN user saves THEN validate then replace the whole sheet
    "Cibles diversification" (columns Dimension, Min %, Max % — Excel
    percent 0–100 or fraction, same heuristic as other % columns).
  WHEN reading workbooks THEN ignore sheet "Allocation cible"
    (do not map it to diversificationTargets).
  WHEN writing workbooks THEN delete sheet "Allocation cible" if present.
  Missing "Cibles diversification" ⇒ empty collection.

Surfaces:
  Editor + coherence card on web /geographie (nav Diversification) and mobile
  Diversification screen. Investissements is DCA only.
  Web PUT /api/diversification-targets { targets }; mobile serialize.

REMOVED: TargetAllocationCategory / Allocation cible as product intent;
  suggestTargetPlanFromDca; PUT /api/target-allocation; Investissements
  allocation-plan editor / bootstrap.

FORBIDDEN: inventing country weight from a region-only row; using covered
  geo MV as band denominator for band coherence or portfolio breakdown;
  treating geo + crypto + unmapped as a single partition that must sum to 100 %;
  subtracting crypto MV from unmapped geo; HHI / Top1 / Top3;
  auto-persist without user save; sector bands;
  "aligned" when a defined band is outside range.

OPEN (do not implement this increment): sector look-through / sector bands;
  ETF purchase recommendations; LLM coach.
```

## Context

Users state intent as diversification bands (e.g. United States 60–70 %, Europe
15 %, crypto 5 %). The previous unshipped model on this branch stored
**vehicle sleeves** (category + `targetPct` + `assetIds`) in `Allocation cible`
and compared stock to those sleeves. That asked the wrong question: a World ETF
is a vehicle, not a geography.

Look-through geography already exists (`Exposition geo`). Root cause is missing
**target bands on diversification dimensions**, not missing charts.

This ADR is edited in place (never shipped to production). Canonical terms:
[glossary](../reference/glossary.md) (**Diversification target**,
**Allocation coherence**).

## Decision

- Persist bands in optional sheet `Cibles diversification`.
- Validate keys, bands, and overlap in `@patrimo/core`.
- Assess stock and annualized DCA flows against bands using look-through
  (country vs region granularity as in ADR 0008/0010) for geo keys and
  `AssetType.CRYPTO` for the CRYPTO key. Geo and CRYPTO axes overlap by design.
- Place the editor on the geography surface; remove the sleeve-based plan.
- On the next workbook write, drop legacy sheet `Allocation cible`.

## Invariants

- Thresholds, overlap, and look-through band math live only in `@patrimo/core`.
- Platforms adapt I/O and UI only.
- Geographic **charts** keep covered-MV denominators (ADR 0010). Band **coherence**
  uses full liquid MV / full annual DCA.
- Workbook remains source of truth.

## Options considered

| Option | Status | Why |
|---|---|---|
| A — Diversification bands (geo keys + CRYPTO) replacing sleeve plan | Retained | Matches stated intent; reuses look-through |
| B — Keep sleeve plan and add a read-only geo overlay | Rejected | Leaves intent on vehicles |
| C — Region-only keys (no country, no CRYPTO) | Rejected | Cannot express “US 60–70 %” or crypto |
| D — Reuse sheet name `Allocation cible` with new columns | Rejected | Mixes two contracts in one Excel tab |

## Consequences

**Positives**

- Intent matches “where I want to be exposed”.
- Crypto is a first-class bucket without pretending it is a country.
- Geographic look-through applies to crypto too (e.g. US/EU split on BTC).
- Incomplete geography is visible: uncovered MV dilutes every geo band.

**Negatives**

- Region-only ETFs do not fill a country band (no invented look-through).
- Cash / unmapped assets dilute geo bands by design.
- Existing `Allocation cible` rows are discarded on the next write (no conversion).

**To monitor**

- Users who only have region-level weights and a country band (US reads low).
- Impossible saved plans (Σ minPct > 1) always misaligned.

## Uncovered cases

- Sector look-through and sector target bands.
- Coaching which vehicles to buy to enter a band.
- Shock scenarios / LLM narrative.

## Follow-up

- Sector allocation sheet (analogous to `Exposition geo`) and a Diversification
  menu that hosts geography + sectors + special buckets.

## See also

- [Diversification targets architecture](../architecture/diversification-targets.md)
- [Implement diversification targets](../howto/implement-diversification-targets.md)
- [ADR 0006](0006-portfolio-risk-readability.md)
- [ADR 0008](0008-geographic-allocation.md)
- [ADR 0010](0010-partial-geographic-allocation-weights.md)
