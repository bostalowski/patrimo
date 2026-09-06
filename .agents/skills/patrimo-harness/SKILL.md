---
name: patrimo-harness
description: >-
  Run Patrimo agent sessions under the repo harness: load CONSTRAINTS, branch
  CONTRACT/PROGRESS, DoD verify bands, maker/checker handoff. Use when starting
  work in financial-graphs/Patrimo, claiming a feature done, initializing a
  session, or when the user mentions harness, verify-full, WIP, branch-contract,
  or cold-start.
---

# Patrimo harness skill

Canonical path: `.agents/skills/patrimo-harness/` (symlinked as
`.cursor/skills/patrimo-harness` and `.claude/skills/patrimo-harness`).

## Quick path

1. Read `CONSTRAINTS.md`, `docs/reference/glossary.md`.
2. `make branch-status` — read this branch’s CONTRACT + PROGRESS (on `main`, root PROGRESS + matrix only).
3. If no CONTRACT yet: feature branch → `make branch-contract` → **Framer** fills Intent / behavior cases / decisions (Tier B) or marks `n/a` (Tier A). See `docs/howto/cadrage-lock.md`.
4. Tier B: Challenger if `Challenger: required`; human teach-back accepted in PROGRESS; then `make branch-ready` must pass before Maker.
5. Read colocated `ARCHITECTURE.md` for packages you touch.
6. Implement that CONTRACT only. When `verify-behavior` applies: per case **RED → GREEN** (`docs/howto/tdd-red-green.md`) — failing targeted test for the right reason before production code, record RED evidence in PROGRESS, then minimal production code. Never invent sheet names / enums / reserved IDs; never invent behavior absent from CONTRACT cases.
7. Verify:
   - Always (`verify-static`): `make verify`
   - Behavior (`verify-behavior`): targeted `npm test -- <path>` (after RED → GREEN when it applies)
   - Web UI / API / workbook I/O / settings (`verify-e2e`): `make e2e` or `make verify-full`. When web UI changed: PR screenshots after asserts (`docs/howto/ui-screenshots-in-pr.md`).
   - `@patrimo/core` / workbook I/O / API route diffs: `make gauntlet` (test-removal guard + scoped mutation testing — CONSTRAINTS §27)
8. Checker: `make checker` prepares an isolated `git worktree` (write sandbox) and prints an **AGENT ISOLATION** mandate. The Maker session MUST NOT score. Spawn a **separate agent** (Cursor: Task / subagent with cwd = that worktree; otherwise a fresh empty-context session on that path) using `docs/howto/maker-checker.md` + `docs/agent/scoring-rubric.md` (Fail if `verify-behavior` applied and RED evidence missing; Fail if Tier B missing teach-back / cadrage lock proof). That agent writes only the branch's PROGRESS.md; then `scripts/role-worktree.sh checker --publish <worktree>`. See ADR 0030.
9. `make pr-check` before opening/updating the PR — replays `branch-ready`, requires RED evidence per checked-off case and a fresh, cited Checker Pass. CI's `harness` job replays it on every push.
10. Update `docs/agent/branches/<slug>/PROGRESS.md` (+ optional `docs/agent/runs/YYYY-MM-DD-slug.md`).
11. Before the merging PR: `make rework-log-stamp`. If path overlap with unreworked rows: **propose to the human** (`make rework-log-propose` or ask in chat), then apply only after explicit yes/no (`REWORK_ACK=yes|no`). Never auto-mark. On merge: update root `FEATURES.md` if platform status changed.

Full gate-by-gate sequence: `docs/howto/feature-flow.md` (slugs: `branch-contract` … `merge`). Prefer meaningful slugs — never bare `G#` / `Layer N` alone (`.agents/rules/meaningful-step-names.md`, symlinked for Cursor + Claude).

## Commands

| Intent | Command |
|---|---|
| Session init | `make init` |
| Create cadrage | `make branch-contract` |
| Show cadrage | `make branch-status` |
| Ready to code? | `make branch-ready` |
| Matrix gaps | `make platform-gaps` |
| Map health | `make cold-start` |
| `verify-static` | `make verify` |
| `verify-e2e` | `make e2e` (+ PR screenshots if web UI — `docs/howto/ui-screenshots-in-pr.md`) |
| Full (`verify-static` + `verify-e2e`) | `make verify-full` |
| RED evidence (executed, not narrated) | `make red CASE="…" CMD="…"` |
| Gauntlet (test-removal guard + scoped mutation) | `make gauntlet` |
| Checker (separate agent + worktree sandbox) | `make checker` then spawn subagent / fresh session |
| PR readiness | `make pr-check` |
| Stamp rework-log row | `make rework-log-stamp` |
| Propose overlap ack (human yes/no) | `make rework-log-propose` |
| Where am I in the flow? | `make flow` |

## Do not

- Declare done on lint/unit alone when `verify-e2e` applies.
- Start Maker work on Tier B before Intent / LOCKED decisions / teach-back / `branch-ready`.
- Write production code for a `verify-behavior` case before a real RED for that case.
- Expand into a second feature without updating the branch CONTRACT.
- Put feature focus in root `PROGRESS.md` (that file is for `main` only).
- Grade your own non-trivial work in the Maker session (even after `make checker` created a worktree).
- Duplicate domain rules outside `@patrimo/core`.
- Treat `make next-feature` as a claim queue (deprecated → `platform-gaps` + branch contract).
- Treat full Spec-Driven Development as required (opt-in only; harness embeds cadrage-lock + RED → GREEN).
- Refer to gates/DoD bands by opaque codes alone (`G3`, `Layer 3`).

## Related (optional runtime)

Isolated ports / DinD for parallel worktrees / agents: root `Coastfile` +
`.agents/skills/coasts/SKILL.md` (also `.cursor/skills/coasts`, `/coasts`
command). Not part of DoD — do not require Coasts for verify / branch gates.
Classic `npm run dev` stays the default single-checkout path.

`make checker` always uses a plain `git worktree add --detach`
(`scripts/role-worktree.sh`) as the Checker **write sandbox** — no
Orca/Coast/IDE preference in the script. Freshness requires a **separate
agent** (subagent / Task / fresh empty-context session) with cwd = that
worktree ([ADR 0030](../../../docs/adr/0030-checker-agent-isolation.md)).
Worktree alone is not an independent grade.
