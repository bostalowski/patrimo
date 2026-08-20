# ADR 0013: Sector allocation and diversification bands

- Status: accepted
- Date: 2026-08-19
- implementation_ready: yes

```text
Contract:

Sector allocation = { assetId, sector, weight, source } in optional sheet
  "Exposition secteur". Partial sums allowed (0 < sum ≤ 1). source = manual | justetf.
  Sector keys: closed GICS/JustETF list (ENERGY … OTHER). No ambiguous abbreviations.

JustETF sync: parse sector table from ETF profile HTML; ordinary sync skips manual;
  restore overwrites manual; failure leaves existing rows unchanged.

Aggregation: marketValue * weight look-through; drop OTHER without redistribution;
  unmapped liquid MV on portfolio breakdown.

Diversification bands: sector keys valid in "Cibles diversification"; independent
  axes (geo + sector + CRYPTO overlap by design on same capital).

Route: /diversification (web + mobile), replacing /geographie.

FORBIDDEN: invent sector weights; redistribute OTHER; overlap geo/sector key namespaces.
```

## Context

ADR 0012 deferred sector look-through. Users need sector exposure with the same
contract as geographic allocation ([ADR 0008](0008-geographic-allocation.md),
[ADR 0010](0010-partial-geographic-allocation-weights.md)).

## Decision

- Optional sheet `Exposition secteur` in the workbook.
- Core modules: `sector-allocation`, `sector-exposure`, `justetf-sectors`.
- Full platform parity: web + mobile editors, account/portfolio views, band coherence.
- Rename diversification surface to `/diversification`.

## See also

- [Sector allocation architecture](../architecture/sector-allocation.md)
- [ADR 0012](0012-allocation-coherence.md)
- [ADR 0008](0008-geographic-allocation.md)
