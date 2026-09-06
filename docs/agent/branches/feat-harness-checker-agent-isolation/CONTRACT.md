# Contract: Checker agent isolation (subagent / fresh session)

- Branch: `feat/harness-checker-agent-isolation`
- Slug: `feat-harness-checker-agent-isolation`
- Matrix row (FEATURES.md): Maker / checker howto — harness meta
- Cadrage tier: B (behavior)
- Challenger: required — new ADR superseding-in-part ADR 0026 Checker isolation clause

## Intent

- Symptom (who / when / pain): After `make checker`, the **same Maker agent** often keeps scoring in the same session. The plain git worktree does not stop that — isolation is self-declared (“paste into a fresh session”) and easy to skip. Checkers pass on Maker rationalizations.
- Suspected cause (`fact`): ADR 0026 / `role-worktree.sh` treat the **worktree** as the isolation mechanism; they print a paste-prompt and enforce PROGRESS-only writes, but never require a **separate agent process**. (`fact` — script + howto review 2026-09-06; human critique: constraint is the agent, not the worktree)
- Lever (where we act on the cause): Redefine Checker isolation as **agent identity** (subagent / Task / fresh empty-context session) with the worktree as **write sandbox + handoff surface** only; update CONSTRAINTS, ADR, howtos, harness skill, and `make checker` output so the Maker must spawn a separate agent and must not self-grade.
- Success signal (observable): (1) `make checker` stdout mandates a separate agent and forbids Maker-session grading; (2) docs/skill/CONSTRAINTS say the same; (3) ADR 0030 accepted, ADR 0026 marked superseded-in-part on the Checker isolation clause; (4) unit tests on `role-worktree.sh` lock the mandate wording.
- Band-aid risk (if we only treat the symptom): Stronger “please paste in a new chat” wording without naming agent spawn still leaves same-session self-check as the default path.

## Behavior cases

### Nominal

- [x] N1: If Maker runs `make checker` on a feature branch, then stdout states that a **separate agent** (subagent / Task / fresh empty-context session) must score, that the Maker session **must not** grade, and prints the worktree path as that agent’s working directory.
- [ ] N2: If Maker runs `make checker`, then stdout still prints the Checker prompt verbatim from `docs/agent/scoring-rubric.md` (no prompt duplication in the script — ADR 0026 prompt single-source rule). *(preserved — existing prompt-verbatim unit test; no new RED this branch)*
- [ ] N3: If the separate Checker agent finishes and only `PROGRESS.md` changed in the worktree, then `scripts/role-worktree.sh checker --publish <wt>` copies that file back (unchanged publish-scope contract: PROGRESS only). *(preserved — existing publish-scope unit tests; no new RED)*
- [ ] N4: If harness docs / skill / CONSTRAINTS §22–§27 describe Checker isolation, then they state **agent isolation first**, worktree as write sandbox — not worktree-alone as sufficient freshness. *(docs/ADR; Checker review)*

### Edge

- [ ] E1: If the tool has no Task/subagent API (raw terminal, another IDE), then a **fresh empty-context agent session** opened on the worktree path still satisfies the mandate (portable fallback; no Cursor-only hard dependency). *(docs; Checker review)*
- [ ] E2: If Maker continues scoring in the same session after `make checker`, that is a harness violation (CONSTRAINTS) even when the worktree exists — docs must say so explicitly. *(CONSTRAINTS + howto; Checker review)*
- [ ] E3: If `make checker` runs on `main` / `master`, it still refuses (unchanged). *(preserved — existing main-refusal unit test; no new RED)*

### Out of scope

- [ ] Explicitly not in this branch: auto-spawning a Cursor/Orca/Coast agent from the shell script (tool-specific); changing Framer/Challenger spawn automation beyond aligning wording; machine-proving that the scorer’s process id ≠ Maker’s; rewriting gauntlet / pr-check RED evidence rules.

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 — Isolation primitive | What counts as Checker freshness | LOCKED | Separate **agent** (subagent / Task / fresh empty-context session); worktree = write sandbox + publish surface | Worktree-alone (ADR 0026 status quo); same-session role switch with a magic phrase |
| D2 — Script vs skill spawn | Who launches the agent | LOCKED | Script prepares worktree + prints mandate + prompt; **Maker’s host agent** (or human) spawns the separate agent per skill/howto — script stays plain git (no IDE preference) | Shell auto-spawn via `cursor`/`orca` CLI (rejected — tool lock-in; ADR 0026 non-goal) |
| D3 — ADR | How to record the course change | LOCKED | New accepted ADR **0030** superseding-in-part ADR **0026** Checker isolation clause only; ADR 0026 gets Status/Superseded-by line | Edit ADR 0026 in place (rejected — append-only); docs-only without ADR (rejected — CONSTRAINTS §27 cites 0026) |
| D4 — Tranche shipping | How this lands | LOCKED | One PR (single tranche) | Stacked PRs |

## Teach-back

- [x] Scenario 1: Maker finishes verify, runs `make checker`. Stdout says do not score here — spawn a separate agent in `../patrimo-<slug>-checker`. Maker launches Task/subagent with the printed prompt. Subagent writes only PROGRESS. Maker publishes. Same-session Pass line = violation.
- [x] Scenario 2: Agent in a tool without Task API runs `make checker`, opens a **new** empty chat pointed at the worktree, pastes the prompt, scores, publishes. Satisfies E1.
- [x] Scenario 3: Worktree already exists from a prior checker run; `make checker` reuses it; mandate text still appears; Maker still must spawn a separate agent (not reuse Maker context).
- [x] Scenario 4: Checker subagent edits `packages/core/...` in the worktree; `--publish` fails (publish-scope guard unchanged).

## Scope

- [x] One behavior for this branch: Require Checker **agent** isolation (subagent / fresh session); keep worktree as write sandbox; document + script mandate + ADR 0030.
- [x] Files / packages expected to change: `scripts/role-worktree.sh` (+ test), `CONSTRAINTS.md`, `AGENTS.md`, `docs/howto/maker-checker.md`, `docs/howto/feature-flow.md`, `docs/howto/agent-loop.md`, `docs/agent/scoring-rubric.md`, `.agents/skills/patrimo-harness/SKILL.md`, `docs/adr/0030-*.md`, `docs/adr/0026-*.md` Status line, `docs/adr/index.md`

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- scripts/role-worktree.test.ts` — cases N1, N2, N3, E3 (and N4 via doc review in Checker)
- Layer 3: `n/a` — no web UI / API / workbook I/O / settings
- Feature-specific: `make branch-ready`; wording grep in CONSTRAINTS / maker-checker / skill for agent isolation

When Layer 2 applies, makers follow [tdd-red-green.md](../../howto/tdd-red-green.md) (CONSTRAINTS §24).
Tier B cadrage: [cadrage-lock.md](../../howto/cadrage-lock.md) (CONSTRAINTS §25) before Maker.

## Tranches

| # | Tranche | Behavior cases covered | Layers | PR / commit |
|---|---|---|---|---|
| 1 | Checker agent isolation — mandate + ADR + docs/skill | N1 N2 N3 N4 E1 E2 E3 | 1+2 | this PR (Layer 2 RED = N1; N2–E3 preserved/docs) |

## Exclusions

- Not in this branch: auto-spawn CLIs; Framer/Challenger auto-agents; changing publish scope beyond PROGRESS
- Do not refactor unrelated modules

## Checker

- [ ] Separate agent (subagent / fresh session) in the checker worktree will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when Layer 2 applied; Tier B teach-back / cadrage lock recorded when Layer 2 applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed (Maker / checker howto note if needed)
- [ ] Append / refresh the [rework-log](../../rework-log.md) row **in this PR** via `make rework-log-stamp`; if overlap fires, human yes/no via `make rework-log-propose` (never silent auto-ack)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass if `Challenger: required`, then `make branch-ready` must pass before coding.
