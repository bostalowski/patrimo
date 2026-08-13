# Asset invested display

How asset list and detail surfaces expose remaining position cost basis as **Investi**.

## Intent

Users see how much capital remains engaged in each asset position without inferring it from quantity × PRU.

## Flow

```text
Workbook + prices
       |
       v
 buildPortfolio (@patrimo/core)
       |
       +--> AssetPosition.costBasis
       |
       +------------------+------------------+
       v                  v                  v
  Web /actifs list   Web /actifs/[id]   Mobile actifs list
  column Investi     KPI card Investi   summary Investi
```

## Surfaces

| Surface | Placement | Source field | Empty position |
|---|---|---|---|
| Web asset list | Column after PRU, before current price (`actifs-table.tsx`) | `costBasis` | `0 €` |
| Web asset detail | KPI card after PRU (`asset-position-kpis.tsx`) | `costBasis` | `0 €` |
| Mobile asset list | Summary line next to quantity / PRU (`mobile/app/actifs.tsx`) | `costBasis` | `0 €` |

## Invariants

Governed by [ADR 0003](../adr/0003-display-invested-on-asset-surfaces.md). Portfolio math stays in `@patrimo/core`; platforms only format and render.

## Out of scope

- New portfolio metrics
- Dashboard / accounts invested widgets (already present)
- Account-embedded asset sub-tables

## See also

- [Glossary — Invested](../reference/glossary.md)
- [Implement asset invested display](../howto/implement-asset-invested-display.md)
- [Platforms](../overview/platforms.md)
