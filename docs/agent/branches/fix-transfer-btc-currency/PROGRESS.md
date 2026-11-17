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
- `make branch-ready`:

## Done (this branch)

- [ ]

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
