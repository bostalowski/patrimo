<!--
Gate reference: docs/howto/feature-flow.md (slugs: branch-contract … merge),
docs/howto/pr-checklist.md. `make pr-check` checks this mechanically — the CI
`harness` job replays it on every push to this PR. Fill what applies; leave n/a
where a CONTRACT is Tier A or this PR is not tranche-based.
-->

## Summary

<!-- What this PR does and why. -->

## CONTRACT / tranche

- CONTRACT: `docs/agent/branches/<slug>/CONTRACT.md`
- Tranche: <!-- e.g. "2/6" or "n/a — single-tranche Tier A change" -->
- Behavior-case IDs covered (from CONTRACT's Tranches table): <!-- e.g. N1, N2, E1 -->

## Cadrage (Tier B only — see docs/howto/cadrage-lock.md)

- [ ] `make branch-ready` green
- [ ] Teach-back accepted (recorded in branch PROGRESS)
- [ ] Challenger Pass recorded, if CONTRACT says `Challenger: required`

## RED → GREEN evidence (Tier B only — see docs/howto/tdd-red-green.md)

<!-- Link or paste the RED evidence block(s) in branch PROGRESS for the case(s) this PR closes. -->

## Verify

- [ ] `verify-static`: `make verify`
- [ ] `verify-behavior` (if applicable): targeted test command — <!-- npm test -- <path> -->
- [ ] `verify-e2e` (if web UI / API / workbook I/O / settings changed): `make e2e`
- [ ] `make gauntlet` green (test-removal guard + scoped mutation on `@patrimo/core` diffs)

## Screenshots

<!-- Required when this PR changes web UI (`verify-e2e`). Otherwise: n/a.
     Procedure: docs/howto/ui-screenshots-in-pr.md
     Capture after green Playwright asserts via capturePrScreenshot (e2e/pr-screenshot.ts).
     Prefer PNGs under docs/agent/branches/<slug>/ui/ (PATRIMO_PR_SCREENSHOT_DIR=… make e2e)
     and embed with markdown, or drag-drop / paste into this description. -->

- [ ] `n/a` — no web UI change
- [ ] Screenshots of the changed screens / states are embedded below

<!-- Paste or link images here:


-->

## Checker (docs/howto/maker-checker.md)

- [ ] `make checker` Pass recorded in branch PROGRESS, dated on/after the latest commit, with cited evidence

## Exclusions

<!-- What this PR deliberately does not do, per the CONTRACT's Exclusions section. -->
