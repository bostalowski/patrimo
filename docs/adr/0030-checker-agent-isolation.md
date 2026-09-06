# ADR 0030: Checker isolation is agent identity (subagent / fresh session)

- Status: accepted
- Date: 2026-09-06
- Supersedes-in-part: [ADR 0026](0026-feature-flow-cadrage-to-merge.md) — Checker isolation clause only (worktree-as-freshness)
- implementation_ready: yes

```text
Contract (do not invent):

Checker freshness = a SEPARATE agent process/session (subagent / Task tool /
  fresh empty-context chat), not a same-session role switch and not the
  mere existence of a git worktree.

`make checker` still creates a plain detached git worktree (write sandbox +
  publish surface; PROGRESS-only via --publish). The script MUST print an
  AGENT ISOLATION mandate: Maker MUST NOT score; spawn a separate agent
  with cwd = that worktree; give it only the Checker prompt from
  scoring-rubric.md.

Portable fallback when the host tool has no Task/subagent API: open a
  fresh empty-context agent session on the worktree path (same mandate).

FORBIDDEN: treating worktree-alone as sufficient freshness; shell
  auto-spawn of a Cursor/Orca/Coast agent from role-worktree.sh (keeps
  plain-git / no IDE preference); Checker writes outside branch PROGRESS.md.
```

## Context

ADR 0026 made Checker isolation executable by creating a separate `git worktree` and printing a paste-prompt. In practice the **same Maker agent** often kept scoring in the same conversation after `make checker`. The worktree enforced write scope (`--publish`) but did not enforce cognitive / process isolation. Human critique (2026-09-06): the real constraint is the **agent**, not the filesystem; prefer spawning a subagent.

## Decision

1. Redefine Checker freshness as **separate agent identity** (subagent / Task / fresh empty-context session).
2. Keep the plain git worktree as the **write sandbox** and handoff path for `--publish` (PROGRESS only) — no IDE lock-in in the shell script.
3. `role-worktree.sh checker` prints an explicit **AGENT ISOLATION (required)** block; Maker-session self-grading after `make checker` is a harness violation (CONSTRAINTS §22 / §27).
4. Host-agent skill / howto instruct Cursor (and peers) to launch a Task/subagent with the printed prompt and cwd = worktree; tools without that API use a fresh empty chat on the worktree.

## Invariants

1. Checker may write only `docs/agent/branches/<slug>/PROGRESS.md`.
2. Role prompt text stays single-sourced in `scoring-rubric.md` (script prints, does not re-author).
3. `role-worktree.sh` remains plain git — no hard dependency on Cursor Task, Orca, or Coasts.
4. Same-session Maker self-check after `make checker` is invalid even if a checker worktree exists.

## Options considered

### Option A — Stronger paste wording only

**Advantages**

Minimal diff; no ADR.

**Disadvantages**

Leaves same-session self-check as the easy path; does not name agent spawn as the primitive.

### Option B — Shell auto-spawn of Cursor/Orca agent

**Advantages**

True process spawn from `make checker`.

**Disadvantages**

Locks the harness to one IDE/CLI; breaks ADR 0026’s “plain git everywhere” non-goal; fragile across environments.

### Option C — Agent isolation mandate + worktree sandbox (chosen)

**Advantages**

Matches the real failure mode (same agent grades itself); portable script; skill/howto can require Task/subagent where available; fallback to fresh empty session elsewhere.

**Disadvantages**

Cannot machine-prove process identity ≠ Maker; still relies on the host agent/human to actually spawn. Acceptable: CONSTRAINTS + skill + stdout mandate make the violation explicit for Checker/pr-check review.

## Consequences

- CONSTRAINTS §22 / §27, `maker-checker.md`, `feature-flow.md`, `AGENTS.md`, and `patrimo-harness` skill updated.
- ADR 0026 Status notes superseded-in-part for the Checker isolation clause.
- `scripts/role-worktree.sh` / tests assert AGENT ISOLATION mandate wording.

## Uncovered cases

- Proving at CI time that the Pass line was written by a different process id.
- Auto-wiring Cursor Task from Make without a Cursor-specific script.

## Follow-up

- Optional: host-specific helpers (`cursor agent …`, Orca spawn) as **optional** wrappers that still call `role-worktree.sh` under the hood — never required by `make checker`.

## See also

- [ADR 0026](0026-feature-flow-cadrage-to-merge.md)
- [maker-checker.md](../howto/maker-checker.md)
- [feature-flow.md](../howto/feature-flow.md)
- [scoring-rubric.md](../agent/scoring-rubric.md)
