# How to implement the allocation plan (editor + coherence)

Ordered vertical scopes after SPEC LOCK. Decision: [ADR 0012](../adr/0012-allocation-coherence.md).

## Checklist (Phase 0 reference)

1. Without valid target, propose plan from DCA when annual DCA > 0
2. Create / edit / delete categories (label, %, multi assets)
3. Save → workbook `Allocation cible`
4. Card: stock vs plan (+ flow finding); clear status
5. Multi-asset sleeve does not emit overlapping alert
6. Sum ≠ 100% → reject save
7. Asset already in another category → reject or explicit move (reject on save)
8. No DCA and no target → empty suggestion; card hidden
9–11. Out of scope: sector, LLM/shocks, Top1/HHI

## Scopes

### Scope 1 — Core plan math

- `suggestTargetPlanFromDca`, `validateTargetAllocations`
- Remove `overlapping_sleeve` from `assessAllocationCoherence` (+ status watch = geo only)
- Tests: bootstrap merge/claim, empty DCA, validation errors, no overlapping finding

### Scope 2 — Web persist API

- `PUT` (or `POST`) route replacing `targetAllocations` via `replaceWorkbook`
- Excel header alias for Actifs column if not already
- Tests: happy path + invalid payload rejects

### Scope 3 — Web editor (Investissements)

- Tab/section Allocation: list, edit, save, « Proposer depuis DCA »
- Tests: UI save / bootstrap display

### Scope 4 — Dashboard card wiring

- « Modifier » link; no overlapping chip; keep drift/flow/geo chips
- Tests

### Scope 5 — Mobile parity

- Editor + card + serialize already present for sheet
- Tests

### Scope 6 — Doc confirm

- ADR accepted; remove provisional banner; glossary « Allocation plan » alias

## See also

- [ADR 0012](../adr/0012-allocation-coherence.md)
- [Architecture](../architecture/allocation-coherence.md)
