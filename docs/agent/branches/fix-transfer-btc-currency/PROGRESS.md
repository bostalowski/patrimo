# Progress — `fix-transfer-btc-currency`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:**
- **Blocked:** none

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md). Tier A: mark teach-back / Challenger `n/a`.

- Tier: B
- Framer session / date: agent, 2026-11-17
- Challenger: n/a (pas d'ADR / feuille / math core)
- Teach-back: accepted (2026-11-17)
- `make branch-ready`: Score 15/15

## Done (this branch)

- [x] BTC/ETH/SOL dans Devise et Frais devise (N1, N2, E1) — verify 797/797, gauntlet OK

## RED evidence (when `verify-behavior` applies)

Per [tdd-red-green.md](../../howto/tdd-red-green.md). Skip if `verify-behavior` is `n/a`.

- Case:
- Command: `npm test -- <path>`
- Failure reason (missing behavior, not compile noise):
- Date:

## Last verify

- Command:
- Result:
- Date:

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

### RED evidence — N1 (2026-11-17)

- Command: `npm test -- src/app/transactions/transaction-form.test.ts`
- SHA: 4b82ddb
- Failure excerpt:
```
 ❯ src/app/transactions/transaction-form.test.ts:16:27
     14| describe("devises d'une transaction", () => {
     15|   it("N1: propose BTC, ETH et SOL", () => {
     16|     expect(TX_CURRENCIES).toEqual(expect.arrayContaining(["BTC", "ETH"…
       |                           ^
     17|   });
     18| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed | 2 passed (3)
   Start at  09:01:45
   Duration  290ms (transform 63ms, setup 0ms, collect 94ms, tests 4ms, environment 0ms, prepare 32ms)
```

## Checker Pass

Checker (separate agent), commit a9c6ba2, 2026-11-17.

| Dimension | Grade | Evidence |
|---|---|---|
| Correctness | A | `make verify`: 112 files / 797 tests passed; `npm test -- src/app/transactions/transaction-form.test.ts`: 3/3 passed (N1, N2, E1). `transaction-form.tsx` L282 and L307: both "Devise" and "Frais devise" selects map over `TX_CURRENCIES` (now FIAT + BTC/ETH/SOL), so N1/N2 are delivered for the TRANSFERT path. |
| Architecture | A | Single constant change in `src/app/transactions/transaction-form.tsx` (FIAT_CURRENCIES, CRYPTO_CURRENCIES, TX_CURRENCIES); no core math, no schema/workbook change; `excel.ts` untouched. |
| Scope discipline | B | Only the form + its test. Livret types hide the Devise fields (pre-existing, not changed); "tout type" in the CONTRACT success signal is true for all non-livret types only. |
| Tests / evidence | B | RED evidence recorded (N1 at SHA 4b82ddb, missing-behavior failure). N2/E1 pass on the old code too (not RED), N2 only exercises `validateTxValue`, not the rendered select options; no render test for the two lists. |
| Docs handoff | C | Teach-back accepted and cadrage lock recorded. But PROGRESS still has empty "Last verify", "Done", "Current focus" and `make branch-ready` fields; no GREEN run recorded; UI screenshot (CONTRACT) not yet in `ui/`; rework-log row not yet stamped. |

Gaps to close before the PR (not blocking correctness): fill "Last verify" and "Done" in PROGRESS, add the UI screenshot (`pr-check` requires a PNG under `docs/agent/branches/fix-transfer-btc-currency/ui/` for a `.tsx` change), run `make rework-log-stamp`. `make e2e` intentionally not run (human asked first).

- Checker: Pass (2026-11-17) — evidence: `make verify` 797/797 green; targeted test 3/3 green; diff of `transaction-form.tsx` L23-25, L282, L307.

Checker evidence: make verify 797/797 + transaction-form.test.ts 3/3 (checker, a9c6ba2); diff transaction-form.tsx L23-25, L282, L307.
Verdict: Pass.

## Screenshots

Formulaire « Nouvelle transaction », Devise = BTC: `docs/agent/branches/fix-transfer-btc-currency/ui/formulaire-devise-btc.png` (make e2e: 5/5).
