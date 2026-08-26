# Cadrage lock (Intent, teach-back, Framer ≠ Maker)

Harness practice: **lock the what before coding the how**. RED → GREEN proves code matches the CONTRACT; this procedure proves the CONTRACT matches human intent and that alternatives were explored.

Full Spec-Driven Development (Diátaxis package, SPEC LOCK, autonomous commit/push) remains **opt-in** outside this harness. This howto is the default path for Patrimo.

Related: [branch contracts](../agent/branches/README.md), [tdd-red-green.md](tdd-red-green.md), [maker-checker.md](maker-checker.md). Hard rule: [CONSTRAINTS.md](../../CONSTRAINTS.md) §25.

## Tiers

| Tier | When | Intent / decisions / teach-back |
|---|---|---|
| **A** | CONTRACT Layer 2 is `n/a` (docs, harness tooling, pure refactor, config, styling, spikes) | Mark sections `n/a` — `branch-ready` skips deep checks |
| **B** | Behavior change (Layer 2 lists targeted tests + cases) | **Required** before Maker codes |

Detect tier from CONTRACT Verification: `Layer 2: n/a` → A; otherwise → B.

## Roles

| Role | Does | Must not |
|---|---|---|
| **Framer** | Fills Intent, behavior cases, product decisions (with alternatives), scope / exclusions | Write production code |
| **Challenger** | Fresh session (preferred); attacks holes in cadrage; Pass/Fail cadrage only | Implement the feature |
| **Human** | Accepts or rejects teach-back scenarios | — |
| **Maker** | Implements after `make branch-ready`; RED → GREEN when Tier B | Reopen cadrage in silence; invent behavior absent from CONTRACT |
| **Checker** | Scores implementation vs CONTRACT after verify | (unchanged — see maker-checker) |

**Framer ≠ Maker** on Tier B: the session (or explicit role) that locks Intent/decisions should not be the sole implementer without a handoff. Prefer a fresh Maker session after teach-back. Challenger is **required** only when the CONTRACT header says `Challenger: required` (new ADR, new workbook sheet, or structuring `@patrimo/core` invariant). Otherwise Challenger is recommended; note skip reason in PROGRESS if skipped.

## Flow

```text
Feature branch → make branch-contract
  → Framer fills CONTRACT (Intent, cases, decisions often still OPEN)
  → Challenger if required (fresh session)
  → Teach-back: 3–5 scenarios → human ✅/❌
  → All decisions LOCKED + teach-back accepted → make branch-ready
  → Maker: RED → GREEN → verify → Checker
```

Do not start Maker work while any product decision is `OPEN` or teach-back is not accepted (Tier B).

## CONTRACT sections (Tier B)

See [CONTRACT template](../agent/branches/_templates/CONTRACT.md).

1. **Intent** — symptom; suspected cause (`fact` | `hypothesis`); lever; success signal; band-aid risk if treating symptom only.
2. **Behavior cases** — nominal / edge / out-of-scope as observable `If … then …` lines. These become Layer 2 RED → GREEN slices.
3. **Product decisions** — table with Status `OPEN` | `LOCKED`, Choice, and **Alternatives considered** (at least one rejected option on structuring decisions, or `n/a — trivial`).
4. **Teach-back** — scenarios listed in CONTRACT; acceptance recorded only in PROGRESS (`- Teach-back: accepted`).
5. **Cadrage roles** — Framer / Challenger / teach-back dates; `Challenger: required | n/a | skipped (reason)`.

## Teach-back (alignment gate)

Before `branch-ready` on Tier B:

1. Framer (or agent in Framer role) writes **3–5 concrete scenarios** from the CONTRACT (numbers, actors, expected outcome — not abstract bullets).
2. Human marks each ✅ or ❌.
3. Any ❌ → reopen CONTRACT (fix Intent/cases/decisions); re-run teach-back.
4. All ✅ → record in branch PROGRESS as a **bullet under Cadrage lock** (this line is what `make branch-ready` greps):

```markdown
## Cadrage lock
- Tier: B
- Teach-back: accepted (YYYY-MM-DD)
```

`make branch-ready` fails Tier B unless PROGRESS shows `- Teach-back: accepted`.

## `make branch-ready`

- Always: artifacts, title, scope, verify layers, exclusions, no PROGRESS blocker (existing checks).
- Tier B additionally: Intent filled; ≥2 behavior cases (nominal/edge); no `OPEN` decisions; teach-back accepted; if `Challenger: required`, Challenger Pass (or date) recorded.

## Paste prompts

### Framer

```text
You are the FRAMER, not the implementer. Do not write production code.
Read CONSTRAINTS.md, glossary, make branch-status, and related ADRs / FEATURES row.
Fill docs/agent/branches/<slug>/CONTRACT.md: Intent, Behavior cases (nominal/edge/out-of-scope),
Product decisions with LOCKED or OPEN + alternatives, Scope, Verification, Exclusions.
Mark Challenger: required if new ADR, new workbook sheet, or structuring core math; else recommended/n/a.
Stop when CONTRACT is ready for Challenger and/or teach-back. Do not run Maker work.
```

### Challenger

```text
You are the CADRAGE CHALLENGER, not the implementer. Do not write feature code.
Read CONSTRAINTS.md and make branch-status (CONTRACT + PROGRESS).
Attack: symptom vs cause vs lever; band-aid risk; missing edge cases; soft exclusions;
decisions without real alternatives; Intent that does not match Layer 2 cases.
Output Cadrage Pass or Fail with concrete CONTRACT edits. Record Pass/Fail + date in PROGRESS.
```

### Teach-back

```text
From the current branch CONTRACT, propose 3–5 concrete teach-back scenarios
(If situation X with numbers Y → expected Z). Do not code.
Wait for the human to accept or reject each scenario. On full accept, write
Teach-back: accepted (date) under Cadrage lock in branch PROGRESS. On any reject, update CONTRACT and retry.
```

## Related

- [Agent loop](agent-loop.md) — Level 0 = cadrage lock; Level 1 = implement
- [Maker / checker](maker-checker.md) — post-verify grade
- [RED → GREEN](tdd-red-green.md) — derive tests from Behavior cases
