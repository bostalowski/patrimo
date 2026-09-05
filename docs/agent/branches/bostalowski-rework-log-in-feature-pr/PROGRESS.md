# Progress — `bostalowski-rework-log-in-feature-pr`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** Done — pr-check blocks without rework-log row; dogfooding row in this PR.
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md). Tier A: mark teach-back / Challenger `n/a`.

- Tier: A
- Framer session / date: 2026-09-05
- Challenger: n/a
- Teach-back: n/a
- `make branch-ready`: green (2026-09-05) — 10/10
- Checker: Pass (2026-09-05)
- Checker evidence: docs/harness-only; `maker-checker.md` doc-only skip; `npm test -- scripts/pr-check.test.ts` 9/9; `make branch-ready` 10/10; `make pr-check` READY with this slug's rework-log row present.

## Done (this branch)

- [x] `pr-check.sh` §5 fails without slug row
- [x] Tests + docs/ADR/AGENTS/template/skill updated
- [x] Rework-log row for this slug (dogfood)

## RED evidence

n/a — Tier A.

## Last verify

- Command: `npm test -- scripts/pr-check.test.ts`; `make branch-ready`; `make pr-check`
- Result: 9/9 tests; branch-ready 10/10; pr-check READY
- Date: 2026-09-05

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)
