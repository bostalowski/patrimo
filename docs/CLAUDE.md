# Docs contributor guardrails

Read [DOC_STRUCTURE_MODEL.md](../DOC_STRUCTURE_MODEL.md) before adding or editing documentation.

## Always load first

1. [Key principles](overview/key-principles.md)
2. [Foundations](architecture/foundations.md)
3. [Glossary](reference/glossary.md)

## Placement checklist

- Choose one Diátaxis family per page.
- Prefer linking over restating.
- Keep sheet names, enums, and reserved identifiers identical to `@patrimo/core`.
- Tax pages must describe estimates as simplified / indicative unless an accepted ADR says otherwise.
- Platform pages describe current web and mobile capabilities factually. Feature parity is a product direction, not an implemented guarantee.

## Existing decision records

- [ADR 0001](adr/0001-share-deletion-rules-across-platforms.md) — shared deletion rules across platforms.
- [ADR 0004](adr/0004-show-non-monthly-streams-on-mobile-projection.md) — non-monthly DCA badges on mobile Projection.
- [ADR 0005](adr/0005-emergency-fund-health-indicator.md) — emergency fund health indicator on Dashboards.
- [ADR 0006](adr/0006-portfolio-risk-readability.md) — readable risk badges on Dashboards.
- [ADR 0008](adr/0008-geographic-allocation.md) — geographic allocation in the workbook.
- [ADR 0009](adr/0009-account-detail-and-mobile-justetf.md) — account detail and region allocations.
- [ADR 0011](adr/0011-restore-justetf-geographic-sync.md) — JustETF geographic sync restored.
- [ADR 0010](adr/0010-partial-geographic-allocation-weights.md) — partial geographic weights (sum ≤ 1, absolute look-through).
