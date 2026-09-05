# Feature flow (cadrage → merge)

Canonical entry point for shipping a feature end to end. This page sequences
existing procedures — [cadrage-lock.md](cadrage-lock.md),
[tdd-red-green.md](tdd-red-green.md), [maker-checker.md](maker-checker.md) —
and the executable gates added by [ADR 0026](../adr/0026-feature-flow-cadrage-to-merge.md).
It does not replace any of those pages; read them for the *why* and the
detailed procedure. This page is the *sequence*.

Hard rules: [CONSTRAINTS.md](../../CONSTRAINTS.md) §23–27.

## The flow

```text
G0  make branch-contract     Framer                      → CONTRACT + Tranches table
G1  make branch-ready        Challenger + human teach-back → cadrage locked, ≥1 tranche
                             ── per tranche, WIP=1 on the CONTRACT ──
G2  make red CASE=… CMD=…    Maker                       → RED evidence (real failure, not narrated)
G3  make verify / make e2e   Maker                       → three-layer DoD for the tranche
G4  make gauntlet            Maker                       → test-removal guard + scoped mutation
G5  make checker              Checker (isolated worktree) → Pass/Fail written to PROGRESS only
G6  make pr-check → push     Maker                       → tranche pushed; rework-log stamp + overlap check
G7  merge                                                → FEATURES matrix (+ archive branch / root PROGRESS note)
```

Repeat G2→G6 once per row of the CONTRACT's `## Tranches` table (G7 fires
once the tranche mechanic reaches main — per-tranche if stacked PRs, once
per merged batch if reviewed as commits in one PR). The CONTRACT (not the
tranche) is the WIP=1 unit — CONSTRAINTS §23 is unchanged; a tranche is how
one CONTRACT ships incrementally instead of as one large diff. **How** a
tranche reaches review — a separate stacked PR (merged before the next
tranche's commits push) or a commit landing in one already-open PR reviewed
incrementally — is a per-branch choice recorded in that CONTRACT's D1-style
decision (CONSTRAINTS §26): GitHub diffs branch-vs-base, so pushing more
commits to an open PR's branch grows that PR rather than starting a new one.

## Gate reference

| Gate | Command | What it proves | Detail |
|---|---|---|---|
| G0 | `make branch-contract` | CONTRACT + PROGRESS scaffolded for this branch | [branches/README.md](../agent/branches/README.md) |
| G1 | `make branch-ready` | Tier B: Intent filled, no `OPEN` decision, teach-back accepted, Challenger Pass if required, every behavior case assigned to a Tranches row | [cadrage-lock.md](cadrage-lock.md) |
| G2 | `make red CASE="…" CMD="…"` | The named behavior case had no passing test before this command ran — refuses to write evidence if `CMD` already passes | [tdd-red-green.md](tdd-red-green.md), `scripts/red-evidence.sh` |
| G3 | `make verify` (+ `make e2e` when Layer 3 applies) | Three-layer DoD for the tranche's slice | `AGENTS.md` § Run and verify |
| G4 | `make gauntlet` | No test silently deleted/`.skip`'d/`.only`'d without a `Test-removal-justified:` line; on a `packages/core` diff, no surviving mutant above threshold in the changed files | `scripts/gauntlet.sh`, `scripts/test-guard.sh` |
| G5 | `make checker` | A Checker in a separate plain `git worktree` scores the tranche against [scoring-rubric.md](../agent/scoring-rubric.md), writing only to PROGRESS | [maker-checker.md](maker-checker.md), `scripts/role-worktree.sh checker` |
| G6 | `make pr-check` then `make pr` (first tranche) or a plain push (later tranches landing in an already-open PR) | Everything above is true and recorded, dated after the latest code commit; `make rework-log-stamp` row present with `Touched`; no unreworked path overlap within 30 days | `scripts/pr-check.sh`, `scripts/lib/rework-log.mjs`, `scripts/pr.sh`, CI `harness` job replays `pr-check` on every push |
| G7 | merge | FEATURES matrix updated if a platform status changed; branch folder archived / root PROGRESS note if useful | [branches/README.md](../agent/branches/README.md) |

`make flow` (`scripts/flow-status.sh`) prints which gate you're on and the
next command, from the current branch's CONTRACT/PROGRESS state.

## Roles

Same roles as [cadrage-lock.md](cadrage-lock.md) and
[maker-checker.md](maker-checker.md); this page adds only *where* they run:

| Role | Runs where | Writes |
|---|---|---|
| Framer | Any session | CONTRACT.md (Intent, cases, decisions, Tranches) |
| Challenger | Fresh session (`make checker`-style isolation optional, not required) | PROGRESS.md (Pass/Fail + edits requested) |
| Maker | The branch's own worktree | Production code, tests, CONTRACT/PROGRESS updates |
| Checker | **Separate plain `git worktree`** (`make checker`) | PROGRESS.md only — never production code |

Role prompts are not duplicated here: Framer/Challenger/teach-back text lives
in [cadrage-lock.md](cadrage-lock.md); the Checker prompt lives in
[scoring-rubric.md](../agent/scoring-rubric.md). `scripts/role-worktree.sh`
reads and prints them.

## Why gates instead of a checklist

`docs/howto/pr-checklist.md` remains a human-readable summary, but it is no
longer the enforcement mechanism — `make pr-check` is, and CI's `harness`
job replays it on every `pull_request`. See
[ADR 0026](../adr/0026-feature-flow-cadrage-to-merge.md) for the rationale
(self-reported gate status does not hold up under measurement — METR's RCT
on AI-assisted developer productivity is the cited evidence).

## Why tranches

One CONTRACT can list many behavior cases spanning core, web, mobile, and
docs. Shipping all of them as one PR produces exactly the large, slow-to-review
diff that DORA 2025 and Google's engineering-practices data both flag as the
point where AI-assisted throughput gains stop translating into stable,
reviewable delivery. The `## Tranches` table in the CONTRACT template
assigns each behavior case to one small, separately-reviewable slice
(stacked PR or incremental commit, per that branch's D1-style choice);
`make branch-ready` fails a Tier B CONTRACT that leaves a case unassigned.

## Related

- [cadrage-lock.md](cadrage-lock.md) — Framer / Challenger / teach-back detail
- [tdd-red-green.md](tdd-red-green.md) — RED → GREEN detail
- [maker-checker.md](maker-checker.md) — Checker procedure and re-check loop
- [agent-loop.md](agent-loop.md) — autonomous loop levels built on this flow
- [ADR 0026](../adr/0026-feature-flow-cadrage-to-merge.md) — decision record for the gates on this page
