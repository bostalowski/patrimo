# Progress — `feat-goal-capitalisation-mode`

Branch-local handoff. Do not put other features' focus here.

## Current focus

- **In progress:** cadrage Framer done — awaiting **teach-back** human accept + **Challenger Pass** (required), then `make branch-ready` before Maker
- **Blocked:** none (gate only)

## Cadrage lock

Per [cadrage-lock.md](../../howto/cadrage-lock.md).

- Tier: B
- Framer session / date: 2026-08-29 (this session — Framer only, no production code)
- Challenger: pending (required — new sheet columns + core capitalisation invariant + ADR supersession)
- Teach-back: pending — scenarios listed in CONTRACT; human to ✅/❌ then record `accepted (YYYY-MM-DD)` here
- `make branch-ready`: not yet (needs teach-back + Challenger)

## Done (this branch)

- [x] Feature branch `feat/goal-capitalisation-mode`
- [x] `make branch-contract` + Framer filled CONTRACT (Intent, cases, LOCKED decisions, teach-back scenarios, scope, verify, exclusions)

## RED evidence (when Layer 2 applies)

Per [tdd-red-green.md](../../howto/tdd-red-green.md). Skip until Maker.

- Case: (none yet — cadrage only)
- Command:
- Failure reason:
- Date:

## Last verify

- Command: n/a (cadrage only)
- Result:
- Date: 2026-08-29

## Notes

Contract: [CONTRACT.md](./CONTRACT.md)

### Maker handoff (after branch-ready)

1. Fresh Maker session (Framer ≠ Maker).
2. Confirm `make branch-ready` exits 0.
3. Per behavior case: RED → GREEN in `packages/core/src/financial-goals` (+ excel round-trip); record RED evidence here.
4. Ship new ADR superseding ADR 0014 capitalisation block; update glossary / excel-workbook / financial-goals.md.
5. `make verify` + Layer 3 e2e; checker pass.

### Teach-back quick list (copy from CONTRACT)

1. 3000/mois @64, Non, 3 %, pension nette 2000 → capital **400 000 €**
2. 3000/mois @58, Non, 3 %, départ 64 → capital **1 200 000 €** (pas de pension)
3. 3000/mois @64, Oui, 4 %, pension nette 2000 → capital **300 000 €**
4. Classeur ancien sans colonnes → défauts Non + 3 %
5. CAPITAL_AT_DATE 200k → required = 200k inchangé
