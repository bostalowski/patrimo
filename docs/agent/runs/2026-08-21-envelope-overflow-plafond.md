# Run: envelope overflow at plafond (2026-08-21)

Branch: `feat/envelope-overflow-plafond` — PR [#59](https://github.com/bostalowski/patrimo/pull/59).

## What shipped

- `projectEnvelopesWithOverflow` in `@patrimo/core` (single-hop surplus → default CTO).
- Web Projection + retirement card consume overflow-aware totals; selector + French banner.
- ADR 0016, glossary term, topic note, FEATURES Projection note.

## Verify (maker)

| Layer | Command | Result |
|---|---|---|
| 1 | `make verify` | pass |
| 2 | `npm test -- packages/core/src/projection` | 7 passed |
| 3 | `make e2e` | 2 passed |

## Checker (re-run 2026-08-21)

| Layer | Command | Result |
|---|---|---|
| 1 | `make verify` | pass (431 tests) |
| 2 | `npm test -- packages/core/src/projection` | 7 passed |
| 3 | `make e2e` | 2 passed |
| CI | PR 59 | `verify` + `e2e` success |

**Verdict: Pass** — scores in `docs/agent/branches/feat-envelope-overflow-plafond/PROGRESS.md`.
