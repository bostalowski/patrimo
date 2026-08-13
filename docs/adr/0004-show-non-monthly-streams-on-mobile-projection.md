# ADR 0004: Show non-monthly DCA streams on mobile projection

- Status: proposed
- Date: 2026-08-13
- implementation_ready: yes

```text
Contract (do not invent):
- WHEN a mobile Projection envelope card has investment-plan streams with frequency ≠ MENSUEL
- THEN render one badge per such stream under the monthly contribution field, formatted like web (`+ {amount}{suffix}` and ` · {month}` when paymentMonth is set)
- WHEN the envelope has only MENSUEL streams (or none)
- THEN show no extra badge / no empty placeholder
- ELSE keep the monthly field as MENSUEL-only defaults (do not divide annual/quarterly into the monthly input)
- FORBIDDEN converting ANNUEL/TRIMESTRIEL into the monthly input; editing or deleting streams from Projection; changing projection math or `@patrimo/core`
- OPEN (do not implement): none
```

## Context

Mobile Projection already loads DCA configs into `extraStreams` and feeds them into `projectInvestment`. Only `MENSUEL` amounts prefill the « Versement (€ / mois) » field. Annual/quarterly plans (typical for PEE) leave that field at `0` with no visible cue, so users think the contribution is missing.

Web already shows badges for those streams next to the monthly field. Root cause is presentation on mobile, not projection math or workbook data.

Canonical terms: [glossary](../reference/glossary.md) (**Investment plan**, **Extra contribution**).

## Decision

On mobile Projection envelope cards only:

- Pass existing `extraStreams` into the envelope card.
- Under « Versement (€ / mois) », render one badge per non-monthly stream.
- Format locally in the mobile screen (mirror web `formatStream`): `/mois`, `/trim.`, `/an`, plus short French month when `paymentMonth` is set.
- Do not change defaults of the monthly input, projection contributions, or shared core.

## Invariants

- Non-monthly streams remain separate contribution streams in `projectInvestment` (calendar frequency preserved).
- The monthly text field stays MENSUEL-only.
- Badge text matches web semantics for the same stream.
- No badge when `extraStreams` is empty.
- Platform UI owns formatting; `@patrimo/core` is unchanged.

## Options considered

### Option A — Local badges under the monthly field (chosen)

**Advantages**

- Fixes the misunderstanding without touching math.
- Matches web UX users already know.
- Small, testable mobile UI change.

**Disadvantages**

- Light duplication of stream formatting with web.

### Option B — Extract stream formatter into `@patrimo/core`

**Advantages**

- Single formatter for web and mobile.

**Disadvantages**

- Puts French UI labels into shared domain.
- Larger than the reported gap.

### Option C — Prefill monthly with annual/12

**Advantages**

- Field looks “filled”.

**Disadvantages**

- Changes contribution calendar and projection timing.
- Explicitly rejected as a bandage.

## Consequences

### Positive

- Mobile users see annual/quarterly plans (e.g. PEE) on Projection.
- Feature parity for this display gap with web.

### Negative

- Duplicated formatter until a later shared-UI cleanup (out of scope).

### To monitor

- Keep badge format in sync if web `formatStream` changes.

## Uncovered cases

- Editing or removing non-monthly streams from Projection.
- Converting frequencies in the monthly field.
- Web Projection (already shows badges).
- Changing `projectInvestment` or DCA sheet rules.

## Follow-up

None for this decision on the current branch.

## See also

- [Glossary — Extra contribution](../reference/glossary.md)
- [Mobile projection extra contributions](../architecture/mobile-projection-extra-contributions.md)
- [Implement mobile projection extra contributions](../howto/implement-mobile-projection-extra-contributions.md)
- [Platforms](../overview/platforms.md)
- [Key principles](../overview/key-principles.md)
