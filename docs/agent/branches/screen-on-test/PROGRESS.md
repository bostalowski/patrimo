# Progress — `screen-on-test`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — ready to merge
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md). Tier A: mark teach-back / Challenger `n/a`.

- Tier: A
- Framer session / date: 2026-09-06
- Challenger: n/a — Tier A harness convention
- Teach-back: n/a — Tier A
- `make branch-ready`: pass (2026-09-06)

## Done (this branch)

- [x] Meaningful DoD/gate slugs (`verify-static` / `verify-behavior` / `verify-e2e`; gates `branch-contract` … `merge`) in CONSTRAINTS, AGENTS, feature-flow, templates, scripts (legacy `Layer N` still parsed).
- [x] Always-on rule `.agents/rules/meaningful-step-names.md` symlinked to Cursor + Claude.
- [x] UI screenshots-in-PR convention: howto, `e2e/pr-screenshot.ts`, property-tax example captures, PR template `## Screenshots`, checklist/CONTRACT pointers.

## RED evidence (when `verify-behavior` applies)

n/a — Tier A

## Last verify

- Command: `make branch-ready` (and `make pr-check` after Checker Pass + rework-log stamp)
- Result: pending until stamped
- Date: 2026-09-06

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

## Checker

- Checker: Pass (2026-09-06)
- Checker evidence: Diff review against harness-only scope — docs/scripts/rules + `e2e/pr-screenshot.ts` + two `capturePrScreenshot` calls in `e2e/property-tax.spec.ts`; no `@patrimo/core` / product UI routes changed. Tier A (`verify-behavior` n/a). Scripts accept both slug and legacy `Layer N` labels. Screenshot path documents assert-then-capture and `PATRIMO_PR_SCREENSHOT_DIR` for PR body PNGs. `make verify` / `make e2e` not re-run in this environment (no `node_modules`); callers should run after `npm ci` before relying on green CI.

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | B | Convention + example wired; runtime verify/e2e deferred to CI / local `npm ci` (env lacks node_modules). |
| Architecture | A | Harness docs/rules/scripts only; helper colocated under `e2e/`; no domain math outside core. |
| Scope discipline | A | Matches CONTRACT file list; no second product feature. |
| Tests / evidence | B | Tier A / no RED; e2e example added; full `make e2e` left to CI. |
| Docs handoff | A | CONTRACT + PROGRESS + howto + template + DOC_MODEL / AGENTS pointers. |

Pass.
