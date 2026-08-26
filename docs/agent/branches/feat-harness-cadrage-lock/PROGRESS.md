# Progress — `feat-harness-cadrage-lock`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** Implementation complete — await checker Pass
- **Blocked:** none

## Cadrage lock

- Tier: A
- Framer: planning chat (user confirmed solutions 1+2+3) — 2026-08-26
- Challenger: n/a (Tier A / harness meta)
- Teach-back: n/a (Tier A)
- `make branch-ready`: Pass 10/10 (Tier A)

## Done (this branch)

- [x] Branch + CONTRACT (Tier A, D1–D5 locked)
- [x] `docs/howto/cadrage-lock.md` + Framer / Challenger / teach-back prompts
- [x] CONTRACT + PROGRESS templates (Intent, cases, decisions, teach-back, cadrage lock)
- [x] `scripts/branch-ready.sh` Tier A/B gates (teach-back / Challenger header-only match)
- [x] CONSTRAINTS §25; AGENTS; harness rule/skill; branches README; maker-checker; agent-loop; tdd-red-green; DOC_MODEL; scoring-rubric; runs README
- [x] Smoke: Tier A Pass; Tier B Fail without teach-back; Tier B Pass with teach-back accepted
- [x] `make verify` green

## RED evidence (when Layer 2 applies)

Skip — Layer 2 is `n/a`.

## Last verify

- Command: `make verify`; `make branch-ready` (Tier A + Tier B smokes)
- Result: verify pass; branch-ready Tier A 10/10; Tier B teach-back gate behaves as designed
- Date: 2026-08-26

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)
Procedure: [docs/howto/cadrage-lock.md](../../howto/cadrage-lock.md)

Checker still open per CONTRACT (fresh session). FEATURES.md unchanged on merge.
