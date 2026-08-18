# Diversification targets and coherence

> 🚧 Anticipated mechanics (Phase 1.5 draft) — confirm after implementation. See [ADR 0012](../adr/0012-allocation-coherence.md).

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
assessDiversificationCoherence ──► Dashboard card
        │
        └── « Modifier » → /geographie (web) / geography (mobile)
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
| `assessDiversificationCoherence(...)` | Status + `band_drift` / `flow_misalign` |

Look-through rows follow [geographic allocation](geographic-allocation.md). Band
percentages use **full liquid MV** / **full annual DCA**, not covered-geo totals.

`CRYPTO` assets (`AssetType`) fill the `CRYPTO` band at 100 % of their value and
are excluded from geo numerators.

## Surfaces

| Surface | Role |
|---|---|
| Web `/geographie` | Band editor; save via `PUT /api/diversification-targets` |
| Mobile geography | Same editor; save via workbook serialize |
| Dashboard card (web + mobile) | Read-only; « Modifier » → geography |
| Investissements | DCA only (no allocation-plan tab) |

FR UI labels: editor « Cibles de diversification »; card « Cohérence diversification »;
`band_drift` « Stock hors bande »; `flow_misalign` « DCA hors bande ».

## Out of scope

- Sector look-through and sector bands.
- Vehicle / ETF purchase recommendations.
- Top1 / HHI ([ADR 0006](../adr/0006-portfolio-risk-readability.md)).
- Renaming the Géographie navigation item to Diversification.

## See also

- [ADR 0012](../adr/0012-allocation-coherence.md)
- [Implement diversification targets](../howto/implement-diversification-targets.md)
- [Geographic allocation](geographic-allocation.md)
- [Excel workbook — Cibles diversification](../reference/excel-workbook.md)
- [API — diversification-targets](../reference/api-routes.md)
