# Diversification targets and coherence

How Patrimo lets the user set **diversification target bands** (geography + crypto)
and checks alignment of liquid stock and annualized DCA flows against those bands.
Decision: [ADR 0012](../adr/0012-allocation-coherence.md).

## Intent

Express “I want 60–70 % United States, ~15 % Europe, ≤ 5 % crypto” as min–max
bands on look-through dimensions — not as ETF sleeve weights.

## Flow

```text
User edits bands on geography surface
        │
        ▼
validateDiversificationTargets ──► workbook Cibles diversification
        │
Positions + DCA + Exposition geo + asset types
        │
        ▼
assessDiversificationCoherence ──► Diversification page card
        │
        └── DCA link → Investissements when flow_misalign
```

On every workbook write, sheet `Allocation cible` is deleted if present. Reads
ignore that sheet.

## Workbook sheet

Optional sheet `Cibles diversification`:

| Column | Model | Rule |
|---|---|---|
| `Dimension` | `key` | ISO alpha-2, product region, or `CRYPTO` |
| `Min %` | `minPct` | Excel percent; model fraction in `[0, 1]` |
| `Max %` | `maxPct` | Excel percent; model fraction in `[0, 1]`; ≥ min |

Missing sheet ⇒ empty collection. Empty save is allowed (clears the plan).

## Core

| Function | Role |
|---|---|
| `diversificationKeysOverlap(a, b)` | Same key, or country vs its `regionForCountry` |
| `validateDiversificationTargets(targets)` | Save gate (empty OK) |
| `computeFlowMixByAsset(dca)` | Annualized DCA euros per asset |
| `assessDiversificationCoherence(...)` | Status (`aligned` / `watch` / `misaligned`) + findings with tone |
| `assessDiversificationBandTone` / `diversificationBandSignedDelta` | Per-value ok / watch (≤ 2 pp) / breach + signed Δ |

Look-through rows follow [geographic allocation](geographic-allocation.md) for
**all** asset types, including `CRYPTO`. Band percentages and the Diversification
page breakdown use **full liquid MV** / **full annual DCA**. Account and asset geo
charts still use covered market value
([ADR 0010](../adr/0010-partial-geographic-allocation-weights.md)).

**Independent axes:** geo bands and the `CRYPTO` band overlap by design. The same
euro can count toward US (look-through) and toward CRYPTO (`AssetType`). Summing
geo % and crypto % is not expected to equal 100 %.

`CRYPTO` assets fill the `CRYPTO` band at 100 % of their market value. When they
have `Exposition geo` rows, they also contribute to geo bands via look-through.

Portfolio breakdown on the Diversification page partitions full liquid MV into
**geo slices** (look-through, including crypto with `Exposition geo` rows),
**crypto** (full `AssetType.CRYPTO` market value), and **unmapped** (the
remainder: livret, cash, and non-crypto without geo — crypto never appears
here). Band coherence axes still overlap (geo bands vs `CRYPTO` band).

## Surfaces

| Surface | Role |
|---|---|
| Web `/geographie` (nav **Diversification**) | Band editor + coherence card; save via `PUT /api/diversification-targets`; portfolio breakdown (geo, crypto, unmapped) on **full liquid MV** |
| Mobile Diversification screen | Same editor + coherence card; save via workbook serialize; same portfolio breakdown on full liquid MV |
| Investissements | DCA only (no allocation-plan tab) |

FR UI labels: editor « Cibles de diversification »; card « Cohérence diversification »;
status Aligné / À surveiller / Décalé; findings « Stock|DCA à surveiller » (watch)
or « Stock|DCA hors bande » (breach). Percents at 1 decimal; signed Δ in pp when
out of band.

## Out of scope

- Sector look-through and sector bands.
- Vehicle / ETF purchase recommendations.
- Top1 / HHI ([ADR 0006](../adr/0006-portfolio-risk-readability.md)).

## See also

- [ADR 0012](../adr/0012-allocation-coherence.md)
- [Implement diversification targets](../howto/implement-diversification-targets.md)
- [Geographic allocation](geographic-allocation.md)
- [Excel workbook — Cibles diversification](../reference/excel-workbook.md)
- [API — diversification-targets](../reference/api-routes.md)
