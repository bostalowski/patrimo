# Progress — `bostalowski-test-with-data`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** none — tranche 1 implemented
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md). Tier A: mark teach-back / Challenger `n/a`.

- Tier: A
- Framer session / date: 2026-09-06 (this session)
- Challenger: n/a — harness tooling, no ADR / new sheet / core math
- Teach-back: n/a — Tier A
- `make branch-ready`: pass (10/10, 2026-09-06)

## Done (this branch)

- [x] Committed fixture `data-fixtures/sample-portfolio.xlsx` (3 comptes, 2 actifs, ~14 transactions, manual prices) — fake demo data only.
- [x] `scripts/ensure-dev-data.mjs`: copies the fixture into the data dir and writes `data/config.json` only when no config exists yet; no-op otherwise.
- [x] Wired as `predev` and `preelectron:dev` in `package.json`. Not wired into `build` / `start` / `electron:build` / `electron:pack` / `make e2e` (Playwright calls `next dev` directly, bypassing npm lifecycle hooks).
- [x] Doc note in `docs/howto/local-dev-setup.md`.
- [x] Manual check: removed `data/config.json` + `data/*.xlsx`, ran `npm run dev` — predev auto-seeded, `GET /api/settings` → `configured:true, valid:true`, `/comptes` renders the 3 demo accounts. Re-running with `config.json` present leaves it untouched (verified via direct script run).

## RED evidence (when Layer 2 applies)

n/a — Tier A, Layer 2 not applicable (dev bootstrap script only, no domain/API/UI behavior change).

## Last verify

- Command: `npm run verify`
- Result: pass — 104 test files / 698 tests, lint + typecheck clean
- Date: 2026-09-06

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

## Checker

- Checker: Pass (2026-09-06)
- Checker evidence: `npm run verify` (104 files / 698 tests green, after `npm ci` in the checker worktree) + independent manual repro of `scripts/ensure-dev-data.mjs` (seed then no-op, md5-verified) + diff review confirming Tier A/Layer 2 `n/a` classification — see scoring table below.

Separate agent session (ADR 0030), working dir:
`/Users/bastien.ostalowski/orca/workspaces/patrimo/test-with-data-bostalowski-test-with-data-checker`
(detached worktree, branch `bostalowski/test-with-data`, HEAD `7d5b666`
"feat(dev): auto-seed sample workbook for local dev"). Did not modify any
other file.

### What changed (git show HEAD --stat)

`data-fixtures/sample-portfolio.xlsx` (new, 38258 bytes), `scripts/ensure-dev-data.mjs`
(new, 41 lines), `package.json` (+2 lines: `predev` / `preelectron:dev` hooks),
`docs/howto/local-dev-setup.md` (+8/-1), plus this branch's own CONTRACT.md /
PROGRESS.md. No file under `packages/core`, `src/app/api`, or workbook I/O
production code (`src/lib/store.ts`, `src/lib/config.ts`, etc.) is touched —
Tier A / Layer 2 `n/a` classification in the CONTRACT is justified by the diff.

### Verification run

- **Layer 1** (`npm run verify`, after `npm ci` in the checker worktree —
  `node_modules` was absent there): lint + typecheck clean, **104 test files /
  698 tests passed**, 0 failures. Chained via `&&` so lint/typecheck necessarily
  passed for tests to run at all.
- **Layer 2 / 3**: correctly `n/a` — confirmed by reading the diff (see above).
- **`make gauntlet`** (run for extra evidence though not required by
  CONSTRAINTS §27 since no `@patrimo/core` / workbook I/O / API route file is
  touched): `test-guard: OK`, mutation step **skipped — no packages/core/src
  production files in diff vs origin/main**, duplication signal N/A (no
  changed `.ts`/`.tsx` files — the new script is `.mjs`). Matches the "gauntlet
  expected not to apply" prediction; recorded explicitly rather than skipped
  silently.
- **Manual feature-specific check** (own repro, not just re-reading Maker's
  claim): `FINGRAPHS_DATA_DIR=/tmp/checker-data-dir node scripts/ensure-dev-data.mjs`
  run twice.
  - Run 1 (no `config.json`): seeded `config.json` (`excelPath`,
    `inflationRate: 0.02`, `syncIntervalMinutes: 30`) + copied
    `sample-portfolio.xlsx` (md5 `f9199a6194fa8aaed3843f80d3696437`, identical
    to `data-fixtures/sample-portfolio.xlsx`).
  - Run 2 (`config.json` now present): printed "already present — leaving
    existing configuration untouched", exit 0, files unchanged (same md5,
    same mtime-unchanged listing).
  - `FINGRAPHS_DATA_DIR` is the pre-existing convention used elsewhere
    (`src/lib/config.ts`, `src/lib/store.ts`, `playwright.config.ts`,
    several `*.test.ts` files) — the script matches existing conventions,
    not an invented one.
  - Read `package.json`: `build`, `start`, `electron:build`, `electron:pack`
    scripts are byte-for-byte unchanged; only `predev` and `preelectron:dev`
    were added. Confirms CONTRACT decision D3 (release safety).
  - Opened `data-fixtures/sample-portfolio.xlsx` with the `xlsx` lib: sheets
    `Transactions` (14 data rows), `Actifs` (2), `Comptes` (3), plus optional
    sheets (`Budget`, `Immobilier`, `DCA`, `Prix manuels`, `Taxe foncière`,
    `Exposition geo`, `Exposition secteur`, `Cibles diversification`,
    `Objectifs`, `Fonds urgence`) — matches PROGRESS's "3 comptes, 2 actifs,
    ~14 transactions" claim, required sheets present, no legacy `Allocation
    cible` sheet (CONSTRAINTS §11).

### Finding (minor, not a Correctness/Architecture blocker)

CONTRACT.md "Scope" line 40 lists an expected file
`scripts/generate-sample-workbook.mjs` that was **never created** (`git log
--all` for that filename returns nothing, and it's absent from the working
tree). The fixture `.xlsx` must have been produced ad hoc (e.g. one-off local
script or manual edit) rather than by a committed, reproducible generator.
This is a CONTRACT-vs-diff inaccuracy (docs drift within the branch's own
cadrage artifact), not a CONSTRAINTS or ARCHITECTURE violation — but it means
regenerating/tweaking the sample workbook later has no committed tool to do
it with. Worth a follow-up note or CONTRACT correction; not blocking.

### coherence-code-doc / clean-code perspective

- `docs/howto/local-dev-setup.md` update accurately describes the script's
  actual behavior (verified against the manual repro above): fixture path,
  destination, "never overwrites existing config.json", and the "production
  builds never run this" claim all check out.
- No ADR / ARCHITECTURE.md / glossary entry needed or affected — this is
  harness/dev-tooling only, no domain concept introduced.
- `scripts/ensure-dev-data.mjs` placement matches existing convention (`.mjs`
  scripts already live in `scripts/`, e.g. `check_portfolio.mjs`,
  `migrate_livret_to_account.mjs`). No duplication, no premature abstraction,
  ~41 lines, single responsibility (seed-if-absent), uses the codebase's
  existing `FINGRAPHS_DATA_DIR` override convention correctly.

### Scoring (docs/agent/scoring-rubric.md)

| Dimension | Score | Evidence |
|---|---|---|
| Correctness | A | `npm run verify`: 104/104 files, 698/698 tests green, lint+typecheck clean (after `npm ci` in this worktree). Feature-specific manual check (seed + no-op re-run) reproduced independently with matching md5. |
| Architecture | B | No domain math outside `@patrimo/core`; nothing in `packages/core`/`src/app/api`/workbook I/O touched; matches CONSTRAINTS §14-18. Downgraded from A only for the minor CONTRACT-vs-diff drift noted above (`generate-sample-workbook.mjs` listed but absent) — doc drift, not a code/ownership violation. |
| Scope discipline | A | Diff matches CONTRACT scope (minus the one absent script, which is under-delivery not scope creep); Exclusions respected — no Dockerfile, no production/release script change, no workbook schema change; `make gauntlet` confirms no `@patrimo/core` file touched. |
| Tests / evidence | A | Layer 2/3 correctly `n/a` (Tier A, verified from diff); Layer 1 green with command + counts recorded above; feature-specific behavior independently reproduced (not just re-reading Maker's claim), including a second, fresh reproduction of the no-op path. |
| Docs handoff | B | Branch PROGRESS (Done / Last verify) filled and accurate; `local-dev-setup.md` accurate; CONTRACT has the one drift noted above (expected file never delivered) — minor, noted here rather than silently passed. |

No D on any dimension. Correctness A, Architecture B, Scope A — all ≥ B,
no D anywhere → passes the rubric's Pass bar (Tier A: RED evidence / teach-back
correctly n/a, not counted against Tests/evidence or Docs handoff).

**Pass**

## Post-checker fix (Maker)

- Addressed the Checker's "minor finding": `CONTRACT.md` Scope line referenced
  a `scripts/generate-sample-workbook.mjs` that was never committed (the
  fixture was built with a one-off local script, not kept). Corrected in
  commit `fe12ade` — the line now states the fixture was built with a one-off
  local generator, not committed, and the fixture itself is the durable
  artifact. No code change; doc-only, does not require re-running Checker.
