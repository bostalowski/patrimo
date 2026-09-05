# ADR 0026: Feature flow — cadrage to merge as executable gates

- Status: accepted
- Date: 2026-09-04
- implementation_ready: yes

```text
Contract (do not invent):

Flow: G0 branch-contract → G1 branch-ready (cadrage lock) →
  per tranche: G2 red (RED evidence) → G3 verify/e2e → G4 gauntlet
  (test-removal guard + scoped mutation) → G5 checker (isolated worktree)
  → G6 pr-check (includes rework-log row for this slug) → pr → G7 merge.

Tranches: a CONTRACT ships as N small, separately-reviewable slices, one per
  Tranches-table row, each row assigned a subset of the CONTRACT's behavior
  cases. A slice is either its own stacked PR (merged before the next
  slice's commits push) or a distinct commit/commit-group reviewed
  incrementally within one open PR — whichever a branch's own commits/PR
  decision picks; GitHub diffs branch-vs-base, so "stacked PRs" on one
  shared branch requires merging between slices. WIP=1 stays per CONTRACT
  (CONSTRAINTS §23); a tranche is a slice of that one WIP item, not a
  second feature.

Gauntlet = test-guard (structural: no deleted/`.skip`/`.only` test without a
  `Test-removal-justified:` line in PROGRESS) + Stryker mutation testing
  scoped to changed `packages/core/src/**` files only (never repo-wide,
  never a global-score gate).

Checker isolation: `make checker` spawns in a separate plain `git worktree`
  (no IDE/tool preference — works identically in any agent or editor), not
  a same-session role switch. Checker may only write PROGRESS.md.

Prompts are not duplicated: Framer/Challenger/teach-back text stays in
  cadrage-lock.md; Checker text stays in scoring-rubric.md. Scripts read/
  print them.

FORBIDDEN: hard diff-size merge block (informational CI comment only);
  domain-math changes in this branch; full DORA dashboard (a one-file
  rework-log.md is enough); repo-wide mutation testing.
```

## Context

The repo's cadrage discipline (cadrage lock, Framer ≠ Maker, RED → GREEN,
maker/checker, three-layer DoD) is strong before code is written, but stops
being machine-checked once code exists. `docs/howto/pr-checklist.md` is a
checklist a human or agent ticks by hand; CI (`ci.yml`) only runs
`make verify` / `make e2e`. Nothing in the repository checks that
`branch-ready` passed, that RED evidence for a behavior case actually exists,
or that a Checker Pass was recorded and is not stale, before a PR merges. A
CONTRACT with many behavior cases (core + web + mobile + docs) ships as one
large PR by default.

Two bodies of external evidence motivate closing this gap with *machine*
gates rather than more prose: METR's randomized trial found developers'
self-reported productivity gains from AI tools diverge sharply from measured
reality (perceived +20%, measured −19%), which argues against any workflow
step whose only enforcement is "the agent says it did it." Separately, DORA
2025 and Google's engineering-practices data both show small batches amplify
the benefits of AI-assisted work and that review quality/latency scale
non-linearly with diff size — arguing for a unit smaller than "the whole
CONTRACT" as what ships per PR.

## Decision

Turn each existing procedure into a command with an exit code, and add one
new unit — the **tranche** — so a CONTRACT ships as small, separately
reviewable slices instead of one large diff:

1. **Tranches.** The CONTRACT template gains a `## Tranches` table (`# /
   Tranche / behavior cases covered / Layers / PR-or-commit`). Every
   nominal/edge behavior case must be assigned to exactly one tranche.
   `branch-ready` fails a Tier B CONTRACT that has a Tranches table with an
   unassigned case. One tranche = one small reviewable unit, but the
   mechanic is a per-branch choice, not fixed by this ADR: separate stacked
   PRs (each merged before the next tranche's commits push — GitHub diffs
   branch-vs-base, so pushing more commits to an open PR's branch grows
   that PR rather than starting a new one) or a single PR whose tranches
   land as distinct commits reviewed incrementally. This does not change
   WIP=1 (CONSTRAINTS §23): the WIP unit stays the CONTRACT, tranches are
   how that one unit ships incrementally.
2. **RED evidence, executed not narrated.** `scripts/red-evidence.sh`
   (`make red CASE="…" CMD="…"`) actually runs the given test command and
   refuses to append RED evidence to branch PROGRESS.md unless it observes
   a real failure — closing the "TDD theater" gap `tdd-red-green.md`
   already names but does not enforce.
3. **Gauntlet.** `scripts/gauntlet.sh` (`make gauntlet`) runs two feedback
   controls before a PR is opened: (a) `test-guard.sh`, a structural diff
   check that fails on a deleted test file, a removed `test(`/`it(` block,
   or an added `.skip`/`.only`, unless branch PROGRESS.md carries a
   `Test-removal-justified: <reason>` line; (b) Stryker mutation testing,
   scoped to exactly the `packages/core/src/**` files touched by the diff
   (never the whole package, never a repo-wide score), which fails on a
   surviving mutant in a changed file above the configured threshold.
   Skipped (not silently green) when no `packages/core` file is in the
   diff.
4. **PR readiness.** `scripts/pr-check.sh` (`make pr-check`) replays
   `branch-ready`, requires RED evidence for every Tier-B behavior case in
   the tranche, requires a `Checker: Pass` line in PROGRESS dated on/after
   the latest code commit, and reports diff size. A new CI job (`harness`)
   runs `make pr-check` on every `pull_request`; a separate `size` job
   posts an informational diff-size comment — no hard block on size (Google
   found ~200 lines is where review quality drops, but a hard line-count
   gate would block legitimate mechanical diffs the harness has no way to
   distinguish from real bloat).
5. **Checker isolation.** `make checker` = `scripts/role-worktree.sh checker`:
   always creates a plain `git worktree add --detach` — no IDE/tool
   preference, since the write-scope check below only needs a known worktree
   path to diff, not any particular way of creating it — and the Checker may
   only write `PROGRESS.md`, replacing "open a new chat and paste this
   prompt" (self-declared freshness) with a structurally separate process.
6. **No duplicated prompts.** Framer/Challenger/teach-back prompt text stays
   in `cadrage-lock.md`; the Checker prompt stays in `scoring-rubric.md`.
   `role-worktree.sh` reads and prints them; it does not re-author them
   elsewhere.
7. **Merge signal (rework log).** `docs/agent/rework-log.md` — one row per
   feature that reaches `main`. **Amendment (2026-09-05, timing):** the row is
   appended **in the PR about to merge**; `make pr-check` fails without it.
   **Amendment (2026-09-05, auto-detect):** each row carries a `Touched` path
   fingerprint (`make rework-log-stamp`). A later PR whose diff overlaps
   `Touched` of a row with `Reworked?=no` within 30 days fails `make pr-check`
   until that cell is set to `yes` — so follow-up fixes are recorded by the
   harness, not by human memory.

## Invariants

1. The **CONTRACT**, not the tranche, is the WIP=1 unit (CONSTRAINTS §23
   unchanged); tranches are an internal breakdown of one CONTRACT's work.
2. Mutation testing in `make gauntlet` never runs against files the current
   diff did not touch, and never gates on a repo-wide score — only on
   changed `packages/core/src/**` files.
3. No script in this ADR's scope introduces a hard, blocking diff-size
   limit; oversized-diff signal stays informational (CI comment).
4. Role prompts (Framer/Challenger/teach-back/Checker) have exactly one
   canonical location each (`cadrage-lock.md`, `scoring-rubric.md`); no
   script duplicates that text.
5. The Checker may write only `docs/agent/branches/<slug>/PROGRESS.md`;
   it does not touch production code or CONTRACT.md.

## Options considered

### Option A — Keep procedures declarative, add more documentation

**Advantages**

Zero new scripts, zero CI surface, nothing to maintain.

**Disadvantages**

Leaves exactly the gap this ADR targets: RED evidence, Checker Pass, and
`branch-ready` status remain self-reported. METR's finding that developers'
self-assessment diverges from measured reality by ~39 points is the direct
argument against relying on narrative-only gates for exactly this kind of
step.

### Option B — Gauntlet without human review ("skip revue, tests only")

Modeled on Uncle Bob's 2026 position: stop reading agent-written code,
surround it with an extreme test/metric gauntlet, and trust whatever
survives.

**Advantages**

Removes the reviewer bottleneck entirely; scales furthest.

**Disadvantages**

`@patrimo/core` carries wealth-tracking domain math (PRU, tax heuristics,
projection, deletion rules) whose errors are silent — a wrong TRI or wrong
tax estimate does not crash a test, it produces a plausible-looking wrong
number. A gauntlet proves the code satisfies the tests it was given; it
cannot prove the tests encode the right financial rule. Rejected: this ADR
keeps human review, but shrinks it to a size a human can actually do well
(tranches) rather than replacing it.

### Option C — Tranches + executable gates + isolated Checker (chosen)

**Advantages**

Machine-checkable at every transition that previously relied on
self-report; small reviewable tranches (stacked PRs or incremental commits
within one PR) match the DORA/Google evidence on batch size; the Checker's
isolation stops being a same-session social contract;
mutation testing is scoped tightly enough to stay fast and to avoid
punishing PRs for pre-existing debt.

**Disadvantages**

More scripts to maintain; Stryker adds a devDependency and a CI cost (bounded
by scoping to the diff); tranches add one more artifact (a table) to keep in
sync with behavior cases — mitigated by `branch-ready` checking that sync
mechanically.

## Consequences

- `docs/howto/feature-flow.md` becomes the canonical entry point for the
  G0→G7 flow, linked from `AGENTS.md` § Session lifecycle.
- `docs/agent/branches/_templates/CONTRACT.md` gains the Tranches section;
  every future Tier B CONTRACT is expected to fill it.
- `CONSTRAINTS.md` gains §26 (tranches / diff-size signal) and §27 (gauntlet
  + isolated Checker required on `@patrimo/core`, workbook I/O, API routes).
- `.github/workflows/ci.yml` gains a `harness` job (blocking, runs
  `make pr-check`) and a `size` job (informational only).
- New devDependencies: `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`.
- `docs/agent/rework-log.md` rows are required in the merging PR (`make pr-check`
  fails without the current slug); `Reworked?` still updated by hand within 30 days.

## Uncovered cases

- Detecting overlapping behavior-case assignment across two Tranches rows —
  left to Framer/Challenger review, not a machine gate.
- Distinguishing a RED failure "for the right reason" (missing behavior) from
  a RED failure for the wrong reason (bad import, typo) — `red-evidence.sh`
  can only see the exit code; `tdd-red-green.md`'s guidance to check the
  failure reason by hand still applies on top of the script.
- Automating Framer/Challenger spawning beyond creating their worktree and
  printing the existing paste-prompts — no scripted "auto-accept teach-back."

## Follow-up

- Optional: once `rework-log.md` has enough rows, revisit whether the
  informational diff-size signal should tighten.

## See also

- [docs/howto/feature-flow.md](../howto/feature-flow.md)
- [docs/howto/cadrage-lock.md](../howto/cadrage-lock.md)
- [docs/howto/tdd-red-green.md](../howto/tdd-red-green.md)
- [docs/howto/maker-checker.md](../howto/maker-checker.md)
- [docs/agent/scoring-rubric.md](../agent/scoring-rubric.md)
- [CONSTRAINTS.md](../../CONSTRAINTS.md) §23–25 (existing), §26–27 (new)
