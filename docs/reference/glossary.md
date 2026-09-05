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

## Emergency fund config

Workbook-backed settings persisted in optional sheet `Fonds urgence`: reserve
target in months (`Cible (mois)`), optional absolute euro target override
(`Cible (€)`), and catch-up horizon (`Horizon rattrapage (mois)`). Used by
`computeSavingsCapacity`; does not change Emergency fund health status
thresholds.

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

A DCA configuration containing baskets of asset identifiers and target allocations. Persisted in the `DCA` sheet. When `envelope` is `LIVRET`, the plan is a cash dépôt stream: empty baskets are allowed (no broker assets). See [ADR 0019](../adr/0019-livret-dca-savings-capacity.md).

## Extra contribution

A non-monthly investment-plan stream (`TRIMESTRIEL` or `ANNUEL`) used by Projection alongside the monthly contribution field. Kept as a separate calendar stream (not divided into the monthly input). Web and mobile Projection may show it as a badge (`extraContributions` / `extraStreams`).

## Envelope overflow

Surplus contribution clipped when a projected envelope reaches its plafond, then routed once to a fallback envelope (default `CTO`) by `projectEnvelopesWithOverflow` in `@patrimo/core`. Single hop only; not a workbook field in V1 — UI / session override. See [ADR 0016](../adr/0016-envelope-overflow-plafond.md).

## Price cache

Derived price history stored locally by each application instance. Price caches are not the source of truth and may be removed lazily after the corresponding asset is deleted on another device.

## Livret rate series

Dated official annual rates for Livret A / LDDS (`{ effectiveFrom, annualRate }`). Math in `@patrimo/core` uses seed ∪ local cache only — never `Comptes.Taux` / `account.rate` (UI mirror). Platforms merge the series during price sync (OpenFisca YAML); failure must not fail price sync. See [ADR 0024](../adr/0024-livret-official-rate-series.md).

## Price source

How an asset obtains quotes: `coingecko`, `yahoo`, `investir`, `zonebourse`, or `manual`.

## Manual price

A user-entered dated valuation (typically FCPE VL) stored in the optional workbook sheet `Prix manuels`. Only assets whose price source is `manual` use these entries. Automatic market prices remain in local derived caches (`prices.json` / AsyncStorage), not in this sheet.

## Taxe foncière history

A dated per-property property-tax amount, one row per `(Bien, Année)`,
persisted in the optional workbook sheet `Taxe foncière` (`Bien` =
`Property.id`, never the label). Model: `PropertyTax { propertyId, year,
amount }` on `Workbook.propertyTaxes`. Resolution
(`resolvePropertyTaxForYear`) for a given property and calendar year: an
exact entry for that year wins (a future year is accepted, unlike **Manual
price**); otherwise the entry with the largest year at or before the
requested year wins (carry-forward, no automatic escalation); otherwise the
flat `Property.taxeFonciere` field is the fallback, applied year by year.
Feeds `operatingForYear` / `projectProperty` (`totalReturn`, `netIfSold`)
and `PropertySnapshot.currentPropertyTax` (the resolved amount for the
current calendar year, part-adjusted) in `@patrimo/core`. Never feeds
`resaleTax()` — taxe foncière is not deductible from the acquisition price
for French real-estate capital gains. See [ADR 0027](../adr/0027-property-tax-history.md).

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
**retirement income** (monthly income at a **target date**) and **capital at
date**. Retirement-income goals also store **Vivre sur le capital**
(`drawOnCapital`, default false = intérêts seuls), **Taux capitalisation**
(`capitalisationRate`, fraction `]0, 0.10]`, defaults 3 % / 4 % by mode), and
**Pension publique** (`publicPensionLink`: `NONE` / `LEGAL_AGE` / `FULL_RATE` /
`AUTOMATIC_FULL_RATE`, default `NONE`). Mode is label + defaults + copy only;
formula is always `annualNeed / capitalisationRate`. Public pension net is
subtracted only when the linked scenario is **filled** and civil
`targetDate ≥ scenario.startDate`. Retirement profile scenarios live in
`retirement-profile.json` (not the workbook). Profile `withdrawalRate` does
not feed goals. Several goals share the same liquid pool (no exclusive
envelope assignment in V1). See
[ADR 0014](../adr/0014-financial-goals.md),
[ADR 0023](../adr/0023-goal-capitalisation-mode.md),
[ADR 0025](../adr/0025-multi-scenario-public-pension.md).

## Diversification target

Portfolio-level intent as min–max bands on diversification keys: ISO country, product **Geographic region**, or `CRYPTO`. Persisted in optional workbook sheet `Cibles diversification`. Partial plans are allowed (bands need not sum to 100 %). Empty collection clears the plan. Keys must not overlap (a country and its parent region are overlapping). See [ADR 0012](../adr/0012-allocation-coherence.md).

## Allocation coherence

Measure of alignment between saved **Diversification target** bands, current liquid stock, and annualized DCA flow mix. Computed by `assessDiversificationCoherence`. Geo bands use look-through from `Exposition geo` on **all** asset types (including `CRYPTO`). The `CRYPTO` band uses `AssetType.CRYPTO` at full value. Geo and crypto axes **overlap by design** — the same euro may count toward both a country/region band and the `CRYPTO` band. Per-value tones: `ok` (in-band ±1e-3), `watch` (outside but |Δ| ≤ 2 pp), `breach` (|Δ| > 2 pp). Statuses: `aligned`, `watch`, `misaligned` (worst tone; findings `band_drift` / `flow_misalign` carry the tone). Returns null (card hidden) when no bands are saved or liquid invested is zero. The Diversification menu breakdown (`aggregatePortfolioDiversificationBreakdown`) partitions full liquid MV into geo slices, crypto, and **unmapped** (hors geo et hors crypto — livret, cash, actifs non renseignés). Band coherence axes still overlap. Account and asset geo charts still use covered market value ([ADR 0010](../adr/0010-partial-geographic-allocation-weights.md)). Never uses HHI / Top1 / Top3 ([ADR 0006](../adr/0006-portfolio-risk-readability.md)).

## Next-euro plan

Read-only **monthly investment DCA tilt**: verdict (`aligned` / `tilt` /
`adjust_plan`) and per-asset euro contributions feeding **Exécution** (opt-in).
Computed by `buildMonthlyDcaTilt` / `buildNextEuroPlan` in `@patrimo/core`.
Investment pool only (LIVRET excluded from the tilt envelope). Emergency-fund
LIVRET advice is **not** taken from this pool — see **Emergency fund surplus
recommendation**. Hidden when investment monthly pool is zero. Web Dashboard:
EF surplus on **Emergency fund** card; no tilt catch-up card — see
[ADR 0022](../adr/0022-dca-first-monthly-card.md).
See also [ADR 0015](../adr/0015-next-euro-plan.md),
[ADR 0020](../adr/0020-emergency-fund-surplus-recommendation.md),
[ADR 0021](../adr/0021-monthly-dca-tilt-execution.md).

## Monthly DCA tilt

Per-asset euro split for the current month’s investment DCA, with capped band
catch-up (`min(gap/3, gap, pool×50%)`) and DCA-line executable universe. Feeds
Exécution via `computeDcaExecutionFromContributions` when the user opts in.
Legacy UI title **Ajustement DCA du mois** may remain in tilt copy helpers for
Exécution. Monthly investment action is **Exécution** (saved DCA default).
See [ADR 0021](../adr/0021-monthly-dca-tilt-execution.md),
[ADR 0022](../adr/0022-dca-first-monthly-card.md).

## Versement ponctuel (lump-sum)

Web **Exécution** mode: user enters a one-off total and selects DCA plans;
inter-plan split is pro-rata on saved monthly `amount`, then intra-plan via
`computeDcaPlan` / `computeDcaExecution`. Advisory only (no workbook write).
Ignores monthly DCA tilt. Implemented by `splitLumpSumAcrossDcaPlans` in
`@patrimo/core`.

## Actifs à alimenter (execution asset selection)

Web **Exécution** per-asset checkboxes (**Alimenter ce mois-ci**): user can
exclude specific assets from this month's orders without changing the saved DCA
plan. Unchecked assets reconcentrate budget **within the same basket only**
(other baskets unchanged). Advisory only (no workbook write). Hidden when
monthly DCA tilt is active. Optional `enabledAssetIds` on `computeDcaPlan` in
`@patrimo/core`.

## Dashboard exposure alert (removed)

Former web Dashboard block for stock `band_drift` **breach** (ADR 0022). Removed
2026-08 — breach detail remains on **Diversification** via allocation coherence.
Copy helpers in `this-month-copy.ts` are retained for potential reuse.

## Emergency fund surplus recommendation

Advisory LIVRET oneshot or monthly catch-up toward the configured
**Emergency fund config** target, using cash left after planned investment DCA
(`max(0, rawSavings − plannedInvestmentDcaMonthly)`). Deducts planned LIVRET
DCA on the monthly path. Does not reallocate investment DCA. Computed by
`computeEmergencyFundSurplusRecommendation` in `@patrimo/core`; shown on web
Dashboard **Emergency fund** card (when actionable). Savings capacity UI is hidden; core and
copy helpers retained. See
[ADR 0020](../adr/0020-emergency-fund-surplus-recommendation.md),
[ADR 0022](../adr/0022-dca-first-monthly-card.md).

## Savings capacity

Derived monthly **investable surplus** after budget cashflow and emergency-fund
outflow, compared to planned **investment** DCA. `rawSavings = revenusMensuels −
depensesMensuelles` (budget `EPARGNE` lines ignored). Implied catch-up **need**
(`monthlyEmergencyReserve`) spreads the gap to the configured emergency-fund
target over the catch-up horizon (ADR 0018). Real LIVRET DCA
(`plannedLivretDcaMonthly`) and non-LIVRET DCA (`plannedInvestmentDcaMonthly`)
are split: EF outflow = `max(need, plannedLivret)`;
`investableSurplus = rawSavings − outflow`. Status
(`comfortable` / `tight` / `over_committed`) compares **investment** DCA only
to surplus. When `plannedLivret > need`, core sets
`emergencyOverContributing` / `emergencyOverContribution` (alert surfaces
currently unmounted; core fields kept) without forcing investment
`over_committed`. Also attaches **Emergency fund surplus recommendation** when
the target gap still needs extra LIVRET. Hidden (`null`) when `revenusMensuels ≤ 0`.
Computed by `computeSavingsCapacity` in `@patrimo/core`. Complementary to
**Next-euro plan** (capacity fit vs pool reallocation). See
[ADR 0017](../adr/0017-savings-capacity-bridge.md),
[ADR 0019](../adr/0019-livret-dca-savings-capacity.md),
[ADR 0020](../adr/0020-emergency-fund-surplus-recommendation.md).

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
- [ADR 0018](../adr/0018-configurable-emergency-fund-target.md)
- [ADR 0019](../adr/0019-livret-dca-savings-capacity.md)
- [ADR 0020](../adr/0020-emergency-fund-surplus-recommendation.md)
- [ADR 0027](../adr/0027-property-tax-history.md)
- [Manual price persistence](../architecture/manual-price-persistence.md)
- [Geographic allocation](../architecture/geographic-allocation.md)
- [Diversification targets](../architecture/diversification-targets.md)
