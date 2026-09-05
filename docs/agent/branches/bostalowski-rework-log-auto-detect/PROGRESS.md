# Progress — `bostalowski-rework-log-auto-detect`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** ship stamp + overlap gate
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md). Tier A: mark teach-back / Challenger `n/a`.

- Tier: A
- Framer session / date: 2026-09-05 (same session as Maker — Tier A harness)
- Challenger: n/a
- Teach-back: n/a
- `make branch-ready`: 2026-09-05 PASS (10/10)

## Done (this branch)

- [x] `scripts/lib/rework-log.mjs` — stamp / check-own / check-overlap
- [x] Wire `make pr-check` §5–6 + `make rework-log-stamp`
- [x] Tests: `scripts/rework-log.test.ts` + updated `pr-check.test.ts`
- [x] Migrate `rework-log.md` (Touched column); mark overlapping prior harness rows `Reworked?=yes`
- [x] ADR 0026 / AGENTS / feature-flow / templates / skill
- [x] `make rework-log-propose` — human yes/no (or REWORK_ACK after explicit answer); agents must not auto-ack
- [x] `make rework-log-stamp` for this slug

## Checker

- Checker: Pass (2026-09-05)
- Checker evidence: `npm test -- scripts/rework-log.test.ts scripts/pr-check.test.ts` (15 passed, including propose yes/no/non-TTY); human-ack flow documented in rework-log.md + ADR 0026 + skill; Tier A Layer 2 n/a; `make branch-ready` previously 10/10.

## RED evidence (when Layer 2 applies)

n/a — Tier A

## Last verify

- Command: `npm test -- scripts/rework-log.test.ts scripts/pr-check.test.ts`
- Result: 12 passed
- Date: 2026-09-05

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)
