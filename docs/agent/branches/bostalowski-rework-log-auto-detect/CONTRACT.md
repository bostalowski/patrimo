# Contract: Rework-log auto-detect (Touched + overlap gate)

- Branch: `bostalowski/rework-log-auto-detect`
- Slug: `bostalowski-rework-log-auto-detect`
- Matrix row (FEATURES.md): n/a — harness-only
- Cadrage tier: A (Layer 2 `n/a`)
- Challenger: n/a

## Intent

n/a — Tier A

## Behavior cases

n/a — Tier A

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | How to record follow-up fixes without human memory | LOCKED | Path fingerprint `Touched` + overlap fail + human yes/no via `make rework-log-propose` (`yes` or `n/a — not a rework`) | Silent markdown edit; agent auto-ack without asking |


## Teach-back

n/a — Tier A

## Scope

- [x] Harness: stamp Touched from diff; pr-check fails on unreworked path overlap
- [x] Files: `scripts/lib/rework-log.mjs`, `scripts/pr-check.sh`, Makefile, rework-log.md, ADR 0026 / howto / templates

## Verification

- Layer 1: `make verify` (or targeted `npm test -- scripts/rework-log.test.ts scripts/pr-check.test.ts`)
- Layer 2: n/a — Tier A
- Layer 3: n/a — harness scripts only

## Tranches

| # | Tranche | Behavior cases covered | Layers | PR / commit |
|---|---|---|---|---|
| 1 | Stamp + overlap gate + docs | n/a | 1 | this PR |

## Exclusions

- Not in this branch: changing how FEATURES matrix works; rewriting historical taxe foncière rows beyond Touched backfill
- Do not refactor unrelated modules

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when Layer 2 applied; Tier B teach-back / cadrage lock recorded when Layer 2 applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed
- [x] Append / refresh the [rework-log](../../rework-log.md) row **in this PR** via `make rework-log-stamp`; if overlap fires, human yes/no via `make rework-log-propose` (never silent auto-ack)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier A: Intent/cases/teach-back n/a; decisions locked above; `make branch-ready` before claiming done.
