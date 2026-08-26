# Contract: Harness cadrage lock (Intent, teach-back, Framer ≠ Maker)

- Branch: `feat/harness-cadrage-lock`
- Slug: `feat-harness-cadrage-lock`
- Matrix row (FEATURES.md): n/a — harness-only
- Cadrage tier: **A** (Layer 2 `n/a` — docs / scripts / skill only)
- Challenger: n/a (harness meta; decisions already locked with user in planning chat)

## Intent

- n/a — Tier A (harness procedure). Goal: institutionalize Intent + decisions + teach-back + Framer/Challenger so Tier B product work cannot skip exploration or human alignment before coding.

## Behavior cases

- n/a — Tier A (no product behavior / no RED → GREEN)

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | Where cadrage lives | **LOCKED** | Enrich branch `CONTRACT.md` (+ PROGRESS lock lines); no parallel SPEC.md | Separate SPEC.md (rejected: dual source of truth) |
| D2 | Tiering | **LOCKED** | Tier A = Layer 2 `n/a` → skip Intent/decisions/teach-back; Tier B = behavior → require them | Always require full cadrage (rejected: too heavy for docs/spikes) |
| D3 | Challenger gate | **LOCKED** | Required only when CONTRACT says `Challenger: required` (ADR / new sheet / structuring core math); else recommended | Always require Challenger (rejected: overhead on simple UI parity) |
| D4 | Teach-back proof | **LOCKED** | Human accepts 3–5 scenarios; record in PROGRESS `Teach-back: accepted` (or CONTRACT section); `branch-ready` fails Tier B without it | Agent self-confirm (rejected: no alignment proof) |
| D5 | Full SDD | **LOCKED** | Remains opt-in outside harness; howto points at SDD but does not require Diátaxis package or autonomous commit/push | Adopt full SDD as default (rejected: DOC_MODEL + commit rules friction) |

## Teach-back

- n/a — Tier A

## Scope

- [x] **One behavior:** when Layer 2 applies (Tier B), makers MUST NOT code until Intent + behavior cases + decisions LOCKED + teach-back accepted + `make branch-ready`; Framer ≠ Maker; Challenger when CONTRACT requires it.
- [x] Files expected to change:
  - `docs/howto/cadrage-lock.md` — procedure + paste prompts (Framer / Challenger / teach-back)
  - `docs/agent/branches/_templates/CONTRACT.md`, `PROGRESS.md`
  - `scripts/branch-ready.sh` — Tier A/B gates
  - `CONSTRAINTS.md` §25; `AGENTS.md`; `.cursor/rules/harness.mdc`; `.cursor/skills/patrimo-harness/SKILL.md`
  - `docs/agent/branches/README.md`; `docs/howto/maker-checker.md`; `docs/howto/agent-loop.md`; `docs/howto/tdd-red-green.md`
  - `docs/DOC_MODEL.md`; `docs/agent/scoring-rubric.md`

## Verification

- Layer 1: `make verify`
- Layer 2: n/a (docs / harness procedure only)
- Layer 3: n/a
- Feature-specific:
  - `make branch-ready` Pass on this Tier A CONTRACT
  - Tier B smoke: temporary CONTRACT missing teach-back / with OPEN decision → `branch-ready` Fail; restore after
  - Links from AGENTS → `cadrage-lock.md` resolve

## Exclusions

- Not in this branch: full Spec-Driven Development (SPEC LOCK, Diátaxis package, autonomous commit/push/PR)
- Not in this branch: product / `@patrimo/core` / UI / e2e / FEATURES matrix changes
- Do not backfill archived branch CONTRACTs
- Do not edit external `~/.claude/skills/spec-driven-development`

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; CONSTRAINTS + howto + mirrors consistent

## On merge

- [ ] FEATURES.md: n/a
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Decisions D1–D5 locked with user (planning). Tier A — `make branch-ready` before implementing.
