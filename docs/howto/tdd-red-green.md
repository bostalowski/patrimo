# RED → GREEN (harness implementation)

When Layer 2 applies, implement each CONTRACT behavior case as **RED then GREEN**. The failing test is the executable proof that the case is not already satisfied — not a post-hoc confirmation of code already written.

Hard rule: [CONSTRAINTS.md](../../CONSTRAINTS.md) §24. Session entry: [AGENTS.md](../../AGENTS.md).

This is **not** full Spec-Driven Development. No SPEC LOCK, Diátaxis package, or autonomous commit/push/PR is required. Full SDD remains an explicit opt-in skill outside this harness.

## When it applies

| CONTRACT says | Do |
|---|---|
| Layer 2 lists targeted `npm test -- <path>` and behavior cases | RED → GREEN per case before production code for that case |
| Layer 2: `n/a` | Skip RED → GREEN (docs, harness tooling, pure refactor, config, styling, spikes) |

Derive test titles from the **CONTRACT Layer 2 cases** (and Scope bullets). Do not invent behavior absent from the CONTRACT — reopen the CONTRACT instead.

## Gate RED (hard)

For the current case, **before** any production code for that case:

1. Write the targeted test(s).
2. Run them for real (`npm test -- <path>` — not simulated).
3. Confirm failure for the **right reason**: missing behavior, not import/compile noise.
4. Paste or summarize the real failure in branch `PROGRESS.md` (or a run log) as **RED evidence**.

If the failure is for the wrong reason, fix the test until it fails for the right reason — still no production code.

Anti-pattern: writing test and production code together and calling it TDD (**TDD theater**).

## GREEN

Write the **minimal** vertical slice that makes those tests pass. Re-run the same targeted command. Do not weaken or rewrite tests just to go green (unless the test itself is wrong — say so explicitly before fixing).

Do not implement the next CONTRACT case in the same GREEN. After all Layer 2 cases are green, run Layer 1 (`make verify`) and Layer 3 when the CONTRACT requires it.

## Slice order

Prefer **vertical behavior slices** (one observable case through the layers it needs). Avoid horizontal “all adapters then all UI” plans that leave no failing test per case.

## Evidence for checker

Branch PROGRESS (or run log) should show, for Layer 2 work:

- RED: command + failure reason (missing behavior)
- GREEN: same command passing
- Then Layer 1 / Layer 3 as required

The checker may **Fail** when Layer 2 applied and RED evidence is missing. See [scoring-rubric.md](../agent/scoring-rubric.md) and [maker-checker.md](maker-checker.md).

## Related

- [Agent loop](agent-loop.md) — outer goal / stop conditions
- [Branch contracts](../agent/branches/README.md)
- [Maker / checker](maker-checker.md)
