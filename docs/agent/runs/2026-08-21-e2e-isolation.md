# Run: e2e-isolation

- Date: 2026-08-21
- Goal: Isolate Playwright smoke from developer `next dev` / `./data/config.json`
- Feature (FEATURES.md): harness meta (Playwright workbook smoke) — not an open product row
- Sprint contract (inline, maker session):
  - Scope: `playwright.config.ts` port `3100` + `reuseExistingServer: false` + temp `FINGRAPHS_DATA_DIR`; `next.config.ts` optional `.next-e2e` `distDir`; ignore + tsconfig includes; persistence / local-dev docs
  - Verification: `make verify`; `make e2e`; assert `data/config.json` unchanged
  - Exclusions: product FEATURES rows; e2e assertions for next-euro

## Checker (fresh session)

| Dimension | Grade | Evidence |
|---|---|---|
| Correctness | **A** | Checker re-ran `make verify` → 66 files / **424** tests. `make e2e` → **2 passed** (4.8s) with local `:3000` already listening. `data/config.json` SHA unchanged (`0c8cdc73…`). `.next-e2e/dev` created. |
| Architecture | **A** | No domain math outside `@patrimo/core`. Protects CONSTRAINTS persistence (`config.json` / `FINGRAPHS_DATA_DIR` via `src/lib/config.ts`). Mechanics in `src/workbook-persistence.md`. |
| Scope discipline | **A** | Infra/harness only; no second FEATURES item. Cosmetic `tsconfig.json` reformat + `.next-e2e` includes are in-scope. |
| Tests / evidence | **B** | Layer 3 proves isolation; no unit test asserting `reuseExistingServer: false` / port default. |
| Docs handoff | **A** | PROGRESS + this run log; howto + workbook-persistence updated. |

- Result: **Pass**
- Notes (non-blocking): Next.js warns about blocked HMR cross-origin from `127.0.0.1` during e2e (tests still pass); running e2e rewrites gitignored `next-env.d.ts` toward `.next-e2e` types until a normal `next dev` rewrites it back.

## Verify (checker)

- Layer 1 `make verify` → pass
- Layer 2 → n/a (config/tooling)
- Layer 3 `make e2e` → pass (2); config hash stable

## Handoff / next

- Uncommitted on `feat/next-euro-plan` until commit/PR decision.
- Product next: `make next-feature` → Sector allocation (mobile UI parity).
