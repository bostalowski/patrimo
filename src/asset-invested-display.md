# Asset invested display

How asset and account UIs expose remaining position cost basis as **Investi**.

## Intent

Users see how much capital remains engaged in each open asset position — globally and under each account — without inferring it from quantity × PRU.

## Flow

```text
Workbook + prices
       |
       v
 buildPortfolio (@patrimo/core)
       |
       +--> AssetPosition.costBasis
       +--> AccountAssetPosition.costBasis
       |
       +--------+--------+--------+--------+
       v        v        v        v        v
  Web actifs  Web détail  Mobile actifs  Web comptes  Mobile comptes
  list col    KPI card    summary        active table  active lines
```

## Surfaces

| Surface | Placement | Source field | Notes |
|---|---|---|---|
| Web asset list | Column after PRU (`actifs-table.tsx`) | `costBasis` | `0 €` if quantity 0 |
| Web asset detail | KPI after PRU (`asset-position-kpis.tsx`) | `costBasis` | `0 €` if quantity 0 |
| Mobile asset list | Summary next to PRU (`mobile/app/actifs.tsx`) | `costBasis` | `0 €` if quantity 0 |
| Web comptes | Active-positions table after PRU (`account-positions-tables.tsx`) | `AccountAssetPosition.costBasis` | Active only (`quantity > 0`) |
| Mobile comptes | Under account card: label · qty · Investi · value (`mobile/app/comptes.tsx`) | `AccountAssetPosition.costBasis` | Active only |

## Invariants

Governed by [ADR 0003](../docs/adr/0003-display-invested-on-asset-surfaces.md). Portfolio math stays in `@patrimo/core`; platforms only format and render.

## Out of scope

- New portfolio metrics
- **Investi** on closed account positions
- Changing account-header / dashboard invested totals (already present)

## See also

- [Glossary — Invested](../docs/reference/glossary.md)
- [Implement asset invested display](../docs/howto/implement-asset-invested-display.md)
- [Platforms](../docs/overview/platforms.md)
