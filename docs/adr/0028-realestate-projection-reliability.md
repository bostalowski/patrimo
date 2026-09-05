# ADR 0028: Indicative real-estate projection model (clarity + single core)

- Status: accepted (superseded-in-part by [ADR 0029](0029-realestate-loan-insurance-modes.md) — insurance clause)
- Date: 2026-09-02
- Superseded-by: [ADR 0029](0029-realestate-loan-insurance-modes.md) (insurance clause only)

## Context

Real-estate projections lived in `@patrimo/core` (`realestate/*`) but were
under-tested, used misleading labels (« rendement net » for cash-on-cash),
charged loan insurance on initial principal, left rents unindexed while
property value grew, exposed only a terminal CAGR, and were reimplemented with
simplified formulas on mobile. Users could not trust or compare web vs mobile
figures.

Tax figures remain **indicative** ([CONSTRAINTS.md](../../CONSTRAINTS.md) §3).

## Decision

1. **Single engine**: web and mobile consume `projectProperty` /
   `propertySnapshot` / `currentEquity` from `@patrimo/core` for immobilier KPIs.
2. **Labels**: « rendement brut » unchanged; former « rendement net » displayed
   as **cash-on-cash après impôt**; expose **CAGR** and annual **TRI (IRR)**
   distinctly (`cagr` / `irr`; `annualizedReturn` kept as alias of `cagr`).
3. **Insurance** *(superseded-in-part by ADR 0029)*: monthly assurance was
   CRD × (tauxAssurance / 12). See ADR 0029 for modes (CRD / capital initial /
   forfait) and optional **Assurance emprunt** paliers.
4. **Rent indexing**: loyers, taxe foncière, charges non récup. indexed by
   `rentIndexRate` (default = property / override revalo); `0` freezes. Not
   legal IRL. Gestion stays % of indexed rent.
5. **Fiscal warnings** (non-blocking; tax amounts unchanged): micro-foncier
   15 000 €, micro-BIC 77 700 €, déficit foncier imputation globale 10 700 €/an.
6. **Detention SCI/DIRECT**: UI metadata only; no fiscal effect (regime drives
   tax). Shared disclaimer `REAL_ESTATE_ASSUMPTIONS_FR`.
7. **Retirement cash-flow**: keep last projected year ÷ 12 (documented).

## Invariants

- Domain math for real estate MUST live in `@patrimo/core` (CONSTRAINTS §6–§7).
- No new workbook insurance-mode or IRL columns in this decision.
- Warnings MUST NOT alter `annualTax` / `resaleTax` amounts.

## Options considered

### Misleading labels only (docs / copy)

**Advantages**: Fast.  
**Disadvantages**: Mobile divergence and CRD/rent bias remain — false confidence.

### Full fiscal engine (IFI, barème foyer, SCI IS liquidation)

**Advantages**: Closer to filing.  
**Disadvantages**: Contradicts indicative-tax constraint; huge scope.

### Chosen: honesty + core parity + CRD insurance + rent index + CAGR/TRI + warnings

**Advantages**: Comparable platforms, clearer metrics, material formula fixes.  
**Disadvantages**: Revalo still couples value appreciation and rent index unless
`rentIndexRate` is overridden; still not a filing engine.

## Consequences

- Mobile Projection › Immobilier and Investissements › Immo must not keep
  parallel CRD / equity formulas.
- Tests under `packages/core/src/realestate/*.test.ts` guard loan, tax helpers,
  indexing, insurance, and returns.
- UI surfaces share `REAL_ESTATE_ASSUMPTIONS_FR`.

## Uncovered cases

- IFI, CSG déductible nuance, surtaxe PV, household progressive IR, fine SCI IS
  liquidation, workbook IRL column, changing retirement CF year selection.

## Follow-up

- Optional separate IRL field in workbook if product wants value ≠ rent index.
- Optional hard-cap of déficit in `annualTax` (would be a new ADR).

## See also

- Branch CONTRACT: `docs/agent/branches/feat-realestate-projection-reliability/`
- [CONSTRAINTS.md](../../CONSTRAINTS.md) §3, §6–§7
- Glossary: Real-estate cash-on-cash, Real-estate CAGR, Real-estate TRI
