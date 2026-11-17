# Contract: Devise crypto sélectionnable sur une transaction

- Branch: `fix-transfer-btc-currency`
- Slug: `fix-transfer-btc-currency`
- Matrix row (FEATURES.md): n/a (formulaire web, pas de changement de statut plateforme)
- Cadrage tier: B (behavior) — see [cadrage-lock.md](../../howto/cadrage-lock.md)
- Challenger: n/a — pas d'ADR, pas de feuille, pas de math core

## Intent

Tier A: write `n/a — Tier A`. Tier B: fill all bullets.

- Symptom (who / when / pain): l'utilisateur crée un TRANSFERT de BTC et ne peut pas choisir BTC dans « Devise » / « Frais devise ».
- Suspected cause (`fact` | `hypothesis`): fact — `TX_CURRENCIES` figé à EUR/USD/GBP/CHF dans `transaction-form.tsx`; le schéma accepte toute chaîne.
- Lever (where we act on the cause): ajouter une liste crypto fixe (BTC, ETH, SOL) à `TX_CURRENCIES`.
- Success signal (observable): BTC apparaît dans les deux listes déroulantes du formulaire, pour tout type de transaction.
- Band-aid risk (if we only treat the symptom): une crypto absente de la liste reste impossible à choisir (accepté, liste fixe voulue).

## Behavior cases

Tier A: `n/a — Tier A`. Tier B: observable cases → `verify-behavior` RED → GREEN slices.
Give each Nominal/Edge case a stable ID (`N1`, `N2`, … / `E1`, …) — the
`## Tranches` table below references cases **by ID only**, so `make branch-ready`
can check every case is assigned to a tranche.

### Nominal

- [ ] N1: If l'utilisateur ouvre le formulaire de transaction, then « Devise » et « Frais devise » proposent BTC, ETH et SOL.
- [ ] N2: If il choisit BTC en devise, then la transaction est envoyée avec `devise` = BTC (TRANSFERT inclus).

### Edge

- [ ] E1: If il utilise EUR/USD/GBP/CHF, then rien ne change.

### Out of scope

- [ ] Explicitly not in this branch: conversion de change des cryptos, liste dynamique par actif, formulaire d'actif (`asset-form.tsx`).

## Product decisions

Status: **LOCKED** = cadrage for this branch · **OPEN** = must answer before coding.
Tier A: one row `n/a — Tier A` or omit table body with a single n/a line under the heading.

| # | Decision | Status | Choice | Alternatives considered |
|---|---|---|---|---|
| D1 | Quelles devises pour un transfert crypto | LOCKED | Liste crypto fixe (BTC, ETH, SOL) | Ticker de l'actif (dynamique) ; devise forcée sur TRANSFERT |

## Teach-back

Tier A: `n/a — Tier A`. Tier B: list 3–5 scenarios; human acceptance recorded in PROGRESS (`Teach-back: accepted`).

- [x] Scenario 1: Marie crée un TRANSFERT de 0,5 BTC du compte Ledger vers Kraken ; elle choisit BTC en devise, la ligne est enregistrée en BTC.
- [x] Scenario 2: Paul paie les frais d'un transfert en BTC : « Frais devise » propose BTC.
- [x] Scenario 3: Luc achète un ETF en EUR : il ne voit aucun changement de comportement.

## Scope

- [x] One behavior for this branch: crypto sélectionnable comme devise.
- [x] Files / packages expected to change: `src/app/transactions/transaction-form.tsx` (+ test).

## Verification

- `verify-static`: `make verify`
- `verify-behavior`: `npm test -- src/app/transactions/transaction-form.test.ts` — N1, N2, E1
- `verify-e2e`: `make e2e` (formulaire web) — à proposer avant lancement
- Screenshots: formulaire de transaction, liste Devise ouverte avec BTC
- Feature-specific:

When `verify-behavior` applies, makers follow [tdd-red-green.md](../../howto/tdd-red-green.md) (CONSTRAINTS §24).
Tier B cadrage: [cadrage-lock.md](../../howto/cadrage-lock.md) (CONSTRAINTS §25) before Maker.

## Tranches

One tranche = one small, separately-reviewable unit — either its own stacked
PR (merged before the next tranche's commits push) or a commit landing in
one already-open PR reviewed incrementally; pick the mechanic explicitly in
a product decision, since GitHub diffs branch-vs-base (CONSTRAINTS §26;
[feature-flow.md](../../howto/feature-flow.md)). Tier A: one row is enough
(`n/a` behavior cases). Tier B: every `N#`/`E#` case above must appear in at
least one row's "Behavior cases covered" cell, **as bare IDs only** (no
prose after the IDs — `make branch-ready` parses this column with a simple
token match).

| # | Tranche | Behavior cases covered | Verify bands | PR / commit |
|---|---|---|---|---|
| 1 | Devises crypto dans le formulaire | N1, N2, E1 | verify-static, verify-behavior, verify-e2e | not yet shipped |

## Exclusions

- Not in this branch: voir Out of scope
- Do not refactor unrelated modules

## Checker

- [ ] Fresh session or distinct checker role will score with [scoring-rubric.md](../../scoring-rubric.md)
- Pass bar: no D on correctness; architecture ≥ B; evidence cited; RED evidence when `verify-behavior` applied; Tier B teach-back / cadrage lock recorded when `verify-behavior` applied

## On merge

- [ ] Update root [FEATURES.md](../../../../FEATURES.md) matrix if platform status changed
- [ ] Append / refresh the [rework-log](../../rework-log.md) row **in this PR** via `make rework-log-stamp`; if overlap fires, human yes/no via `make rework-log-propose` (never silent auto-ack)
- [ ] Leave this folder as archive (or note PR link in root PROGRESS Done)

## Cadrage gate

Tier B: all product decisions **LOCKED**, teach-back accepted, Challenger Pass if `Challenger: required`, then `make branch-ready` must pass before coding.
