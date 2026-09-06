# Progress — `bostalowski-coast-icu-hydration-note`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — done
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md). Tier A: mark teach-back / Challenger `n/a`.

- Tier: A
- Framer session / date: 2026-09-06 (this session)
- Challenger: n/a — trivial doc-only change
- Teach-back: n/a — Tier A
- `make branch-ready`: pending

## Done (this branch)

- [x] Documented the Coast Alpine/small-icu French-locale hydration quirk in `.agents/skills/coasts/SKILL.md` (Patrimo specifics), with the live diagnosis evidence (`supportedLocalesOf(["fr-FR"])` → `[]`, resolved locale `en-US` inside the Coast; full ICU confirmed on host).
- [x] Kept the `Coastfile` `worktree_dir` addition for Orca (`~/orca/workspaces/patrimo/<name>`) that `coast run` had already written locally but left uncommitted.
- [x] Checker skipped (trivial doc-only, per maker-checker.md exception).

## RED evidence (when Layer 2 applies)

n/a — Tier A, Layer 2 not applicable (doc/config only).

## Last verify

- Command: `make verify`
- Result: pass
- Date: 2026-09-06

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)
