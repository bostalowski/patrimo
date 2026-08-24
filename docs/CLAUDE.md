# Docs contributor guardrails

Read [DOC_MODEL.md](DOC_MODEL.md) before adding or editing documentation.

## Always load first

1. [CONSTRAINTS.md](../CONSTRAINTS.md)
2. [Glossary](reference/glossary.md)
3. Branch handoff: `make branch-status` (or root [PROGRESS.md](../PROGRESS.md) on `main`)

Then the colocated `ARCHITECTURE.md` for the package you change.

## Placement checklist

- Mechanics → colocated `ARCHITECTURE.md` (or topic note beside the module).
- Decisions → [adr/](adr/) (append-only once accepted).
- Names → [reference/glossary.md](reference/glossary.md) first.
- Procedures → [howto/](howto/).
- Prefer linking over restating.
- Keep sheet names, enums, and reserved identifiers identical to `@patrimo/core`.
- Tax pages must describe estimates as simplified / indicative unless an accepted ADR says otherwise.
- Platform pages describe current web and mobile capabilities factually. Feature parity is a product direction, not an implemented guarantee.
- If you change code, update the neighboring ARCHITECTURE map when it would otherwise lie.

## Existing decision records

- [ADR 0001](adr/0001-share-deletion-rules-across-platforms.md) — shared deletion rules across platforms.
- [ADR 0004](adr/0004-show-non-monthly-streams-on-mobile-projection.md) — non-monthly DCA badges on mobile Projection.
- [ADR 0005](adr/0005-emergency-fund-health-indicator.md) — emergency fund health indicator on Dashboards.
- [ADR 0006](adr/0006-portfolio-risk-readability.md) — readable risk badges on Dashboards.
- [ADR 0008](adr/0008-geographic-allocation.md) — geographic allocation in the workbook.
- [ADR 0009](adr/0009-account-detail-and-mobile-justetf.md) — account detail and region allocations.
- [ADR 0011](adr/0011-restore-justetf-geographic-sync.md) — JustETF geographic sync restored.
- [ADR 0010](adr/0010-partial-geographic-allocation-weights.md) — partial geographic weights (sum ≤ 1, absolute look-through).
- [ADR 0012](adr/0012-allocation-coherence.md) — diversification target bands and coherence.
- [ADR 0014](adr/0014-financial-goals.md) — financial goals in the workbook.
- [ADR 0015](adr/0015-next-euro-plan.md) — next-euro action plan (variante 2).
- [ADR 0016](adr/0016-envelope-overflow-plafond.md) — envelope contribution overflow at plafond.
- [ADR 0017](adr/0017-savings-capacity-bridge.md) — savings capacity bridge.
- [ADR 0018](adr/0018-configurable-emergency-fund-target.md) — configurable emergency-fund target.
- [ADR 0019](adr/0019-livret-dca-savings-capacity.md) — LIVRET DCA in savings capacity.
