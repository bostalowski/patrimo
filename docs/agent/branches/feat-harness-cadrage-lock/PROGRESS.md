# Progress — `feat-harness-cadrage-lock`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — re-checker **Pass** 2026-08-26
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
- [x] Checker Fail 2026-08-26 (Intent stub-skip) — follow-up applied
- [x] Fix Intent check: filled template bullets count (empty stubs still Fail)
- [x] Align D4 + cadrage-lock: teach-back proof PROGRESS-only
- [x] CONTRACT scope lists `docs/agent/runs/README.md`; Verification lists template-style Pass smoke

## RED evidence (when Layer 2 applies)

Skip — Layer 2 is `n/a`.

## Last verify

- Date: 2026-08-26 (re-checker)
- `make verify`: Pass (77 files / 512 tests)
- `make branch-ready` Tier A: Pass 10/10
- Tier B smokes re-run by checker (temp fixtures restored):
  - Empty template Intent stubs → Fail (MISS fill Intent) — exit 2
  - Filled Intent, Teach-back pending → Fail (MISS teach-back) — exit 2
  - Filled Intent, D1 OPEN, Teach-back accepted → Fail (MISS OPEN) — exit 2
  - Filled Intent + Teach-back accepted + LOCKED → Pass 14/14 — exit 0
- AGENTS → `docs/howto/cadrage-lock.md`: resolves

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)
Procedure: [docs/howto/cadrage-lock.md](../../howto/cadrage-lock.md)

FEATURES.md unchanged on merge.

## Checker (2026-08-26)

Role: distinct checker role. First Pass: **Fail** (Correctness C — Intent stub-skip).

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | **C** | Intent filled with template prefixes still MISSed (`scripts/branch-ready.sh` stub regex). |
| Architecture | **B** | D4 / howto allowed CONTRACT-section teach-back; gate greps PROGRESS only. |
| Scope discipline | **B** | `docs/agent/runs/README.md` not in CONTRACT file list. |
| Tests / evidence | **B** | Pass-path smoke incomplete vs template UX. |
| Docs handoff | **B** | PROGRESS present; Tier A OK. |

**Verdict: Fail** — see follow-up below (applied by Maker same day).

### Maker follow-up (required) — done

1. [x] Fix Intent emptiness check so filled template bullets count (skip only empty `…:` stubs).
2. [x] Re-smoke: empty stubs Fail; missing teach-back Fail; OPEN Fail; template-filled + accepted + LOCKED Pass; restore.
3. [x] Align D4 / howto wording with PROGRESS-only teach-back grep; list `runs/README.md` in CONTRACT scope.

### Re-checker (2026-08-26) — **Pass**

Role: distinct checker (this session). No feature code written.

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | **A** | `make verify` 77/512; Tier A `branch-ready` 10/10; Tier B smokes exit 2 / 2 / 2 / 0 as CONTRACT Verification lists; Intent stub-skip fixed (`scripts/branch-ready.sh` L154–174). |
| Architecture | **A** | D4 + `cadrage-lock.md` + gate agree PROGRESS-only teach-back; CONSTRAINTS §25; no domain math outside core. |
| Scope discipline | **A** | Harness docs/scripts only; exclusions (no product/core/UI/FEATURES/SDD) held; `runs/README.md` listed in CONTRACT scope. |
| Tests / evidence | **A** | Layer 2 `n/a`; feature-specific smokes re-executed by checker with cited exits; PROGRESS records them. |
| Docs handoff | **A** | PROGRESS + CONTRACT checker boxes updated; FEATURES n/a. |

**Verdict: Pass**
