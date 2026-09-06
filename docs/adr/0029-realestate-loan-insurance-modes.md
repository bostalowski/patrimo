# ADR 0029: Borrower-insurance modes and Assurance emprunt paliers

- Status: accepted
- Date: 2026-09-05
- Supersedes-in-part: [ADR 0028](0028-realestate-projection-reliability.md) — insurance clause only

## Context

ADR 0028 locked borrower insurance to **CRD × taux / 12**. Real contracts often
use a flat rate on initial capital, a fixed €/month premium, or an age/schedule
ladder that **rises** over the loan. Users could not enter their real schedule,
so cash-flow and TRI projections silently diverged from the bank échéancier.

## Decision

1. **Modes** on each Immobilier row (`modeAssurance`): `CRD` (default) |
   `CAPITAL_INITIAL` | `MONTANT_FIXE`, plus column **Assurance mensuelle (€)**
   used only for `MONTANT_FIXE`.
2. **Optional sheet** **Assurance emprunt** (`Bien`, `Année début`,
   `Assurance mensuelle (€)`) stores sparse annual paliers. Invalid rows
   (`anneeDebut < 1` or amount ≤ 0) are rejected; duplicate `Bien`+`Année début`
   → last row in sheet order wins.
3. **Precedence**: if a property has ≥ 1 valid palier, the step lookup
   overrides the formula mode for every month while the loan remaining > 0.
4. **Credit-year index** (canonical): `year = Math.floor(monthsElapsed / 12) + 1`
   with `monthsElapsed` 0-based since `dateDebutCredit` (same as `monthsSince`).
5. **Single core API**: `monthlyInsuranceForLoan` / `buildLoanSchedule` /
   `projectProperty` share the formula; web and mobile serializers both hydrate
   modes + paliers (mobile read-only CRUD this branch).
6. Shared disclaimer `REAL_ESTATE_ASSUMPTIONS_FR` describes modes + paliers;
   UI surfaces the active rule per property via `loanInsuranceRuleLabelFr`.

## Invariants

- Domain insurance math MUST live in `@patrimo/core` (CONSTRAINTS §6–§8).
- Paliers MUST override mode when present (no merge/max with formula).
- Legacy workbooks without Mode / Assurance emprunt MUST behave as ADR 0028
  CRD + `tauxAssurance`.
- Mobile Immobilier CRUD for modes/paliers is out of scope; serializer parity
  is in scope.

## Options considered

### Keep CRD-only (ADR 0028)

**Advantages**: Simple.  
**Disadvantages**: Wrong for group policies and rising schedules.

### Fourth mode `CALENDRIER` required before reading the sheet

**Advantages**: Explicit.  
**Disadvantages**: Extra click; empty calendrier vs missing sheet ambiguity.
Rejected in favor of automatic override when paliers exist.

### JSON in Notes / one column per year

**Advantages**: No new sheet.  
**Disadvantages**: Unreadable in Excel; brittle.

## Consequences

- New Immobilier columns + sheet **Assurance emprunt** in the workbook template.
- ADR 0028 insurance clause superseded-in-part; rent/CAGR/TRI/single-engine
  clauses unchanged.
- Web property form edits mode, forfait, and paliers; mobile reads them.

## Uncovered cases

Age-auto barème, PDF import, quotités, multi-emprunteur, monthly (non-annual)
palier rows, mobile Immobilier edit UI.

## Follow-up

None required for this decision.

## See also

- Branch contract: `docs/agent/branches/feat-realestate-loan-insurance-modes/`
- [ADR 0028](0028-realestate-projection-reliability.md)
- `packages/core/src/realestate/insurance.ts`
