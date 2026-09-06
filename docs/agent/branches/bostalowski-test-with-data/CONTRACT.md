# Contract: Seed sample workbook data for local dev

- Branch: `bostalowski/test-with-data`
- Slug: `bostalowski-test-with-data`
- Matrix row (FEATURES.md): n/a for harness-only
- Cadrage tier: A (Layer 2 `n/a`)
- Challenger: n/a — dev tooling, no ADR / no new sheet / no core math

## Intent

n/a — Tier A

Context (informational, not a Tier B Intent): a fresh checkout has no
`data/config.json` and no `.xlsx` (both gitignored — personal data). Running
`npm run dev` / `npm run electron:dev` then requires a manual detour through
**Réglages** before any portfolio page renders. Goal: auto-provision a
committed sample workbook (fake data) so dev/electron-dev always has
something to look at, without ever touching a real/existing configuration
and without affecting production builds.

## Behavior cases

n/a — Tier A

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | Sample data mechanism | LOCKED | Fixture `.xlsx` committed under `data-fixtures/`, copied into the data dir by a `predev`/`preelectron:dev` script only when no `config.json` exists yet | (a) generate synthetic data on the fly at every dev boot — rejected, non-reproducible; (b) manual `make seed-data` the user runs by hand — rejected, user explicitly wants it automatic |
| D2 | Scope of "docker" | LOCKED | No Dockerfile/compose exists in this repo; user confirmed the request is really about `npm run dev` (and by extension `electron:dev`), not Coast/DinD | n/a — trivial, confirmed with user directly |
| D3 | Release safety | LOCKED | Hook wired only as `predev` / `preelectron:dev` in package.json; never referenced from `build`, `start`, `electron:build`, `electron:pack`, or `make e2e` (Playwright calls `next dev` directly, bypassing npm lifecycle hooks) | n/a — trivial |

## Teach-back

n/a — Tier A

## Scope

- [x] One behavior for this branch: auto-seed a sample workbook + config for local dev only when none is configured yet.
- [x] Files / packages expected to change: `package.json` (predev/preelectron:dev hooks), new `scripts/ensure-dev-data.mjs`, new `scripts/generate-sample-workbook.mjs`, new committed fixture `data-fixtures/sample-portfolio.xlsx`, doc note in `docs/howto/local-dev-setup.md`.

## Verification

- Layer 1: `make verify`
- Layer 2: n/a (no production/domain behavior touched — dev bootstrap script only, runs before the app starts)
- Layer 3: n/a (no web UI / API route / workbook I/O / settings code path changes — script runs outside the app)
- Feature-specific: manual check — fresh `data/` (no `config.json`) + `npm run dev` boots with the sample workbook auto-configured; re-running `npm run dev` with an existing `config.json` leaves it untouched.

## Tranches

| # | Tranche | Behavior cases covered | Layers | PR / commit |
|---|---|---|---|---|
| 1 | Seed sample workbook for dev | n/a | 1 | not yet shipped |

## Exclusions

- Not in this branch: any Dockerfile/docker-compose creation, Coast web service wiring, changes to production/release build scripts, changes to workbook schema.
- Do not refactor unrelated modules.

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; Tier A — RED evidence / teach-back not applicable.

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed (n/a expected)
- [ ] Append / refresh the [rework-log](../../rework-log.md) row **in this PR** via `make rework-log-stamp`; if overlap fires, human yes/no via `make rework-log-propose` (never silent auto-ack)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier A: sections above marked `n/a — Tier A`; `make branch-ready` skips deep checks.
