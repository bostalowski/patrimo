# Contract: Document Coast Alpine/small-icu hydration quirk

- Branch: `bostalowski/coast-icu-hydration-note`
- Slug: `bostalowski-coast-icu-hydration-note`
- Matrix row (FEATURES.md): n/a for harness-only
- Cadrage tier: A (Layer 2 `n/a`)
- Challenger: n/a — trivial doc-only change

## Intent

n/a — Tier A

Context (informational): testing this app inside a Coast (Alpine Node,
small-icu — confirmed via `Intl.NumberFormat.supportedLocalesOf(["fr-FR"])`
returning `[]`) produces a React hydration mismatch on any French-locale
formatted value (e.g. `+5.2%` server vs `+5,2 %` client), because the
Alpine Node build silently resolves `"fr-FR"` to `"en-US"` server-side.
`packages/core/src/format.ts` already hardcodes `"fr-FR"` correctly — this
is an environment gap (Coast's base Node image), not an app defect, and does
not reproduce on host (full-ICU Node, verified) or packaged Electron
(bundled Node, not Alpine). Goal: document this so it is not mistaken for a
real regression in future sessions, without adding a fragile `full-icu`
dependency (its data blob must match the exact ICU version compiled into
Node and needs a network fetch at install time) for what is a testing-only
artifact.

## Behavior cases

n/a — Tier A

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | Fix location | LOCKED | Document the limitation in `.agents/skills/coasts/SKILL.md` (Patrimo specifics); no code/dependency change | (a) bundle `full-icu` npm package + `NODE_ICU_DATA` wiring in `dev`/`start` scripts — rejected: fragile network-dependent install, unverified compatibility with Node 24 / ICU 78, fixes a testing-only artifact; (b) fix inside Coast's own Docker base image — rejected: outside this repo's ownership (Coastfile doesn't control the Coast platform's Node binary) |

## Teach-back

n/a — Tier A

## Scope

- [x] One behavior for this branch: document the Coast Alpine/small-icu French-locale hydration quirk; keep the incidental `Coastfile` `worktree_dir` addition (Orca path) that `coast run` had already written locally.
- [x] Files / packages expected to change: `.agents/skills/coasts/SKILL.md`, `Coastfile`.

## Verification

- Layer 1: `make verify`
- Layer 2: n/a (doc/config only, no production code)
- Layer 3: n/a (no web UI / API / workbook I/O / settings change)
- Feature-specific: n/a — nothing to run; content reviewed for accuracy against the diagnosis reproduced live in a Coast (`Intl.NumberFormat.supportedLocalesOf(["fr-FR"])` → `[]`, `resolvedOptions().locale` → `"en-US"`).

## Tranches

| # | Tranche | Behavior cases covered | Layers | PR / commit |
|---|---|---|---|---|
| 1 | Document Coast ICU quirk + Orca worktree_dir | n/a | 1 | not yet shipped |

## Exclusions

- Not in this branch: any `full-icu` dependency, any change to `packages/core/src/format.ts` or other application code, any change to the Coast platform itself.
- Do not refactor unrelated modules.

## Checker

- [x] Trivial doc-only change — checker skipped per [maker-checker.md](../../howto/maker-checker.md) ("Trivial doc-only or comment-only changes may skip checker").

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed (n/a expected)
- [ ] Append / refresh the [rework-log](../../rework-log.md) row **in this PR** via `make rework-log-stamp`
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier A: sections above marked `n/a — Tier A`; `make branch-ready` skips deep checks.
