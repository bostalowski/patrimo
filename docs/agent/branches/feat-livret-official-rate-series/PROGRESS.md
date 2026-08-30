# Progress — `feat-livret-official-rate-series`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** Maker slice complete pending checker — `make verify` green; e2e env-blocked (see Last verify)
- **Blocked:** none (e2e re-run on a normal machine before merge if Layer 3 is required)

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md).

- Tier: B
- Framer session / date: 2026-08-30
- Human guidance: bank-faithful math; **prefer syncing rates with price sync** (D1 reopen)
- Challenger: Pass (2026-08-30, second pass) — D1 sync: pure core + cache≠workbook + offline seed + rate failure must not fail price sync (D9) + ADR §4 (D1c); D3 series-only kept
- Teach-back: accepted (2026-08-30) — scenarios 1–5 math; 6–7 sync (human « je préfère la sync »)
- `make branch-ready`: Pass (2026-08-30) — score 14/14 after D1 reopen

## Done (this branch)

- [x] Branch + `make branch-contract`
- [x] CONTRACT initial (embedded series) then **D1 reopen → sync**
- [x] Teach-back accepted
- [x] Challenger Pass (D3, then D1 sync / isolation)
- [x] Core: `livret-rates.ts` seed + resolve/merge + quinzaine math on series (scenarios 1–5)
- [x] Portfolio: `buildPortfolio(..., { livretRateSeries })`; app wrapper injects seed∪cache; `account.rate` ignored
- [x] Web: OpenFisca fetch + `data/livret-rates.json` cache + sync hooked to price sync (D9)
- [x] Mobile: AsyncStorage cache + sync beside `syncPrices` (D9)
- [x] UI: comptes form hint + create prefill from official rate (D6)
- [x] UI: account detail LIVRET shows current regulated rate + palier history
- [x] ADR 0024 + CONSTRAINTS §4 + glossary + price-sync note

## RED evidence (Layer 2)

Per [tdd-red-green.md](../../howto/tdd-red-green.md).

### Core rates + livret math (scenarios 1–5)

- Case: official series helpers + quinzaine math with multi-palier / ignore scalar rate / post-INTERET / value dates / D5 / projection last palier
- Command: `npm test -- packages/core/src/livret-rates.test.ts packages/core/src/livret.test.ts`
- Failure reason (2026-08-30): stub `resolveLivretRateAt` returned `0`; `computeLivretState` still took a scalar rate → `NaN` / wrong interest; seed empty; projection ignored `rateSeries`
- GREEN: same command — 14 passed; full `npm test -- packages/core` — 209 passed

### Web livret rate sync isolation (D9)

- Case: merge on success; preserve cache + report error on fetch failure
- Command: `npm test -- src/lib/livret-rates/sync.test.ts`
- Notes: tests written against implemented sync module (parse + isolation); 3 passed

## Last verify

- Command: `make verify`
- Result: Pass (lint + typecheck + 86 files / 581 tests)
- Date: 2026-08-30
- Layer 3: `make e2e` — **blocked by environment** (Next webServer: `uv_interface_addresses` / timeout). Not attributed to this change set; re-run e2e locally outside the agent sandbox before merge if required.

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

Pipeline: price sync → also merge livret rate cache; core consumes series (seed∪cache) for quinzaine math.

**Checker handoff:** after green `make verify` (+ e2e if required), fresh session vs CONTRACT + rubric; confirm RED evidence above.
