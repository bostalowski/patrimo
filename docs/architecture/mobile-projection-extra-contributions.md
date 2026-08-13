# Mobile projection extra contributions

How mobile Projection surfaces non-monthly investment-plan streams next to the monthly contribution field.

## Intent

Users see that annual or quarterly DCA plans (for example a PEE yearly top-up) still apply to the projection even when the monthly field stays at `0`.

## Flow

```text
Workbook DCA configs
       |
       v
 Split by frequency on mobile Projection
       |
       +--> MENSUEL  --> monthly field default
       +--> other    --> extraStreams
       |
       +--> projectInvestment(monthly + extraStreams)
       +--> EnvelopeCard badges for extraStreams
```

## Surfaces

| Surface | Placement | Source | Notes |
|---|---|---|---|
| Mobile Projection envelope card (`mobile/app/projection.tsx`) | Under « Versement (€ / mois) » | `extraStreams` derived from workbook DCA | One badge per stream; none if empty |
| Web Projection | Already present | `extraContributions` | Reference format only — not changed |

## Format

Mirror web (`formatStream` local to the mobile screen):

- `MENSUEL` → `/mois` (not shown as extra badge)
- `TRIMESTRIEL` → `/trim.`
- `ANNUEL` → `/an`
- With `paymentMonth` → append ` · {short French month}`

Prefix each badge with `+ ` and `formatEuro(amount)`.

## Invariants

Governed by [ADR 0004](../adr/0004-show-non-monthly-streams-on-mobile-projection.md). Projection math stays in `@patrimo/core`; mobile only formats and renders.

## Out of scope

- Editing streams from Projection
- Annual → monthly conversion in the input
- Shared formatter extraction to core

## See also

- [ADR 0004](../adr/0004-show-non-monthly-streams-on-mobile-projection.md)
- [Implement mobile projection extra contributions](../howto/implement-mobile-projection-extra-contributions.md)
- [Platforms](../overview/platforms.md)
