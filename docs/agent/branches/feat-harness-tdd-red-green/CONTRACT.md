# Contract: Harness RED → GREEN for behavior work

- Branch: `feat/harness-tdd-red-green`
- Slug: `feat-harness-tdd-red-green`
- Matrix row (FEATURES.md): n/a — harness-only (agent DoD / session discipline)

## Scope

- [x] **One behavior:** when Layer 2 applies, makers MUST follow RED → GREEN (failing targeted test for the right reason before production code) under the branch CONTRACT; checker can Fail without RED evidence.
- [x] Files expected to change:
  - `CONSTRAINTS.md` — hard MUST §24 for RED before prod when Layer 2 applies
  - `docs/howto/tdd-red-green.md` — procedure (gate RED, slices, exemptions, commands)
  - `AGENTS.md`, `.cursor/rules/harness.mdc`, `.cursor/skills/patrimo-harness/SKILL.md` — lifecycle mirrors
  - `docs/howto/agent-loop.md`, `docs/howto/maker-checker.md` — loop + checker mention
  - `docs/agent/scoring-rubric.md` — Tests / evidence scores RED proof
  - `docs/agent/branches/_templates/CONTRACT.md`, `PROGRESS.md` — Layer 2 cases + RED evidence
  - `docs/agent/branches/README.md`, `docs/agent/runs/README.md`, `docs/DOC_MODEL.md` — pointers
  - External SDD skill: skipped (not in this repo; howto notes SDD remains opt-in)

## Verification

- Layer 1: `make verify`
- Layer 2: n/a (docs / harness procedure only — no product behavior)
- Layer 3: n/a
- Feature-specific: `make branch-ready` Pass; links from AGENTS → howto resolve

## Exclusions

- Not in this branch: full Spec-Driven Development (SPEC LOCK, Diátaxis package, autonomous commit/push/PR)
- Do not change `@patrimo/core`, web UI, mobile, e2e, or FEATURES matrix
- Do not force RED for Layer 2 `n/a` work (docs, harness tooling, pure refactor, styling, spikes)
- Do not invent sheet names / domain rules

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; CONSTRAINTS + howto + mirrors consistent

## On merge

- [ ] FEATURES.md: n/a (no platform status change)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)
