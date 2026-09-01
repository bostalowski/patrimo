# Contract: Coasts local runtimes wiring

- Branch: `chore/coasts`
- Slug: `chore-coasts`
- Matrix row (FEATURES.md): n/a — harness / local-runtime tooling only
- Cadrage tier: A (Layer 2 `n/a`)
- Challenger: n/a

## Intent

n/a — Tier A

## Behavior cases

n/a — Tier A

## Product decisions

n/a — Tier A

## Teach-back

n/a — Tier A

## Scope

- [x] One behavior for this branch: Add optional [Coasts](https://coasts.dev) Coastfile + shared agent skill (Cursor + Claude), mirrored from benefits PR #4342, adapted to Patrimo (no compose / no DB; Next on host).
- [x] Files / packages expected to change: `Coastfile`, `.agents/skills/{coasts,patrimo-harness}/`, symlinks under `.cursor` / `.claude`, `.cursor/commands/coasts.md`, `AGENTS.md`, `README.md`, `docs/howto/local-dev-setup.md`, branch CONTRACT/PROGRESS.

## Verification

- Layer 1: `make verify` (docs/tooling only — expect green; no product code)
- Layer 2: n/a
- Layer 3: n/a (no web UI / API / workbook / settings change)
- Feature-specific: Coastfile present; skills load via `.agents` + symlinks; `AGENTS.md` has **Coast Runtime**; classic `npm run dev` still documented as default.

## Exclusions

- Not in this branch: running Next inside Coast (`[services.web]`), docker-compose, Electron/mobile Coast recipes, DoD changes that require Coasts
- Do not refactor unrelated modules

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: wiring complete vs benefits pattern; Coasts optional / not in DoD; no product behavior change

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed — n/a
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier A: scope / verify / exclusions filled → `make branch-ready` before further Maker work.
