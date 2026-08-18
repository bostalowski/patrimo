# How to implement diversification target bands

> 🚧 Anticipated mechanics (Phase 1.5 draft) — confirm after implementation. See [ADR 0012](../adr/0012-allocation-coherence.md).

Ordered vertical scopes after SPEC LOCK. Decision: [ADR 0012](../adr/0012-allocation-coherence.md).

## Checklist (Phase 0 reference)

1. Country band uses look-through country rows vs full liquid MV
2. Mixed country + region keys without overlap are evaluated independently
3. `CRYPTO` band uses `AssetType.CRYPTO` only; those assets skip geo numerators
4. All defined bands in range → status `aligned`
5. At least one stock band outside range → `band_drift` + `misaligned`
6. Annualized DCA outside a band → `flow_misalign`
7. Partial plans (unused remainder) do not emit a “missing target” finding
8. Assets without geo contribute 0 to geo numerators and stay in the denominator
9. Partial geo weights: only the entered fraction contributes
10. Overlapping keys (e.g. `US` + `NORTH_AMERICA`) rejected on save
11. Invalid band (min > max, out of `[0, 1]`, unknown key) rejected on save
12. liquidInvested = 0 → assessment null (card hidden)
13. No bands → assessment null (card hidden)
14. Legacy `Allocation cible` ignored on read, deleted on next write
15–18. Out of scope: sectors, sleeve plan / DCA bootstrap, ETF recommendations, LLM

## Scopes

### Scope 1 — Core band math

- Types `DiversificationTarget`; overlap; `validateDiversificationTargets`
- `assessDiversificationCoherence` (stock + flow, null cases, findings/status)
- Tests for checklist items 1–13 (pure `@patrimo/core`)

### Scope 2 — Workbook + API

- Sheet `Cibles diversification`; parse/serialize; delete `Allocation cible` on write
- `Workbook.diversificationTargets`; drop `targetAllocations`
- `PUT /api/diversification-targets`; remove `PUT /api/target-allocation`
- Tests: round-trip, ignore/wipe legacy sheet, invalid API payload

### Scope 3 — Web geography editor + dashboard card

- Editor on `/geographie`; card uses new assessment; « Modifier » → `/geographie`
- Remove Investissements « Allocation cible » tab and bootstrap
- Tests: save, overlap error, hidden card, finding chips

### Scope 4 — Mobile parity

- Geography editor + serialize save; dashboard card; remove Investissements allocation tab
- Tests: same behaviours as web editor/card

## See also

- [ADR 0012](../adr/0012-allocation-coherence.md)
- [Architecture](../architecture/diversification-targets.md)
