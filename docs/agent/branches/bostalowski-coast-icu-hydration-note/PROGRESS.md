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

## Checker

- Checker: Pass (2026-09-06)
- Checker evidence: Ran in isolated worktree `/Users/bastien.ostalowski/Workspace/patrimo-bostalowski-coast-icu-hydration-note-checker` (detached HEAD, separate agent session per ADR 0030). `git diff a893a5f HEAD --stat` (merge-base of this branch on main) shows the diff is exactly `.agents/skills/coasts/SKILL.md` (+16), `Coastfile` (1 line changed), this branch's own `CONTRACT.md`/`PROGRESS.md`, and 1 added line in `docs/agent/rework-log.md` — no application code (`src/`, `packages/core`, `scripts/`) touched, matching the CONTRACT's doc/config-only claim. `make setup` (npm ci; node_modules was absent in the fresh worktree) then `make verify` → green: 104 test files / 698 tests passed (lint + typecheck + unit), consistent with the CONTRACT's Layer 1 requirement (Layers 2/3 n/a, Tier A). Read `packages/core/src/format.ts` lines 72-82: `compactPercentFormatter` (used by `formatPercentCompact`, the "+5.2%" example in the SKILL.md text) is hardcoded `new Intl.NumberFormat("fr-FR", {style:"percent", minimumFractionDigits:1, maximumFractionDigits:1})` — confirms the code-side claim is accurate. Ran `node -e "console.log(new Intl.NumberFormat('fr-FR',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1}).format(0.052))"` on host node v22.23.2 → output `5,2 %` (comma decimal), and `Intl.NumberFormat.supportedLocalesOf(['fr-FR'])` → `["fr-FR"]` — confirms this host/worktree Node has full ICU, consistent with (not proof of, since no Coast was available here) the CONTRACT's claim that only the Coast's Alpine/small-icu Node lacks fr-FR data. Noted (non-blocking): `npm ci` printed an `EBADENGINE` warning — repo `package.json` requires `node >=24`, this host is v22.23.2 — pre-existing environment condition, unrelated to this branch's diff, tests still passed.

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | A | `make verify` green (104 files / 698 tests, lint+typecheck+unit); Layer 2/Layer 3 correctly n/a for a Tier A doc/config-only CONTRACT. |
| Architecture | A | No CONSTRAINTS violation; no domain math/rules added outside `@patrimo/core`; new content placed in the correct existing "Patrimo specifics" section of `.agents/skills/coasts/SKILL.md`, right after the related `worktree_dir` bullet it's paired with; references a real, verified file path (`packages/core/src/format.ts`); no new domain concept requiring a glossary entry (it's an infra/testing-environment note, not a product term); D1's reasoning (full-icu's ICU-version-matched data blob + network fetch at install time is fragile; Coast's base Docker image is outside this repo's Coastfile control) is technically sound and not overreaching. |
| Scope discipline | A | `git diff` against the actual merge-base confirms the change is confined to exactly the two files the CONTRACT names (`.agents/skills/coasts/SKILL.md`, `Coastfile`) plus this branch's own CONTRACT/PROGRESS and the required rework-log stamp line — no unrelated refactor, no second feature. |
| Tests / evidence | A | Tier A, Layer 2 n/a, so no RED evidence required; Layer 1 command was actually run here (not just claimed) and is green; the documentation's factual claim was independently sanity-checked (format.ts read, host Node ICU probe) rather than taken on faith. |
| Docs handoff | A | Branch PROGRESS carries Done items, Tier/cadrage fields, and a `make verify` record; `docs/agent/rework-log.md` was stamped with this branch's row (Touched paths, Reworked?=no) in the same commit set. |

Pass.
