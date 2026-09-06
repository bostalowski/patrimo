# Contract: Meaningful gate slugs + UI screenshots in PR descriptions

- Branch: `screen-on-test`
- Slug: `screen-on-test`
- Matrix row (FEATURES.md): n/a for harness-only
- Cadrage tier: A (`verify-behavior` `n/a`)
- Challenger: n/a — harness/docs convention, no new product ADR / sheet / core math

## Intent

n/a — Tier A

Context (informational): harness steps were referred to as opaque `Layer N` /
`G#` codes; agents and humans need meaningful slugs. Separately, web UI PRs
need Playwright review screenshots embedded in the PR description.

## Behavior cases

n/a — Tier A

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | DoD / gate naming | LOCKED | Rename to meaningful slugs (`verify-static` / `verify-behavior` / `verify-e2e`; gates `branch-contract` … `merge`); keep legacy `Layer N` parse in scripts for old CONTRACTs | Keep `Layer N`/`G#` only — rejected (opaque; violates readable-references) |
| D2 | PR screenshots | LOCKED | Playwright `capturePrScreenshot` after asserts; `## Screenshots` in PR template; PNGs under `docs/agent/branches/<slug>/ui/` via `PATRIMO_PR_SCREENSHOT_DIR` | Pixel regression `toHaveScreenshot` — rejected (flaky baselines, out of scope); CI artifacts only — rejected (not durable in PR body) |

## Teach-back

n/a — Tier A

## Scope

- [x] One behavior for this branch: (1) meaningful slugs for DoD bands + feature-flow gates across harness docs/scripts/rules; (2) UI screenshot convention for PR descriptions (howto, helper, property-tax example, template section).
- [x] Files / packages expected to change: `.agents/rules/`, `.claude/rules/`, `.cursor/rules/`, AGENTS.md, CONSTRAINTS.md, docs/howto/*, docs/DOC_MODEL.md, docs/agent/branches/_templates/*, `.github/pull_request_template.md`, scripts/{branch-ready,flow-status,pr-check}.sh, e2e/pr-screenshot.ts, e2e/property-tax.spec.ts, `.agents/skills/patrimo-harness/SKILL.md`.

## Verification

- `verify-static`: `make verify`
- `verify-behavior`: n/a
- `verify-e2e`: `make e2e` (touched e2e helper + property-tax captures; no product UI change)
- Screenshots: n/a — this PR ships the convention; no product UI surface to show
- Feature-specific: `make branch-ready` + `make pr-check` green after CONTRACT/PROGRESS filled

When `verify-behavior` applies, makers follow [tdd-red-green.md](../../howto/tdd-red-green.md) (CONSTRAINTS §24).
Tier B cadrage: [cadrage-lock.md](../../howto/cadrage-lock.md) (CONSTRAINTS §25) before Maker.

## Tranches

| # | Tranche | Behavior cases covered | Verify bands | PR / commit |
|---|---|---|---|---|
| 1 | Slugs + screenshot convention | n/a | verify-static, verify-e2e | not yet shipped |

## Exclusions

- Not in this branch: visual regression baselines; enforcing screenshots in `pr-check` as a hard fail; product UI features.
- Do not refactor unrelated modules.

## Checker

- [x] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when `verify-behavior` applied; Tier B teach-back / cadrage lock recorded when `verify-behavior` applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed (n/a expected)
- [ ] Append / refresh the [rework-log](../../rework-log.md) row **in this PR** via `make rework-log-stamp`
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier A: sections above marked `n/a — Tier A`; `make branch-ready` skips deep checks.
