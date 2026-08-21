# Sprint contract: Sector allocation (mobile UI parity)

## Scope
- [x] One behavior from FEATURES.md: Sector allocation — mobile UI parity
- [x] Files / packages expected to change: `FEATURES.md`, `docs/overview/platforms.md`, `PROGRESS.md` (docs only if code already matches)

## Audit (maker)
| Surface | Web | Mobile | Verdict |
|---|---|---|---|
| Portfolio Diversification sector bars | `/diversification` + `SectorExposurePanel` | Plus → Diversification + `SectorExposureList` | Parity |
| Account detail | `/comptes/[id]` | `account-detail` | Parity |
| Asset editor + JustETF sync/restore | `AssetSectorSection` | `AssetSectorEditor` on `edit-asset` | Parity |
| Sector keys in diversification targets | yes | yes (`diversification-key-options`) | Parity |
| Workbook `Exposition secteur` round-trip | yes | `excel-mobile` + `write-asset` | Parity |

Note: core `aggregatePortfolioSectorBreakdown.unmapped` is not rendered on either platform — shared omission, not a mobile gap. Out of scope.

## Verification
- Layer 1: `make verify`
- Layer 2: `npm test -- packages/core/src/sector-allocation packages/core/src/sector-exposure packages/core/src/justetf-sectors`
- Layer 3: not required (web UI untouched)
- Feature-specific: platforms.md matches UI; FEATURES mobile → `done`

## Exclusions
- Not in this sprint: next-euro on mobile; financial goals; showing unmapped sector slice; mobile lint gate
- Do not refactor unrelated modules

## Verify evidence
- Layer 1: `make verify` — 424 passed
- Layer 2: sector-allocation + sector-exposure + justetf-sectors — 13 passed
- Layer 3: skipped (web untouched)
- Docs: FEATURES mobile `done`; platforms.md sector row added

## Checker
- [x] Fresh session Pass 2026-08-21 (PR #57) — [scoring-rubric.md](../scoring-rubric.md)
- Result: **Pass** (Correctness A; Architecture A; Scope A; Tests A; Docs A)
- Evidence:
  - Diff = docs only (`FEATURES.md`, `platforms.md`, `PROGRESS.md`, this run log) — +46/−6
  - Layer 1 re-run: `make verify` — 424 passed
  - Layer 2 re-run: sector-allocation + sector-exposure + justetf-sectors — 13 passed
  - CI on `5639741`: `verify` + `e2e` pass
  - UI audit spot-check: mobile `SectorExposureList` on `diversification` + `account-detail`; `AssetSectorEditor` JustETF sync/restore on `edit-asset`; `excel-mobile` `SHEET_EXPOSITION_SECTEUR` round-trip; web mirrors via `SectorExposurePanel` / comptes — parity claim holds
  - `unmapped` unused in both UIs (shared omission) — out of scope OK
  - `make next-feature` → Financial goals on mobile
- Notes (non-blocking): no dedicated mobile RTL for sector list/editor (pre-existing; not required by this docs sprint)
