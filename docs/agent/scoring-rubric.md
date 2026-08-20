# Scoring rubric (checker)

Use after the maker’s verify is green. Score each dimension A–D with **cited evidence** (command output, file path + line, test name). Do not pass on vibes.

| Dimension | A | B | C | D |
|---|---|---|---|---|
| Correctness | All required verify layers pass; feature-specific checks pass | Layer 1 + main path pass; edge gaps noted | Partial pass / flaky | Build or verify fails |
| Architecture | Matches CONSTRAINTS + colocated ARCHITECTURE; no domain math outside `@patrimo/core` | Minor doc/code drift, noted | Clear CONSTRAINTS or ownership violation | Serious divergence (duplicate rules, invented sheet names) |
| Scope discipline | Only sprint-contract items; exclusions respected | Small related fix, documented | Unrelated refactor or second feature started | Scope blow-up |
| Tests / evidence | Layered verify + targeted tests; commands recorded | Main flow covered | Skeleton / unrun tests | No runtime proof |
| Docs handoff | PROGRESS (+ run log) updated; glossary/ARCHITECTURE if needed | PROGRESS only | Stale PROGRESS | No handoff |

## Pass / fail

- **Pass:** Correctness A or B; Architecture A or B; no D anywhere; Scope at least B.
- **Fail:** Any D, or Correctness C with no follow-up plan in PROGRESS.

## Checker prompt (paste into a fresh session)

```text
You are the CHECKER, not the implementer. Do not write feature code.
Read CONSTRAINTS.md, the sprint contract in docs/agent/runs/ (or PROGRESS), and git diff.
Run the verification commands listed in the contract.
Score with docs/agent/scoring-rubric.md. Cite evidence. Output Pass or Fail only after the table.
```
