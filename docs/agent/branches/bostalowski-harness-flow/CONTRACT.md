# Contract: Feature flow — cadrage to merge (executable gates)

- Branch: `bostalowski/harness-flow`
- Slug: `bostalowski-harness-flow`
- Matrix row (FEATURES.md): n/a — harness-only
- Cadrage tier: B (behavior — new scripts have testable behavior)
- Challenger: required — new ADR (0026) + new CONSTRAINTS clauses

## Intent

- Symptom (who / when / pain): Agent sessions on this repo follow a strong cadrage-to-code discipline (cadrage lock, RED→GREEN, maker/checker) but the discipline **stops before the PR**. `pr-checklist.md` is a checklist a human/agent ticks by hand; CI only runs `make verify`/`make e2e`. Nothing machine-checks that `branch-ready` passed, that RED evidence exists, or that a Checker Pass was recorded, before merge. Large CONTRACTs (e.g. `feat-realestate-loan-insurance-modes`, ~20 behavior cases across core+web+mobile+ADR) become one large PR.
- Suspected cause (`fact`): `pr-checklist.md` and the Checker role are declarative — enforced by convention, not by a command with an exit code. Confirmed by reading `pr-checklist.md` (pure checkboxes) and `.github/workflows/ci.yml` (only `verify` + `e2e` jobs — no harness/pr-check job). No control detects a weakened/removed test. (`fact` — read `pr-checklist.md`, `.github/workflows/ci.yml`, `maker-checker.md`, `branch-ready.sh` this session.)
- Lever (where we act on the cause): Add executable gates (`make red`, `make gauntlet`, `make pr-check`, `make checker`) that make the existing procedures (RED evidence, test-removal guard, Checker Pass, PR readiness) machine-checkable and CI-replayable; add a **Tranches** unit under a CONTRACT so a feature ships as stacked small PRs instead of one large PR; add mutation testing scoped to `packages/core` as a feedback control; use a plain `git worktree` (no IDE/tool preference) to make the Checker's "fresh session" structurally isolated instead of self-declared.
- Success signal (observable): (1) `make pr-check` fails on a branch missing RED evidence, a stale/absent/uncited Checker Pass, or a Tranches table with an unassigned behavior-case ID, and passes on a conforming branch; (2) `make gauntlet` fails when a test is deleted/`.skip`'d without a `Test-removal-justified:` line, and fails on a surviving mutant in a changed `packages/core` file above threshold; (3) CI runs `make pr-check` on every PR (new `harness` job); (4) `docs/howto/feature-flow.md` + ADR 0026 describe the G0→G7 flow as the canonical path, referenced from `AGENTS.md`; (5) `make checker` spawns a role in a separate plain `git worktree` whose diff is checked to touch only `PROGRESS.md`.
- Band-aid risk (if we only treat the symptom): Writing `feature-flow.md` as prose without wiring `make pr-check` into CI, or accepting an uncited "Checker: Pass" line at face value, would look like progress but leaves the exact METR-style gap this branch targets: humans (and agents) self-report "done" without a runtime check.

## Behavior cases

Tier A: `n/a — Tier A`. Tier B: observable cases → Layer 2 RED → GREEN slices.
Each case has a stable ID (`N#`/`E#`); the Tranches table below references cases **only by ID** — no free-text qualifiers — so `branch-ready` can check every ID is assigned.

### Nominal

- [x] N1: If a targeted test command **passes**, then `make red CASE="…" CMD="…"` refuses to write RED evidence to PROGRESS and exits non-zero.
- [x] N2: If a targeted test command **fails**, then `make red CASE="…" CMD="…"` appends a RED evidence block to branch PROGRESS.md (case, command, failure excerpt, git SHA, date) and exits 0.
- [x] N3: If the diff vs base branch deletes a test file, removes a `test(`/`it(` block, or adds `.skip`/`.only` without a `Test-removal-justified:` line anywhere in branch PROGRESS.md, then `make gauntlet` (via `test-guard.sh`) fails with the offending file(s) named.
- [x] N4: If the diff vs base does the same but branch PROGRESS.md contains a `Test-removal-justified: <reason>` line, then that check in `make gauntlet` passes.
- [x] N5: If branch PROGRESS.md has no `Checker: Pass` line, or one dated before the latest code commit, then `make pr-check` fails naming that gap.
- [x] N6: If branch PROGRESS.md has `Checker: Pass (YYYY-MM-DD)` dated on/after the latest code commit's date, with cited evidence (a rubric table or command output referenced) and `branch-ready` passes and every behavior-case ID in the CONTRACT is referenced by at least one Tranches row, then `make pr-check` passes.
- [x] N7: If a Tier B CONTRACT's `## Tranches` table exists, then `make branch-ready` extracts every `N#`/`E#` token from `## Behavior cases` and every `N#`/`E#` token from the Tranches table's "Behavior cases covered" column; any Behavior-case ID missing from the Tranches column fails the gate, naming the missing ID(s).
- [x] N8: If `packages/core/src/**` files are in the diff, then `make gauntlet` runs Stryker mutation testing scoped to exactly those changed files (not the whole package) and fails on a surviving mutant in a changed file above the thresholds configured in `stryker.conf.json` (break < 80, warn < 90, computed per changed-file subset — see D3).
- [x] N9: If no `packages/core/src/**` files are in the diff, then the mutation step of `make gauntlet` is reported as `skipped` (not silently green, not run).
- [x] N10: If `scripts/role-worktree.sh` prints a Framer/Challenger/teach-back prompt, it reads that text verbatim from `docs/howto/cadrage-lock.md`; if it prints the Checker prompt, it reads it verbatim from `docs/agent/scoring-rubric.md` — neither prompt's text is duplicated inside `role-worktree.sh` itself.
- [x] N11: If `make pr-check` runs and `docs/agent/rework-log.md` has no row referencing the current branch's slug, it prints a non-blocking reminder to add one after merge (does not fail the gate — D8 stays manual/non-automated).

### Edge

- [ ] E1: If `make red` is called with a `CMD` that errors for a reason unrelated to the test (bad path, syntax error in the test file itself), the RED evidence written is not validated as "for the right reason" — `red-evidence.sh` can only see the exit code, so this remains a documented limitation: the Maker/Checker must still confirm the failure reason by hand per `tdd-red-green.md`.
- [x] E2: If the current branch is `main`/`master`, `make red`/`make gauntlet`/`make pr-check`/`make checker` all refuse (mirrors existing `branch-ready.sh` guard).
- [x] E3: If a CONTRACT's Verification section marks Layer 2 not applicable (Tier A), `make gauntlet`'s mutation step and `make red` are not required; `make pr-check` skips the RED-evidence and Tranches-ID checks but still checks Checker Pass recency/citation and reports diff size.
- [x] E4: If the diff has no `packages/core` files and no test file changes at all, `test-guard.sh` passes trivially (nothing to guard).
- [ ] E5: If two or more Tranches rows both reference the same behavior-case ID, `branch-ready` does not need to detect the overlap (out of scope — a human/Framer/Challenger review catch, not a machine gate this branch adds).
- [x] E6: If `Checker: Pass` is recorded in PROGRESS with no cited evidence (no rubric table, no command output, no reference to what was checked), `make pr-check` fails naming the missing citation.
- [x] E7: If the Checker's worktree diff touches any file other than its own branch's `PROGRESS.md`, `scripts/role-worktree.sh checker` (or a check invoked by it) fails, enforcing D4's write-scope claim.
- [x] E8 (amended 2026-09-05 — D4 simplified, see below): `make checker` always creates a plain `git worktree add --detach` for the Checker — no IDE/tool preference, no external dependency — a separate directory with a vanilla-git-isolated context, and still refuses to run on `main`/`master`.

### Out of scope

- [ ] Explicitly not in this branch: rewriting `@patrimo/core` domain logic; touching the open `feat/realestate-loan-insurance-modes` branch or its worktree; enforcing a hard diff-size limit that blocks merge (informational CI comment only, per D1); full automation of Framer/Challenger spawning beyond a script that creates the worktree and prints the existing paste-prompts; mutating `docs/adr/0026-*` or any other existing ADR; detecting overlapping Tranches-row case assignment (E5); validating a RED failure is "for the right reason" beyond exit code (E1).

## Product decisions

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 — Unit of work | What ships as one reviewable increment | LOCKED (amended 2026-09-04 after opening tranche 1's PR) | New **Tranches** table in the CONTRACT template: `# / Tranche / Behavior cases covered (IDs only) / Layers / PR`. All tranches land as **commits on this one branch** (`bostalowski/harness-flow`), reviewed as **one PR (#78) updated incrementally, one commit (or small commit group) per tranche** — reviewed via GitHub's Commits view, not as separate PRs. `branch-ready`/`pr-check` keep resolving the slug from the single shared branch throughout, unchanged from today's one-branch-one-slug convention. | Separate PR per tranche, gated on merging the previous one before pushing the next (originally chosen; **reverted** — GitHub PRs diff branch→base, not a commit range, so pushing tranche 2 to the same branch would have silently grown tranche 1's already-open PR; that mechanic requires either a merge-per-tranche human cadence or child branches, both worse per the alternatives below); separate child branch per tranche (rejected — Challenger found this needs a new CONTRACT-resolution fallback in `branch-ready.sh` for child branches with no CONTRACT of their own; adds a mechanism this branch doesn't need); keep "1 CONTRACT = 1 PR with no internal structure" (rejected — the exact large-PR problem this branch targets — the Tranches table + incremental commits still give reviewable units even inside one PR); hard line-count merge block (rejected — arbitrary threshold blocks legitimate mechanical diffs; chose informational CI comment instead) |
| D2 — Non-lyable evidence | How RED evidence stops being copy-pasted narrative | LOCKED | `scripts/red-evidence.sh` actually **runs** the test command and refuses to write on exit 0 | Keep RED evidence as free-text the Maker types by hand (status quo; rejected — exactly what METR's self-report gap warns against) |
| D3 — Feedback control on core | Which control catches weakened tests / weak math coverage | LOCKED | Two controls: (a) `test-guard.sh` — structural diff check for deletions/`.skip`/`.only`; (b) Stryker mutation testing scoped to changed `packages/core/src/**` files only, thresholds in `stryker.conf.json`: **break < 80, warn < 90**, computed only over the changed-file subset (never the whole package's historical score) | Full-repo mutation testing (rejected — too slow, blocks unrelated PRs on historical debt); mutation testing only, no structural guard (rejected — Stryker doesn't catch "test deleted entirely", only "test too weak"); leaving the threshold undecided for the Maker to pick mid-implementation (rejected per Challenger — would resurface as an open question) |
| D4 — Checker isolation | How "fresh session" stops being self-declared | LOCKED (amended 2026-09-05) | `make checker` = `scripts/role-worktree.sh checker`: **always** creates a plain `git worktree add --detach` — no IDE/tool preference — spawns the Checker in a separate worktree, and a diff check (E7) fails if the Checker's worktree touches anything besides `PROGRESS.md` | Keep checker as "open a new chat window, paste this prompt" (status quo; rejected — no structural guarantee of a clean context or of write-scope limits, and Challenger found nothing previously verified the write-scope claim); **prefer an Orca-managed worktree when available, falling back to plain git otherwise (original choice, reverted 2026-09-05)** — rejected on human review: the E7 write-scope check only needs a known worktree path to diff against, so it enforces identically regardless of how the worktree was created; preferring one specific tool bought no extra correctness or isolation, only an optional convenience for whoever happens to have that tool installed, at the cost of no longer being trivially "the same for every IDE/agent" — simplicity won given the isolation guarantee was already 100% carried by plain git |
| D5 — CI enforcement | Where gates run besides local `make` | LOCKED | New `harness` CI job runs `make pr-check` on `pull_request`; separate `size` job posts an informational diff-size comment (no blocking) | Block merge on diff size (rejected, see D1); rely on local `make pr-check` only with no CI mirror (rejected — an agent could skip it locally; CI is the actual gate) |
| D6 — Mutation tool | Stryker vs alternatives | LOCKED | `@stryker-mutator/core` + `@stryker-mutator/vitest-runner` — repo already on `vitest run`, first-class Stryker support | Custom hand-rolled mutation script (rejected — reinventing a mature tool); skip mutation testing entirely and rely only on test-guard (rejected — doesn't catch "test exists but asserts nothing useful", the Radar/Uncle Bob-cited gap) |
| D7 — Prompt duplication | Where role prompts live | LOCKED | Single source of truth: Framer/Challenger/teach-back prompts stay in `cadrage-lock.md`; Checker prompt stays in `scoring-rubric.md`. `role-worktree.sh` reads/prints them (N10), never re-types them. | Duplicate prompts into a new `role-worktree.sh`-adjacent doc for convenience (rejected — exactly the "cognitive debt" duplication risk the branch itself targets) |
| D8 — Post-merge signal | How we know the flow is working | LOCKED | New `docs/agent/rework-log.md`: one row per merged feature, incremented if a follow-up fix lands on the same area within 30 days. Manually appended on merge; `make pr-check` only prints a non-blocking reminder if the current slug has no row yet (N11) — no automation beyond that this branch. | Full DORA-metrics dashboard/tooling (rejected — out of proportion for a local single-user repo); no signal and no reminder at all (rejected — Challenger found Success signal implied more automation than D8 actually delivers; the reminder closes that gap honestly without adding real automation) |

## Teach-back

- [ ] Scenario 1: Je démarre `feat/xyz`, ma CONTRACT liste des cas N1–N7/E1–E3 répartis en 3 tranches (core / web / mobile) dans la table Tranches (colonnes listant les IDs, ex. `N1, N2, E1`). `make branch-ready` échoue tant qu'un ID n'apparaît dans aucune ligne de la table Tranches ; une fois tous rattachés, il passe.
- [ ] Scenario 2: Je code la tranche "core", je lance `make red CASE="CRD mode" CMD="npm test -- packages/core/src/realestate/insurance"` alors que le test passe déjà (comportement déjà présent) → le script refuse d'écrire une preuve RED et sort en erreur, m'obligeant à écrire le test avant le code.
- [ ] Scenario 3: Un agent Maker supprime un test existant dans son diff sans rien noter → `make gauntlet` échoue et nomme le fichier de test supprimé ; s'il ajoute `Test-removal-justified: le test doublonnait X` dans PROGRESS, `make gauntlet` repasse au vert sur ce point.
- [ ] Scenario 4: Je lance `make pr-check` juste après un `git commit` de code sans avoir relancé le Checker → échec car le dernier `Checker: Pass` est daté avant ce commit (ou n'a pas de preuve citée). Après un nouveau `make checker` (worktree isolé) qui écrit un Pass frais avec preuve, `make pr-check` passe.
- [ ] Scenario 5: Ma PR modifie `packages/core/src/realestate/loan.ts` → `make gauntlet` lance Stryker uniquement sur ce fichier (pas tout `packages/core`) et échoue si le score de mutation sur ce fichier tombe sous 80 ; une PR qui ne touche pas `packages/core` voit cette étape marquée "skipped", pas verte par défaut.

## Scope

- [x] One behavior for this branch: turn the existing cadrage→PR discipline into executable, CI-replayable gates (tranches, RED evidence, test-removal/mutation gauntlet, PR checklist, isolated checker), documented as one canonical flow.
- [x] Files / packages expected to change:
  - Docs: `docs/adr/0026-feature-flow-cadrage-to-merge.md` (new, done), `docs/adr/index.md` (done), `docs/howto/feature-flow.md` (new, done), `docs/howto/{pr-checklist,maker-checker,cadrage-lock}.md`, `docs/agent/scoring-rubric.md`, `docs/agent/rework-log.md` (new), `docs/agent/branches/_templates/CONTRACT.md`, `AGENTS.md`, `CONSTRAINTS.md`, `.agents/skills/patrimo-harness/SKILL.md`, `Coastfile`
  - Scripts: `scripts/{red-evidence,test-guard,gauntlet,pr-check,pr,flow-status,role-worktree}.sh`, `scripts/lib/diff.sh`, extend `scripts/branch-ready.sh`
  - Build/CI: `Makefile`, `package.json` scripts, `.github/workflows/ci.yml`, `.github/pull_request_template.md` (new), `stryker.conf.json` (new), devDeps `@stryker-mutator/core` + `@stryker-mutator/vitest-runner`
  - Tests: new `scripts/*.test.ts` exercising each script against a fixture repo/dir

## Verification

- Layer 1: `make verify`
- Layer 2: `npm test -- scripts` — behavior cases above (N1–N11, E1–E8) as RED → GREEN slices, each script's fixture-driven test
- Layer 3: n/a — no web UI / API route / workbook I/O / settings path changes in this branch
- Feature-specific: `make gauntlet` green on this branch's own diff (dogfooding); `make pr-check` green before pushing each tranche's commit(s) to PR #78

When Layer 2 applies, makers follow [tdd-red-green.md](../../howto/tdd-red-green.md) (CONSTRAINTS §24).
Tier B cadrage: [cadrage-lock.md](../../howto/cadrage-lock.md) (CONSTRAINTS §25) before Maker.

## Tranches

One tranche = one reviewable commit (or small commit group) on this single branch, all landing in **one PR ([#78](https://github.com/bostalowski/patrimo/pull/78)), reviewed incrementally** (D1, amended after tranche 1 — see D1 alternatives for why "one PR per tranche" was reverted). Each row's "Behavior cases covered" lists **case IDs only** — `make branch-ready` (N7) parses these tokens.

| # | Tranche | Behavior cases covered | Layers | Commit |
|---|---|---|---|---|
| 1 | Flow doc + ADR + CONSTRAINTS clauses (Tier A slice, no new script behavior) | E3 | L1 only | `82c6178`, `ab45230` (D1 amendment) |
| 2 | Executable gates: `red-evidence`, `test-guard`, `pr-check` (non-mutation part), `branch-ready` extension (N7), `scripts/lib/diff.sh` | N1, N2, N3, N4, N5, N6, N7, E1, E2, E4, E5, E6 | L1 + L2 | `030570c` |
| 3 | PR template + CI `harness`/`size` jobs | N5, N6 | L1 (CI config only) | `d7aa5e2` |
| 4 | Stryker mutation testing scoped to `packages/core` diff, folded into `gauntlet` | N8, N9 | L1 + L2 | `8bbe571` |
| 5 | `role-worktree.sh` (Checker in isolated plain `git worktree`, no IDE/tool preference — renamed and simplified 2026-09-05, was `orca-role.sh`) + patrimo-harness skill update | E7, E8, N10 | L1 + L2 (script smoke) | `33387c4`, amended `0754ff6` |
| 6 | `coherence-code-doc`/`clean-code` wiring into Checker prompt, duplication check in gauntlet, `rework-log.md` + `pr-check` reminder | N11 | L1 (+ L2 for the reminder/duplication check pieces) | `a80b485` |

## Exclusions

- Not in this branch: any change to `@patrimo/core` domain math, workbook schema, or the open `feat/realestate-loan-insurance-modes` branch/worktree; a hard diff-size merge block; a full DORA metrics dashboard; rewriting existing ADRs other than adding this branch's own new ADR; detecting overlapping Tranches-row assignments (E5); validating a RED failure's reason beyond exit code (E1); any external tool dependency for Checker isolation — plain `git worktree` is the only mechanism (amended 2026-09-05, see D4)
- Do not refactor unrelated modules (envelopes, DCA, goals, livret rates, real estate insurance)

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when Layer 2 applied; Tier B teach-back / cadrage lock recorded when Layer 2 applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix — n/a (harness-only, no product feature row)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)
- [ ] Append a row to `docs/agent/rework-log.md` for this feature once merged

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass if `Challenger: required`, then `make branch-ready` must pass before coding.
