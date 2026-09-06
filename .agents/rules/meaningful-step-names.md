---
description: Process steps and DoD bands must use meaningful slugs, never opaque G# / Layer N codes
alwaysApply: true
---

<!--
Canonical: .agents/rules/meaningful-step-names.md
Exposed to IDEs via symlink:
  .cursor/rules/meaningful-step-names.mdc → this file (Cursor)
  .claude/rules/meaningful-step-names.md  → this file (Claude Code)
Also listed in AGENTS.md (Copilot / any agent that loads AGENTS).
-->

# Meaningful step names (slugs)

When talking about harness steps, Definition of Done bands, or any sequenced
process: **lead with a slug that states what the step does**. Never refer to a
step by a bare letter/number code alone (`G3`, `Layer 3`, `L2`).

## Canonical DoD bands

| Slug | Command | Meaning |
|---|---|---|
| `verify-static` | `make verify` | lint + typecheck + unit tests (always) |
| `verify-behavior` | targeted `npm test -- <path>` | behavior change / CONTRACT cases |
| `verify-e2e` | `make e2e` / `make verify-full` | Playwright system smoke when web UI, API, workbook I/O, or settings change |

## Canonical feature-flow gates

| Slug | Command | Meaning |
|---|---|---|
| `branch-contract` | `make branch-contract` | scaffold CONTRACT + PROGRESS |
| `branch-ready` | `make branch-ready` | cadrage locked |
| `red-evidence` | `make red …` | failing targeted test before prod code |
| `dod-verify` | `make verify` (+ `make e2e` when `verify-e2e` applies) | DoD for the tranche |
| `gauntlet` | `make gauntlet` | test-removal guard + scoped mutation |
| `checker` | `make checker` | separate-agent score → PROGRESS |
| `pr-check` | `make pr-check` | gates recorded; ready to push/open PR |
| `merge` | merge to main | FEATURES / archive handoff |

## Do

- Say: « on est au gate `dod-verify` (`make verify` + `make e2e` si UI) »
- Say: « `verify-e2e` s’applique parce que la PR touche le front »
- In new CONTRACT/PROGRESS: write `verify-static` / `verify-behavior` / `verify-e2e`

## Don't

- Say « Layer 3 » or « G3 » without the slug meaning in the same sentence
- Invent new opaque codes (`L3`, `gate 4`, `étape B`) for process steps
- Assume the reader memorized a legend

Legacy docs/scripts may still mention `Layer N` / `G#`; when editing them,
prefer the slug. Scripts that parse CONTRACTs accept both forms.
