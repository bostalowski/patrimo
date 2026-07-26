# Documentation structure model

Patrimo documentation follows a Diátaxis layout under `docs/`.

## Families

| Family | Answers | Location |
|---|---|---|
| Overview | What is it, why does it exist? | `docs/overview/` |
| Architecture | How does it work inside? | `docs/architecture/` |
| Reference | What is the canonical list / schema / name? | `docs/reference/` |
| How-to | How do I perform X? | `docs/howto/` |
| ADR | Why was this decision taken? | `docs/adr/` |

One page belongs to exactly one family. If a topic needs both a decision and a mechanism, write an ADR plus an architecture page.

## Language

Diátaxis pages, ADRs, and `docs/CLAUDE.md` are written in **English**. Code identifiers, sheet names, enums, paths, and UI labels stay in their original form.

## Anchor pages

Every coding session should load these before changing behavior:

1. [Key principles](docs/overview/key-principles.md)
2. [Foundations](docs/architecture/foundations.md)
3. [Glossary](docs/reference/glossary.md)

A proposal that contradicts a principle, an invariant, or a glossary term must be discussed before it is coded.

## ADR rules

- Copy `docs/adr/_template.md` when adding an ADR.
- Number files `NNNN-slug.md` and list them in `docs/adr/index.md`.
- An ADR needs at least two options considered.
- Status: `proposed` while deciding, `accepted` when shipped.
- Accepted ADRs are append-only. Change course with a new ADR and `superseded-by`.

## Cross-linking

- Architecture pages cite the governing ADR when one exists.
- How-tos execute a procedure and link back to architecture / overview for the why.
- Glossary terms are defined once in `docs/reference/glossary.md` and reused elsewhere.

## What not to invent

Document behaviors that exist in code. When intent is unknown, say so. Do not write retrospective ADRs unless the decision is still active and verified.
