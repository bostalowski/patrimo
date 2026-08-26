# Scoring rubric (checker)

Use after the maker’s verify is green. Score each dimension A–D with **cited evidence** (command output, file path + line, test name). Do not pass on vibes.

| Dimension | A | B | C | D |
|---|---|---|---|---|
| Correctness | All required verify layers pass; feature-specific checks pass | Layer 1 + main path pass; edge gaps noted | Partial pass / flaky | Build or verify fails |
| Architecture | Matches CONSTRAINTS + colocated ARCHITECTURE; no domain math outside `@patrimo/core` | Minor doc/code drift, noted | Clear CONSTRAINTS or ownership violation | Serious divergence (duplicate rules, invented sheet names) |
| Scope discipline | Only CONTRACT items; exclusions respected | Small related fix, documented | Unrelated refactor or second feature started | Scope blow-up |
| Tests / evidence | Layered verify + targeted tests; **RED evidence** when Layer 2 applied (command + missing-behavior failure), then green; commands recorded | Main flow covered + green verify; RED missing or thin but Layer 2 was light | Skeleton / unrun tests; or Layer 2 applied with no RED evidence | No runtime proof |
| Docs handoff | Branch PROGRESS (+ run log) updated; glossary/ARCHITECTURE if needed; FEATURES matrix on merge | Branch PROGRESS only | Stale PROGRESS | No handoff |

## Pass / fail

- **Pass:** Correctness A or B; Architecture A or B; no D anywhere; Scope at least B.
- **Fail:** Any D, or Correctness C with no follow-up plan in branch PROGRESS.
- When CONTRACT Layer 2 applies (not `n/a`): treat **missing RED evidence** as Tests / evidence **C** at best; if there is also no green targeted-test proof, score **D** and Fail. See [tdd-red-green.md](../howto/tdd-red-green.md).

## Checker prompt (paste into a fresh session)

```text
You are the CHECKER, not the implementer. Do not write feature code.
Read CONSTRAINTS.md, make branch-status (CONTRACT + PROGRESS), and git diff.
Run the verification commands listed in the CONTRACT.
If CONTRACT Layer 2 applies: require RED evidence in PROGRESS/run log (failing targeted test for missing behavior before prod), then green targeted tests — see docs/howto/tdd-red-green.md and CONSTRAINTS §24.
Score with docs/agent/scoring-rubric.md. Cite evidence. Output Pass or Fail only after the table.
```
