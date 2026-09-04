<!--
Gate reference: docs/howto/feature-flow.md (G0-G7), docs/howto/pr-checklist.md.
`make pr-check` checks this mechanically — the CI `harness` job replays it on
every push to this PR. Fill what applies; leave n/a where a CONTRACT is
Tier A or this PR is not tranche-based.
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

- [ ] Layer 1: `make verify`
- [ ] Layer 2 (if applicable): targeted test command — <!-- npm test -- <path> -->
- [ ] Layer 3 (if web UI / API / workbook I/O / settings changed): `make e2e`
- [ ] `make gauntlet` green (test-removal guard + scoped mutation on `@patrimo/core` diffs)

## Checker (docs/howto/maker-checker.md)

- [ ] `make checker` Pass recorded in branch PROGRESS, dated on/after the latest commit, with cited evidence

## Exclusions

<!-- What this PR deliberately does not do, per the CONTRACT's Exclusions section. -->
