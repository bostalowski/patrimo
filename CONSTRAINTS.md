# Hard constraints

MUST / MUST NOT rules for Patrimo. Violate none of these without an accepted ADR that supersedes them.

Canonical names: [docs/reference/glossary.md](docs/reference/glossary.md).
Mechanics live in colocated `ARCHITECTURE.md` files (see [docs/DOC_MODEL.md](docs/DOC_MODEL.md)).

## Product

1. MUST treat the Excel `.xlsx` workbook as the source of truth for portfolio state (transactions, assets, accounts, budget, real estate, DCA, manual prices, geographic/sector exposure, diversification targets, financial goals).
2. MUST NOT treat `prices.json`, mobile AsyncStorage automatic prices, or other local caches as recoverable portfolio history.
3. MUST keep tax figures indicative (simplified French-tax heuristics in `@patrimo/core`). MUST NOT present them as a filing engine or legal advice.
4. MUST keep the product local-first: network only for price sources, regulated Livret A/LDDS rate series (see [ADR 0024](docs/adr/0024-livret-official-rate-series.md)), optional Drive, and release checks.
5. MUST document platform capability gaps as current state until closed ([FEATURES.md](FEATURES.md), [docs/overview/platforms.md](docs/overview/platforms.md)). Feature parity is direction, not a guarantee.

## Domain ownership

6. MUST put portfolio math, schema validation, tax estimates, projection, and deletion rules in `packages/core` (`@patrimo/core`).
7. MUST NOT duplicate deletion, PRU, tax, or other workbook-meaning rules outside `@patrimo/core`.
8. MUST update `packages/core/src/schema.ts`, `workbook-template.ts`, and both platform serializers together when adding a workbook field or sheet.
9. MUST keep behavioral rules that mutate workbook meaning in `@patrimo/core` so web/Electron and mobile cannot diverge silently.

## Workbook & identity

10. MUST require sheets `Transactions`, `Actifs`, and `Comptes` on a valid workbook. Optional sheets are created when first needed.
11. MUST ignore legacy sheet `Allocation cible` on read and remove it on write.
12. MUST treat `__NO_ACCOUNT__` as a reserved transaction reference, not a `Comptes` row. MUST NOT offer `__NO_ACCOUNT__` or `__UNASSIGNED_CASH__` as user-selectable entities when creating data.
13. MUST compute positions from workbook transactions plus latest known prices. Removing a price-cache entry MUST NEVER remove a transaction.

## Persistence & platforms

14. MUST perform pure core mutations in memory; platforms persist with one workbook write.
15. MUST NOT undo a successful workbook write when price-cache cleanup fails.
16. MUST use last-writer-wins for concurrent edits of the same workbook (no distributed lock).
17. Web MUST prefer `data/config.json` `excelPath` over `EXCEL_PATH`.
18. Web `writeWorkbook` MUST write a temp file then `renameSync` onto the target (atomic replace).

## Agent stop criteria

19. MUST NOT declare a task done without green verification for the change set:
    - Layer 1 (always): `make verify` (lint + typecheck + unit tests).
    - Layer 2 (when behavior changes): targeted tests for the touched package/path.
    - Layer 3 (when web UI, API routes under `src/app/api`, workbook I/O, or settings paths change): `make e2e` / `make verify-full`.
20. MUST NOT invent sheet names, enums, or reserved identifiers; use the glossary and `@patrimo/core` schema.
21. MUST discuss before coding any change that contradicts this file, a colocated `ARCHITECTURE.md`, an accepted ADR, or a glossary term.
22. MUST NOT treat the implementing agent's self-assessment as completion proof. For non-trivial product changes, a separate checker pass (fresh session or distinct role — see [docs/howto/maker-checker.md](docs/howto/maker-checker.md)) MUST review against the sprint contract and verification commands before declaring done.
23. MUST work one branch [CONTRACT](docs/agent/branches/README.md) at a time (WIP = 1 per feature branch). MUST NOT expand scope into a second feature without updating that CONTRACT. Feature focus and handoff live in `docs/agent/branches/<slug>/PROGRESS.md`, not as a global queue in root [PROGRESS.md](PROGRESS.md).
24. When Layer 2 applies (behavior change; CONTRACT Layer 2 is not `n/a`), MUST NOT write production code for a CONTRACT behavior case until a targeted test for that case has been: (1) written, (2) actually run, and (3) shown failing for the **missing behavior** (not a typo, bad import, or compile noise). Record RED evidence in branch PROGRESS (or a run log). Then implement the minimal code that turns that test green. Procedure: [docs/howto/tdd-red-green.md](docs/howto/tdd-red-green.md). MUST NOT treat Spec-Driven Development (SPEC LOCK / Diátaxis package) as required — that remains opt-in.
25. When Layer 2 applies (Tier B cadrage), MUST NOT start Maker implementation until branch CONTRACT Intent, behavior cases, and product decisions are filled with no `OPEN` decisions, human teach-back is accepted (recorded in branch PROGRESS), Challenger Pass is recorded when the CONTRACT says `Challenger: required`, and `make branch-ready` exits 0. Procedure: [docs/howto/cadrage-lock.md](docs/howto/cadrage-lock.md). On Tier B, the Framer (cadrage) MUST NOT be the sole judge that cadrage is complete when Challenger is required — use a distinct Challenger pass. MUST NOT invent behavior absent from CONTRACT behavior cases.
