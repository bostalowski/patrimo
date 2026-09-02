# Maker / checker

Harness practice from [Learn Harness Engineering — lecture 09](https://walkinglabs.github.io/learn-harness-engineering/fr/lectures/lecture-09-why-agents-declare-victory-too-early/): the agent that writes code is systematically too confident to grade its own work.

Cadrage (Framer / Challenger / teach-back) is a **separate** gate before Maker — see [cadrage-lock.md](cadrage-lock.md). Do not conflate “cadrage Pass” with “checker Pass”.

## Roles

| Role | Does | Must not |
|---|---|---|
| **Framer** | Locks Intent / cases / decisions on the branch CONTRACT | Write production code |
| **Challenger** | Attacks cadrage when required | Implement the feature |
| **Maker** | Implements one branch [CONTRACT](../agent/branches/README.md) after `branch-ready`; runs verify layers | Declare “done” without checker Pass on non-trivial product work; fill Tier B cadrage alone then code without teach-back |
| **Checker** | Fresh session (preferred) or explicit role switch; runs CONTRACT verify commands; scores with [scoring-rubric.md](../agent/scoring-rubric.md) | Implement the feature or “fix while reviewing” beyond tiny typo fixes |

Trivial doc-only or comment-only changes may skip checker. Anything touching `@patrimo/core`, workbook I/O, API routes, or user-visible behavior needs checker.

## Procedure

1. Framer fills branch CONTRACT (Tier B: [cadrage-lock.md](cadrage-lock.md)) → Challenger if required → teach-back → `make branch-ready` → when Layer 2 applies, Maker implements each case **RED → GREEN** ([tdd-red-green.md](tdd-red-green.md)) with RED evidence in branch PROGRESS → `make verify` (+ `make e2e` when layer 3 applies).
2. Maker updates branch PROGRESS / optional run log with commands run and results (including RED evidence when Layer 2 applied).
3. Open a **new** agent session (or clearly switch to checker). Paste the checker prompt from the rubric.
4. Checker records Pass/Fail in the branch PROGRESS or run log. On Fail, maker continues with WIP still = 1 on that CONTRACT. Missing RED evidence when Layer 2 applied is a Fail (or at best Tests = C with no Pass if Correctness is weak — see rubric). Missing Tier B teach-back / cadrage lock proof when Layer 2 applied is a Fail on Docs / Scope.
5. Apply the **re-check loop** below until a stable Pass (or Fail with an explicit deferral noted in PROGRESS).
6. Only after a stable Pass: update root FEATURES matrix if needed; clear “in progress” on the branch PROGRESS before merge.

## Re-check loop (Fail vs Pass-with-nits)

**Pass does not require A on every dimension.** The rubric allows Correctness/Architecture **B**. Do not loop forever chasing “all A”.

| Checker outcome | Maker action | New Checker required? |
|---|---|---|
| **Fail** | Fix CONTRACT gaps / code / evidence | **Yes** — fresh Checker session before claiming done |
| **Pass** with **no** follow-up fixes | None | No |
| **Pass** with **nits**, Maker applies **docs/copy-only** fixes (disclaimer wording, ARCHITECTURE note, PROGRESS, glossary typo) | Apply nits; note in PROGRESS | **No** (optional light re-check; not a gate) |
| **Pass** with **nits**, Maker applies fixes that touch **behavior, `@patrimo/core` math, tests, API, workbook I/O, or user-visible KPI labels/metrics** | Apply fixes; re-run verify layers as needed | **Yes** — fresh Checker on the post-fix diff before claiming done |

Checker must not implement the feature. Maker applies fixes; then a **distinct** Checker session re-scores when the table says Yes.

Record in PROGRESS, e.g.:

```markdown
- Checker: Fail (YYYY-MM-DD) — <reason>
- Checker: Pass (YYYY-MM-DD) — nits: <list>
- Post-nit Maker fixes: docs-only | behavior/core/tests
- Checker re-Pass (YYYY-MM-DD) — after behavior nits   # when required
# or, for docs-only:
- Checker re-check: skipped (docs-only nits; YYYY-MM-DD)
```

## Why a fresh session

Same-context self-review reuses the maker’s rationalizations. A cold checker sees only the contract, the diff, and command output — closer to an independent grade.
