# Documentation model

Harness-first layout. Diátaxis families are **not** required. Put knowledge where agents find it next to the code they change.

## Map

| Kind | Answers | Location |
|---|---|---|
| Entry / router | What is this, how to run/verify, what to read | [AGENTS.md](../AGENTS.md) |
| Hard constraints | MUST / MUST NOT | [CONSTRAINTS.md](../CONSTRAINTS.md) |
| Session state | Done / in-progress / blocked | [PROGRESS.md](../PROGRESS.md) |
| Feature scope | What exists, what is in flight | [FEATURES.md](../FEATURES.md) |
| Mechanics | How this package works | Colocated `ARCHITECTURE.md` (+ topic notes beside modules) |
| Decisions | Why we chose X | [docs/adr/](adr/) |
| Names | Canonical vocabulary | [docs/reference/glossary.md](reference/glossary.md) |
| Procedures | How do I perform X | [docs/howto/](howto/) |
| Platform gaps | Current web vs mobile | [docs/overview/platforms.md](overview/platforms.md) |

## Language

Docs and ADRs are written in **English**. Code identifiers, sheet names, enums, paths, and UI labels stay in their original form.

## Rules

1. Prefer colocated mechanics over central architecture essays.
2. Prefer linking over restating. ADRs own the decision; ARCHITECTURE owns the current mechanism.
3. Keep sheet names, enums, and reserved identifiers identical to `@patrimo/core`.
4. Document behaviors that exist in code. When intent is unknown, say so.
5. Do not invent retrospective ADRs unless the decision is still active and verified.
6. When you change code under a package, update that package’s `ARCHITECTURE.md` (or topic note) in the same change when the map would otherwise lie.

## ADR rules

- Copy [adr/_template.md](adr/_template.md) when adding an ADR.
- Number files `NNNN-slug.md` and list them in [adr/index.md](adr/index.md).
- An ADR needs at least two options considered.
- Status: `proposed` while deciding, `accepted` when shipped.
- Accepted ADRs are append-only. Change course with a new ADR and `superseded-by`.

## Legacy

[DOC_STRUCTURE_MODEL.md](../DOC_STRUCTURE_MODEL.md) redirects here. Stubs under `docs/architecture/` point at colocated files.
