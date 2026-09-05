# Property tax (taxe foncière) history

Confirmed mechanics for workbook-backed taxe foncière history. Decision
record: [ADR 0027](../../docs/adr/0027-property-tax-history.md).

## Intention and success

`Property.taxeFonciere` is a single flat number reused unchanged for every
year of a projection, which under-estimates operating charges and total
return as taxe foncière rises over the years. A per-year history lets
`operatingForYear` / `projectProperty` deduct the right amount for each
projected year while never touching the legal capital-gain calculation
(`resaleTax()`), and without breaking any workbook that predates this
feature.

Success is observable when:

- a property with taxe foncière entries for several years gets the correct
  amount deducted for each projected year (exact match, or carry-forward
  from the last known year at or before it);
- a property without any entry keeps using the flat field exactly as
  before;
- `resaleTax()` / `capitalGainTax` never vary with taxe foncière history;
- deleting a property removes its history rows;
- the resolved current-year amount is visible somewhere in the UI
  (`PropertySnapshot.currentPropertyTax`).

## Workbook contract

Optional sheet: `Taxe foncière`.

| Column | Model field | Rule |
|---|---|---|
| `Bien` | `propertyId` | Existing `Property.id` (never the label) |
| `Année` | `year` | Integer calendar year — future years accepted |
| `Montant` | `amount` | Non-negative finite number |

The logical key is `Bien + Année`.

## Shared transformation

```text
UI / API command
       |
       v
@patrimo/core validation + upsert/delete
       |
       v
next Workbook value
       |
       +--> web Excel adapter
       |
       +--> mobile local/Drive adapter (read/write only — no edit UI)
```

Shared pure operations (`property-taxes.ts`):

- `normalizePropertyTaxes` — last-valid-row-wins per `(propertyId, year)`,
  drops rows referencing an unknown property or an invalid year/amount;
- `upsertPropertyTax` / `deletePropertyTax` — mutate one row; an upsert on
  an existing pair replaces the amount rather than being rejected;
- `removePropertyTaxesForProperties` — deletion cascade helper;
- `resolvePropertyTaxForYear(propertyTaxes, propertyId, year, fallback)` —
  exact entry > carry-forward (largest year `<= year`) > `fallback`
  (`Property.taxeFonciere`), evaluated year by year.

## Read behavior

1. Missing sheet produces an empty `propertyTaxes` collection.
2. Invalid rows and unknown-property rows do not participate in
   resolution.
3. Duplicate `(propertyId, year)` keys are reduced in sheet order; the last
   valid row wins.
4. A property with no rows behaves exactly as before this feature (flat
   field for every year — zero regression, zero forced migration).
5. A future year is accepted, unlike `ManualPrice` (`isFutureDate` does not
   apply here): an anticipated tax notice can make a future amount
   legitimately known ahead of time.

## Projection integration

`projectProperty`'s per-year loop maps loop index `k` (1-based) to a
calendar year via `calendarYear(now, k) = now.getUTCFullYear() + k - 1`
(`k=1` = current calendar year, consistent with `propertySnapshot`'s
1-year horizon). For each `k`, `resolvePropertyTaxForYear` resolves the
amount and `operatingForYear(property, resolvedAmount)` uses it instead of
reading `property.taxeFonciere` directly. `resaleTax()` is never given this
value — taxe foncière is not deductible from the acquisition price for
French real-estate capital gains.

`PropertySnapshot.currentPropertyTax` exposes the amount resolved for the
current calendar year, part-adjusted like the snapshot's other monetary
fields. `netYield` and `monthlyCashFlowAfterTax` (already derived from
`operatingForYear` via `projectProperty`) inherit the resolved value too.
`annualTaxFoncier` is unrelated — it is the income tax on rental income
(IR/PS/IS), not the taxe foncière itself.

## Write behavior

1. Validate the property exists.
2. Validate the year is a finite integer and the amount is a non-negative
   finite number (no future-year rejection).
3. Apply the pure transformation in memory.
4. Serialize the workbook, creating `Taxe foncière` when absent.
5. Persist through the platform adapter.

## Implemented surface

- Core: `PropertyTax`, `Workbook.propertyTaxes`,
  `@patrimo/core/property-taxes`, template sheet `Taxe foncière`,
  `operatingForYear` / `projectProperty` / `propertySnapshot` resolution.
- Web: Excel parse/serialize (`src/lib/excel.ts`), deletion cascade in
  `deleteProperty`, `/api/property-taxes`, property form editable history
  table (`src/app/immobilier/property-form.tsx`,
  `property-tax-history.tsx`), `/fiscalite` and the live "Immobilier" tab
  on `/investissements` read `snapshot.currentPropertyTax`.
- Mobile: Excel adapter reads and writes the sheet symmetrically (no edit
  UI — real estate stays read-only on mobile).

## OPEN

Non-blocking:

- `mobile/app/projection.tsx` recomputes its own rental cash-flow reading
  `property.taxeFonciere` directly, bypassing `@patrimo/core` entirely —
  pre-existing debt, does not benefit from per-year resolution.
- `src/app/immobilier/page.tsx` is not reachable through normal navigation
  (`next.config.ts` redirects `/immobilier` to `/investissements`); it was
  still updated for consistency, but the live route is the "Immobilier"
  tab of `/investissements`.

Out of scope:

- Automatic escalation rate for years without an entry.
- Bulk / CSV import of historical amounts.
- Mobile editing UI for the history.

## See also

- [ADR 0027](../../docs/adr/0027-property-tax-history.md)
- [Manual price persistence](manual-prices.md) (the pattern this mirrors)
- [Key principles](../../CONSTRAINTS.md)
- [Foundations](ARCHITECTURE.md)
- [Glossary](../../docs/reference/glossary.md)
