# Run: envelope overflow at plafond (2026-08-21)

Branch: `feat/envelope-overflow-plafond` — maker pass.

## What shipped

- `projectEnvelopesWithOverflow` in `@patrimo/core` (single-hop surplus → default CTO).
- Web Projection + retirement card consume overflow-aware totals; selector + French banner.
- ADR 0016, glossary term, topic note, FEATURES Projection note.

## Verify

| Layer | Command | Result |
|---|---|---|
| 1 | `make verify` | pass |
| 2 | `npm test -- packages/core/src/projection` | 7 passed |
| 3 | `make e2e` | 2 passed |

## Next

Checker session against branch CONTRACT + scoring rubric before merge/PR.
