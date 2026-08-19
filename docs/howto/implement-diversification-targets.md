# How to implement diversification target bands

Ordered vertical scopes after SPEC LOCK. Decision: [ADR 0012](../adr/0012-allocation-coherence.md).

## Checklist (Phase 0 reference)

### Cas nominaux

- [x] 1. Country band uses look-through country rows (all asset types) vs full liquid MV
- [x] 2. CRYPTO asset with Exposition geo rows contributes to geo bands via look-through
- [x] 3. Same euro counts toward geo band and CRYPTO band independently (e.g. 80 % US + 50 % crypto on 1000 € portfolio is valid)
- [x] 4. `CRYPTO` band uses `AssetType.CRYPTO` at full market value regardless of geo rows
- [x] 5. Portfolio breakdown: geo slices + unmapped geo = 100 %; crypto slice is separate on same denominator
- [x] 6. Mixed country + region keys without overlap are evaluated independently
- [x] 7. All defined bands in range → status `aligned`
- [x] 8. Account and asset geo charts include crypto look-through when Exposition geo rows exist

### Cas qui dérapent

- [x] 9. At least one stock band outside range → `band_drift` + `misaligned`
- [x] 10. Annualized DCA outside a band → `flow_misalign`
- [x] 11. Assets without geo contribute 0 to geo numerators and stay in the denominator
- [x] 12. Partial geo weights: only the entered fraction contributes
- [x] 13. CRYPTO asset without Exposition geo: 100 % in CRYPTO band, 0 % in geo bands, counted in unmapped geo on breakdown
- [x] 14. Overlapping keys (e.g. `US` + `NORTH_AMERICA`) rejected on save
- [x] 15. Invalid band (min > max, out of `[0, 1]`, unknown key) rejected on save
- [x] 16. liquidInvested = 0 → assessment null (card hidden)
- [x] 17. No bands → assessment null (card hidden)

### Frontières (hors périmètre)

- [x] 18. Legacy `Allocation cible` ignored on read, deleted on next write (unchanged)
- [ ] 19. Sectors, sleeve plan / DCA bootstrap, ETF recommendations, LLM (out of scope)
- [x] 20. No additional UI copy explaining axis independence (product choice)

## Scopes

### Scope 1 — Core overlapping axes ✅

- Remove CRYPTO exclusion from geo band numerators in `contributionToKey`
- Fix `aggregatePortfolioDiversificationBreakdown` unmapped: `liquidInvested − geoMapped` only (do not subtract crypto MV)
- Tests for checklist items 1–5, 11–13, 16–17

### Scope 2 — Coherence alignment tests ✅

- Flip/update tests that assumed mutual exclusivity (items 2–4, 6–10)
- Ensure breakdown `stockPct` still matches coherence for geo bands

### Scope 3 — Doc confirmation ✅

- ADR 0012 contract block, architecture page, glossary aligned with code

## See also

- [ADR 0012](../adr/0012-allocation-coherence.md)
- [Architecture](../architecture/diversification-targets.md)
