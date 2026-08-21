# Contract: Branch-scoped harness (CONTRACT + PROGRESS)

- Branch: `feat/branch-scoped-harness`
- Slug: `feat-branch-scoped-harness`
- Matrix row (FEATURES.md): n/a — harness meta

## Scope

- [x] Replace global Open-work queue + `next-feature` claim with per-branch `docs/agent/branches/<slug>/{CONTRACT,PROGRESS}.md`
- [x] Root `FEATURES.md` = capability matrix only; root `PROGRESS.md` = `main` handoff / pointers
- [x] Scripts: `branch-contract`, `branch-status`, `platform-gaps`; deprecate `next-feature`
- [x] `make branch-ready` cadrage gate
- [x] Update AGENTS, CONSTRAINTS, DOC_MODEL, howtos, Cursor skill/rule, cold-start

## Verification

- Layer 1: `make verify` (docs/scripts only — expect green)
- Layer 2: n/a
- Layer 3: n/a
- Feature-specific: `make branch-ready`; `make branch-status`; `make platform-gaps`; `make cold-start`

## Exclusions

- Not in this branch: product features, mobile lint gate, autonomous cron loops
- Do not refactor unrelated modules

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited

## On merge

- [x] Update root FEATURES harness meta rows (`next-feature` → branch-contract) — done on this branch
- [ ] Leave this folder as archive after PR merge
