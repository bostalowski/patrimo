# Glossary

Canonical vocabulary for Patrimo. Prefer these terms in docs, ADRs, and code discussions.

## Account

A portfolio container with an account type and tax envelope. Transactions reference accounts by identifier. Persisted in the `Comptes` sheet. On web and mobile, the accounts list opens a dedicated account detail surface (positions and geographic exposure); metadata editing stays on the account form / edit-account screen.

## Asset

A financial instrument tracked in the `Actifs` sheet. Transactions and investment-plan baskets reference assets by identifier.

## Envelope

Tax wrapper attached to an account: `CTO`, `PEA`, `PEE`, `AV`, `LIVRET`, or `PER`.

## Workbook

The Excel `.xlsx` file that stores source portfolio data (transactions, assets, accounts, and optional budget, real-estate, and DCA sheets).

## Transaction

A dated movement in the `Transactions` sheet. Types: `ACHAT`, `VENTE`, `DIVIDENDE`, `INTERET`, `TRANSFERT`, `DEPOT`, `RETRAIT`.

## PRU

Unit cost basis of a position (`costBasis / quantity`) as computed by `@patrimo/core` portfolio logic.

## Invested

Remaining position cost basis (`costBasis`) as computed by `@patrimo/core` portfolio logic. UI label **Investi**. Equals quantity × PRU for an open position. Not historical net cash deployed after closed quantity.

## Unrealized P&L

Mark-to-market gain or loss versus PRU for remaining quantity.

## Realized P&L

Gain or loss locked by disposals and related realized events (sales, and other realized cash flows modeled by the portfolio engine).

## Net worth

Portfolio valuation plus real-estate equity contributions used on the dashboard (`computeNetWorth`).

## Emergency fund coverage

Months of monthly expenses covered by total livret market value: `livretBalance / depensesMensuelles`. Computed by `computeEmergencyFundHealth` in `@patrimo/core`. Undefined when monthly expenses are zero or negative (indicator hidden).

## Emergency fund health

Status band derived from **Emergency fund coverage**: `insufficient` (&lt; 3 months), `acceptable` ([3, 6)), `healthy` ([6, 12)), `over_allocated` (≥ 12). Shown on web and mobile Dashboards when coverage is defined.

## Risk status band

Qualitative judgement attached to a performance risk metric (annualized volatility, Sharpe ratio, or max drawdown) using fixed product thresholds in `@patrimo/core`. Used so Dashboards can show a human label and color without redefining cutoffs in the UI. When the underlying metric is null (insufficient history), no band is produced.

## No account

A system-owned portfolio group for transactions preserved after account deletion. It is included in portfolio totals and performance, excluded from tax estimates, and cannot be selected when creating a transaction. The reserved identifier is `__NO_ACCOUNT__`.

## Unassigned cash

Reserved cash asset used when a savings account is detached. Deposits, withdrawals, and recorded interest move to this asset under **No account**. The reserved identifier is `__UNASSIGNED_CASH__`.

## Detach

Delete an account while preserving its transactions by moving every source or destination reference to **No account**.

## Cascade deletion

Delete an entity and every dependent record required to prevent invalid references.

## Investment plan

A DCA configuration containing baskets of asset identifiers and target allocations. Persisted in the `DCA` sheet.

## Extra contribution

A non-monthly investment-plan stream (`TRIMESTRIEL` or `ANNUEL`) used by Projection alongside the monthly contribution field. Kept as a separate calendar stream (not divided into the monthly input). Web and mobile Projection may show it as a badge (`extraContributions` / `extraStreams`).

## Envelope overflow

Surplus contribution clipped when a projected envelope reaches its plafond, then routed once to a fallback envelope (default `CTO`) by `projectEnvelopesWithOverflow` in `@patrimo/core`. Single hop only; not a workbook field in V1 — UI / session override. See [ADR 0016](../adr/0016-envelope-overflow-plafond.md).

## Price cache

Derived price history stored locally by each application instance. Price caches are not the source of truth and may be removed lazily after the corresponding asset is deleted on another device.

## Price source

How an asset obtains quotes: `coingecko`, `yahoo`, `investir`, `zonebourse`, or `manual`.

## Manual price

A user-entered dated valuation (typically FCPE VL) stored in the optional workbook sheet `Prix manuels`. Only assets whose price source is `manual` use these entries. Automatic market prices remain in local derived caches (`prices.json` / AsyncStorage), not in this sheet.

## Geographic allocation

Look-through geographic weights for an asset (fractions with `0 < sum ≤ 1` within tolerance; partial sums allowed), persisted in the optional workbook sheet `Exposition geo`. Rows for one asset are either **country-level** (ISO 3166-1 alpha-2 or residual `OTHER`) or **region-level** (product region keys), never mixed. Used to build portfolio, account, and asset breakdowns with **absolute** weights (missing fraction and country `OTHER` stay unreported on charts). Assets without an allocation are excluded from geo charts. UI shows a **country** view and a **region** view; region-only assets appear only in the region view. See [ADR 0010](../adr/0010-partial-geographic-allocation-weights.md).

## Geographic region

Product geographic rollup keys: `NORTH_AMERICA`, `LATIN_AMERICA`, `EUROPE`, `ASIA_PACIFIC`, `AFRICA_MIDDLE_EAST`, `OTHER` (French labels: Amérique du Nord, Amérique latine, Europe, Asie-Pacifique, Afrique & Moyen-Orient, Autre). Used (1) as rollup of country rows via `regionForCountry`, and (2) as directly stored allocation keys when the user enters region-only weights. Manual region entry uses a closed picker of these six keys only. Legacy workbook key `EMERGING` is normalized to `OTHER`.

## Allocation source

How a geographic allocation was last written: `manual` (user-entered) or `justetf` (fetched from JustETF). Manual lock: ordinary JustETF sync does not overwrite `manual` rows; Restore does.

## Tax estimate

Simplified French-tax heuristic produced by `@patrimo/core` fiscal modules. Indicative only; not a tax filing output.

## Annual fee drag

Calendar-year explicit transaction fees divided by current portfolio **Invested** (`netInvested`). Computed in `@patrimo/core`. Undefined (`null`) when invested capital is zero or negative.

## All-in annual cost

Sum of calendar-year explicit fees and the estimated annual TER euro cost, divided by current **Invested**. Mixes fees already paid this year with a forward TER estimate. Undefined when invested capital is zero or negative.

## Fees-to-gain ratio

All-time explicit fees divided by portfolio (or asset) **total return** (unrealized + realized + income as produced by the portfolio engine). Undefined when total return is zero or negative — not a fee-health score in down markets.

## Financial goal

Named capital or income intention persisted in optional workbook sheet
`Objectifs`. Per-goal flag **Inflation comprise** (`inflationIncluded`,
default true): when true, `targetAmount` is in today's euros and inflation
inflates the horizon need; when false, `targetAmount` is already horizon
euros and is deflated for stock progress. **Stock progress** on Objectifs
compares liquid wealth to `requiredToday` (always today's euros).
**Trajectory** on Projection compares projected real capacity to
`requiredToday`; UI **Besoin** shows `requiredAtHorizon`. Types:
**retirement income** (monthly income at a target age) and **capital at
date**. Several goals share the same liquid pool (no exclusive envelope
assignment in V1). See [ADR 0014](../adr/0014-financial-goals.md).

## Diversification target

Portfolio-level intent as min–max bands on diversification keys: ISO country, product **Geographic region**, or `CRYPTO`. Persisted in optional workbook sheet `Cibles diversification`. Partial plans are allowed (bands need not sum to 100 %). Empty collection clears the plan. Keys must not overlap (a country and its parent region are overlapping). See [ADR 0012](../adr/0012-allocation-coherence.md).

## Allocation coherence

Measure of alignment between saved **Diversification target** bands, current liquid stock, and annualized DCA flow mix. Computed by `assessDiversificationCoherence`. Geo bands use look-through from `Exposition geo` on **all** asset types (including `CRYPTO`). The `CRYPTO` band uses `AssetType.CRYPTO` at full value. Geo and crypto axes **overlap by design** — the same euro may count toward both a country/region band and the `CRYPTO` band. Per-value tones: `ok` (in-band ±1e-3), `watch` (outside but |Δ| ≤ 2 pp), `breach` (|Δ| > 2 pp). Statuses: `aligned`, `watch`, `misaligned` (worst tone; findings `band_drift` / `flow_misalign` carry the tone). Returns null (card hidden) when no bands are saved or liquid invested is zero. The Diversification menu breakdown (`aggregatePortfolioDiversificationBreakdown`) partitions full liquid MV into geo slices, crypto, and **unmapped** (hors geo et hors crypto — livret, cash, actifs non renseignés). Band coherence axes still overlap. Account and asset geo charts still use covered market value ([ADR 0010](../adr/0010-partial-geographic-allocation-weights.md)). Never uses HHI / Top1 / Top3 ([ADR 0006](../adr/0006-portfolio-risk-readability.md)).

## Next-euro plan

Read-only ranked list of **buy** / **hold** / **pause** steps that reallocates the existing monthly DCA envelope toward the emergency-fund LIVRET gap and underweight diversification bands, then residual DCA. Computed by `buildNextEuroPlan` in `@patrimo/core`. Does not write the workbook. Hidden when there is no monthly DCA pool and the emergency fund is not insufficient. See [ADR 0015](../adr/0015-next-euro-plan.md).

## Savings capacity

Derived monthly **investable surplus** after budget cashflow and emergency-fund catch-up, compared to planned DCA. `rawSavings = revenusMensuels − depensesMensuelles` (budget `EPARGNE` lines ignored). Catch-up reserve spreads the gap to **6** months of expenses over **12** months when coverage is below that target (`monthlyEmergencyReserve`); zero when coverage ≥ 6 or expenses ≤ 0. `investableSurplus = rawSavings − reserve` (may be negative). `plannedDcaMonthly` from `computeMonthlyDcaPool`. Status: `comfortable` / `tight` / `over_committed`. Hidden (`null`) when `revenusMensuels ≤ 0`. Computed by `computeSavingsCapacity` in `@patrimo/core`. Dashboard card on web and mobile; soft warnings on web DCA / Projection when over-committed. No workbook field; does not auto-resize DCA. Complementary to **Next-euro plan** (capacity fit vs pool reallocation). See [ADR 0017](../adr/0017-savings-capacity-bridge.md).

## Portfolio health cockpit

Dashboard composition of existing health signals (emergency fund, savings capacity, diversification coherence, risk vol/drawdown bands, financial goals) into traffic-light tones (`ok` / `watch` / `breach`) plus **one** recommended next-action sentence. Computed by `buildPortfolioHealthCockpit` in `@patrimo/core`. Prefers the first **Next-euro plan** step when present; otherwise the worst visible pill; otherwise a calm all-ok sentence. No proprietary score `/100`. Fees excluded while [ADR 0007](../adr/0007-fee-monitoring-ratios.md) forbids fee color bands. Web Dashboard only in V1; derived only (no workbook field). See [ADR 0018](../adr/0018-portfolio-health-cockpit.md).

## See also

- [CONSTRAINTS.md](../../CONSTRAINTS.md)
- [packages/core/ARCHITECTURE.md](../../packages/core/ARCHITECTURE.md)
- [ADR 0001](../adr/0001-share-deletion-rules-across-platforms.md)
- [ADR 0002](../adr/0002-store-manual-prices-in-workbook.md)
- [ADR 0004](../adr/0004-show-non-monthly-streams-on-mobile-projection.md)
- [ADR 0005](../adr/0005-emergency-fund-health-indicator.md)
- [ADR 0006](../adr/0006-portfolio-risk-readability.md)
- [ADR 0007](../adr/0007-fee-monitoring-ratios.md)
- [ADR 0008](../adr/0008-geographic-allocation.md)
- [ADR 0012](../adr/0012-allocation-coherence.md)
- [ADR 0015](../adr/0015-next-euro-plan.md)
- [ADR 0016](../adr/0016-envelope-overflow-plafond.md)
- [ADR 0017](../adr/0017-savings-capacity-bridge.md)
- [ADR 0018](../adr/0018-portfolio-health-cockpit.md)
- [Manual price persistence](../architecture/manual-price-persistence.md)
- [Geographic allocation](../architecture/geographic-allocation.md)
- [Diversification targets](../architecture/diversification-targets.md)
