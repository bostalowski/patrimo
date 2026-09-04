# ADR 0027: Taxe foncière history per property and year

- Status: accepted
- Date: 2026-09-04

## Context

`Property.taxeFonciere` (workbook column `Taxe foncière` on `Immobilier`) is a
single flat number reused unchanged for every year of a real-estate
projection. In reality, taxe foncière increases most years, so the
simulator under-estimates operating charges and total return the further
out the projection horizon goes.

Canonical terms are defined in the [glossary](../reference/glossary.md).

## Decision

A new optional workbook sheet `Taxe foncière` stores one row per `(Bien,
Année)` pair with columns `Bien` (a `Property.id`, never the label —
consistent with `ManualPrice.assetId` vs. `IMMOBILIER_HEADERS`' separate
`ID`/`Libellé`), `Année`, and `Montant`. The canonical in-memory model is
`PropertyTax { propertyId, year, amount }` on `Workbook.propertyTaxes`.
`@patrimo/core/property-taxes` mirrors the shape of
`@patrimo/core/manual-prices` (see [ADR 0002](0002-store-manual-prices-in-workbook.md),
[manual-prices.md](../../packages/core/manual-prices.md)):

- `normalizePropertyTaxes` reduces duplicate `(propertyId, year)` rows with
  last-valid-row-wins semantics and drops rows referencing an unknown
  property or an invalid year/amount. No blocking Zod `.superRefine()` on
  the whole array — a duplicate in a hand-edited workbook must never fail
  the whole parse.
- `upsertPropertyTax` / `deletePropertyTax` mutate one row. A write for an
  existing `(propertyId, year)` pair replaces the amount instead of being
  rejected as a duplicate.
- `removePropertyTaxesForProperties` is the deletion-cascade helper (mirrors
  `removeManualPricesForAssets`); the imperative web adapter
  (`src/lib/excel.ts#deleteProperty`) calls `deleteRow(SHEET_TAXE_FONCIERE,
  "Bien", id)` directly, the same pattern already used for `SHEET_IMMOBILIER`
  in that function (property deletion there does not go through
  `packages/core/src/deletion.ts`, which does not model `Property` today).
- `resolvePropertyTaxForYear(propertyTaxes, propertyId, year, fallback)`
  resolves the effective amount for one property and one calendar year:
  an exact `(propertyId, year)` entry always wins (including a future
  year); otherwise the entry with the largest year `<= year` wins
  (**carry-forward**, no automatic escalation); otherwise `fallback` — the
  flat `Property.taxeFonciere` field — applies. The fallback is evaluated
  **year by year**, not property by property: a property with a history
  that starts only in the future still falls back to the flat field for
  earlier requested years.

Unlike `ManualPrice`, a future year is **not** rejected: an anticipated tax
notice or a municipal vote can make a future amount legitimately known
ahead of time, unlike a market price.

`Property.taxeFonciere` is unchanged in the schema and is never deleted or
migrated. It is the fallback used whenever no entry exists at or before the
requested year — zero regression for existing workbooks, zero forced
migration.

### Projection loop → calendar year mapping

`packages/core/src/realestate/projection.ts#projectProperty` resolves the
taxe foncière for each loop year `k` (1-based) via
`calendarYear(now, k) = now.getUTCFullYear() + k - 1`, so `k=1` is the
**current** calendar year. This keeps `propertySnapshot` (which projects
with `horizonYears: 1` for its "current" metrics) pointed at the year the
user is actually in, not the next one. It is an indicative simplification
consistent with the rest of the model (the loop is not pinned to the real
calendar year of the loan — see `monthsElapsedLoan`), not a day-accurate
billing guarantee.

`operatingForYear(property, resolvedTaxeFonciere?)` now accepts the
resolved amount for the year being computed (defaulting to
`property.taxeFonciere` when omitted, for callers that have not been
updated, e.g. `packages/core/src/retraite.ts`). `PropertySnapshot` gains
`currentPropertyTax`: the taxe foncière resolved for the current calendar
year, part-adjusted like the snapshot's other monetary fields.
`netYield` / `monthlyCashFlowAfterTax` (which already derive from
`operatingForYear` via `projectProperty`) reflect the resolved amount too.
`annualTaxFoncier` is unchanged — it is the income tax on rental income
(IR/PS/IS), not the taxe foncière itself, despite the similar name.

`resaleTax()` (the taxable capital-gain assiette on resale) is deliberately
**not** touched: taxe foncière is not deductible from the acquisition price
for French real-estate capital gains, so feeding it into that calculation
would present an indicative shortcut as legally exact. Only the operating
result (`totalReturn` / `netIfSold`, derived from cash flow) reflects the
per-year history.

### Web UI

The property form (`src/app/immobilier/property-form.tsx`) replaces the
single "Taxe foncière / an" input with an editable "Taxe foncière par
année" table (add / edit / remove a year+amount row —
`src/app/immobilier/property-tax-history.tsx`). The flat field is no
longer user-edited there; it is passed through unchanged on every save
(fallback plumbing only). Saving persists each row via
`POST /api/property-taxes` (upsert) and removed rows via
`DELETE /api/property-taxes`, both backed by `upsertPropertyTax` /
`deletePropertyTax`.

`src/app/fiscalite/page.tsx` (a real, reachable route) reads
`snapshot.currentPropertyTax` instead of `property.taxeFonciere` directly
for its "Taxe foncière" column. `src/app/immobilier/page.tsx` was updated
the same way, but note: `next.config.ts` redirects `/immobilier` to
`/investissements`, so that file is not reachable through normal
navigation today — the live "Immobilier" tab is
`ImmobilierSection` in `src/app/investissements/investissements-client.tsx`,
which was also updated to thread `propertyTaxes` into `propertySnapshot`
and into the property form (both call sites), so the same resolved values
and the per-year editing table work on the actually-reachable route too.
No mobile UI changes (mobile stays real-estate read-only); mobile's Excel
adapter (`mobile/lib/excel-mobile.ts`) reads and writes the new sheet
symmetrically so data round-trips without loss, but
`mobile/app/projection.tsx`'s own hand-rolled rental cash-flow calc (which
already bypasses `@patrimo/core` and reads `property.taxeFonciere` raw) is
pre-existing debt, explicitly out of scope here.

## Invariants

- `Bien` is always a `Property.id`, never a label.
- A `(Bien, Année)` pair is unique after normalization; the last valid row
  wins on read, and a write for an existing pair replaces it.
- A future year is accepted and, if present, always wins over
  carry-forward for that year.
- `resaleTax()` / `capitalGainTax` never vary with taxe foncière history.
- Deleting a property removes its `Taxe foncière` rows.
- An existing workbook without the sheet, or a property with no rows in
  it, behaves exactly as before (flat field for every year).

## Options considered

### Dedicated workbook sheet, one row per (property, year) — chosen

**Advantages**

- Matches the existing `Prix manuels` / `ManualPrice` pattern exactly —
  same validation shape, same platform serializers, same mental model.
- A hand-edited duplicate row degrades gracefully (last-valid-row-wins)
  instead of making the workbook unreadable.
- History is inspectable and editable directly in Excel.

**Disadvantages**

- A ninth workbook sheet and a ninth pure-transform module to keep in sync
  across both platform serializers.

### Single JSON/text column on `Immobilier`

**Disadvantages** — rejected: breaks direct Excel editing of the workbook,
invents a bespoke on-cell format outside the existing sheet-per-collection
convention.

### One column per year on `Immobilier`

**Disadvantages** — rejected: unbounded schema growth as years pass, breaks
`upsertRowsInWorkbook`'s stable-header assumption.

### Escalation rate field (`tauxAugmentationTaxeFonciere`, or reuse `revaloAnnuelle`)

**Disadvantages** — rejected by the user during cadrage: taxe foncière
increases are municipal-vote-driven and lumpy, not a smooth compounding
rate; reusing `revaloAnnuelle` would conflate two unrelated assumptions
(property value revaluation vs. a municipal tax).

### Feed cumulative taxe foncière into `resaleTax()`

**Disadvantages** — rejected: taxe foncière is not deductible from the
acquisition price for French real-estate capital gains (`PV_IMMO_IR_RATE`
abattements); doing so would present a non-conforming shortcut as an exact
legal calculation.

## Consequences

- `Workbook` gains a `propertyTaxes: PropertyTax[]` collection (required,
  defaults to `[]` — every existing workbook literal across the test suite
  needed the field added, same ripple as when `financialGoals` was added).
- `packages/core/src/realestate/projection.ts#projectProperty` resolves
  taxe foncière **inside** its per-year loop instead of once before it —
  necessary for the value to vary year to year at all.
- `PropertySnapshot.currentPropertyTax` is a new public field; existing
  consumers that do not pass `propertyTaxes` to `propertySnapshot` (e.g.
  `packages/core/src/retraite.ts`) keep working unchanged (default `[]`,
  same as before).
- Web and mobile Excel adapters both gain read + write for the new sheet.

## Uncovered cases

- No bulk / CSV import of historical taxe foncière amounts.
- No mobile UI for editing the history (mobile stays read-only for real
  estate); mobile only round-trips the sheet so data is not lost.
- `mobile/app/projection.tsx`'s independent rental cash-flow calculation
  does not consume the resolved per-year value (pre-existing debt, not
  touched here).
- `src/app/immobilier/page.tsx` is dead code today (`/immobilier` redirects
  to `/investissements`); it was still updated for consistency with this
  decision, but the live route is the "Immobilier" tab of
  `/investissements`.

## Follow-up

- If `/immobilier` is ever re-linked or the redirect removed, no further
  change is needed — the page was already migrated.
- A future increment could reconcile `mobile/app/projection.tsx`'s
  duplicated cash-flow math with `@patrimo/core/realestate`.

## See also

- [ADR 0002](0002-store-manual-prices-in-workbook.md)
- [Manual price persistence](../../packages/core/manual-prices.md)
- [packages/core/ARCHITECTURE.md](../../packages/core/ARCHITECTURE.md)
- [Glossary](../reference/glossary.md)
- `packages/core/src/schema.ts`
- `packages/core/src/property-taxes.ts`
- `packages/core/src/realestate/projection.ts`
- `src/app/immobilier/property-form.tsx`
- `src/app/api/property-taxes/route.ts`
