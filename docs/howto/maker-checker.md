# Maker / checker

Harness practice from [Learn Harness Engineering — lecture 09](https://walkinglabs.github.io/learn-harness-engineering/fr/lectures/lecture-09-why-agents-declare-victory-too-early/): the agent that writes code is systematically too confident to grade its own work.

Cadrage (Framer / Challenger / teach-back) is a **separate** gate before Maker — see [cadrage-lock.md](cadrage-lock.md). Do not conflate “cadrage Pass” with “checker Pass”. This procedure is gate G5 in [feature-flow.md](feature-flow.md).

## Isolation (ADR 0030)

**Freshness = separate agent identity**, not the mere existence of a git worktree.

`make checker` (`scripts/role-worktree.sh checker`) still prepares a plain detached `git worktree` (write sandbox + `--publish` PROGRESS-only guard — portable, no IDE preference). That is **not** enough: the Maker session MUST spawn a **separate agent** (subagent / Task tool / fresh empty-context session) whose working directory is that worktree, give it only the Checker prompt, and MUST NOT score in the Maker chat. Same-session self-check after `make checker` is a harness violation even when the worktree exists.

| Piece | Role |
|---|---|
| Separate agent (subagent / Task / fresh empty chat) | Cognitive / process isolation — the real Checker |
| Detached git worktree | Write sandbox + handoff path for `--publish` |
| `--publish` | Machine check that only branch `PROGRESS.md` changed |

## Roles

| Role | Does | Must not |
|---|---|---|
| **Framer** | Locks Intent / cases / decisions on the branch CONTRACT | Write production code |
| **Challenger** | Attacks cadrage when required | Implement the feature |
| **Maker** | Implements one branch [CONTRACT](../agent/branches/README.md) after `branch-ready`; runs verify layers; runs `make checker` then **spawns** the Checker agent | Declare “done” without checker Pass on non-trivial product work; grade the work in the Maker session; fill Tier B cadrage alone then code without teach-back |
| **Checker** | Separate agent (preferred: Task/subagent; fallback: fresh empty-context session) in the checker worktree; runs CONTRACT verify commands; scores with [scoring-rubric.md](../agent/scoring-rubric.md) | Implement the feature or “fix while reviewing” beyond tiny typo fixes; write anything but branch `PROGRESS.md` |

Trivial doc-only or comment-only changes may skip checker. Anything touching `@patrimo/core`, workbook I/O, API routes, or user-visible behavior needs checker.

## Procedure

1. Framer fills branch CONTRACT (Tier B: [cadrage-lock.md](cadrage-lock.md)) → Challenger if required → teach-back → `make branch-ready` → when Layer 2 applies, Maker implements each case **RED → GREEN** ([tdd-red-green.md](tdd-red-green.md)) with RED evidence in branch PROGRESS → `make verify` (+ `make e2e` when layer 3 applies).
2. Maker updates branch PROGRESS / optional run log with commands run and results (including RED evidence when Layer 2 applied).
3. Maker runs `make checker` — note the worktree path and the printed **AGENT ISOLATION** block + Checker prompt.
4. Maker **spawns a separate agent** (Cursor: Task / subagent with cwd = worktree; other tools: new empty-context session on that path). That agent alone scores and writes Pass/Fail into branch PROGRESS in the worktree.
5. Maker publishes: `scripts/role-worktree.sh checker --publish <worktree-path>` (fails if anything other than PROGRESS changed).
6. On Fail, maker continues with WIP still = 1 on that CONTRACT. Missing RED evidence when Layer 2 applied is a Fail (or at best Tests = C with no Pass if Correctness is weak — see rubric). Missing Tier B teach-back / cadrage lock proof when Layer 2 applied is a Fail on Docs / Scope.
7. Only after Pass: update root FEATURES matrix if needed; clear “in progress” on the branch PROGRESS before merge.

## Why a separate agent

Same-context self-review reuses the maker’s rationalizations. A cold checker sees only the contract, the diff, and command output — closer to an independent grade. A worktree without a new agent does not provide that cold start.

## See also

- [ADR 0030](../adr/0030-checker-agent-isolation.md) — agent isolation decision
- [feature-flow.md](feature-flow.md) — gate G5
- [scoring-rubric.md](../agent/scoring-rubric.md)
