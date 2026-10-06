# ADR 0031: Indicative household IR barème observation (sync + PAS conseil)

- Status: accepted
- Date: 2026-10-06
- implementation_ready: yes
- Extends: CONSTRAINTS §4 (network allowlist) — official IR barème series join price sources
- See-also: [ADR 0028](0028-realestate-projection-reliability.md) uncovered « household progressive IR »; [ADR 0024](0024-livret-official-rate-series.md) isolation pattern

```text
Contract (do not invent):

Observation pack (indicative, not a filing engine):
  TMI from last IR band the quotient reaches
  IR = progressive tax on quotient × parts (never TMI × RNI)
  PAS conseil = IR / assiettePas (1 decimal in UI), distinct from TMI
  no décote / plafond QF / CEHR

Foyer config (workbook optional sheet **Foyer fiscal**):
  incomeSource MANUAL | FROM_BUDGET
  MANUAL: monthly amount + BRUT | NET | NET_IMPOSABLE
  parts: positive multiple of 0.5
  barème thresholds NOT in Excel

Barème source:
  fetch/merge DURING price sync (web POST /api/prices/sync + mobile price sync)
  OpenFisca-France impot_revenu/bareme_ir_depuis_1945/bareme.yaml
  cache: web data/ir-bareme.json, mobile AsyncStorage (derived, not SoT)
  embedded IR_BAREME_SEED in @patrimo/core for cold start / offline
  resolve: chronologically latest dated table in seed ∪ cache
  fetch OR malformed parse MUST NOT fail price sync NOR wipe cache

UI V1:
  web Fiscalité: sole editor + barème viz + pack
  web Budget: shared read-only observation card + link to Fiscalité
  mobile: serializer rewrite-unchanged + cache merge; no observation UI
```

## Context

Household TMI was a hand-entered enum (immobilier / PER). There was no
progressive IR or PAS tip. ADR 0028 deferred household progressive IR.

## Decision

Add an indicative foyer observer in `@patrimo/core` (`observeTaxBracket`)
fed by a persisted foyer config and an official barème series (seed ∪ cache),
synced during the existing price-sync gesture.

## Invariants

1. Tax figures remain indicative (CONSTRAINTS §3).
2. Core is pure: series in, observation out — no network I/O in `@patrimo/core`.
3. Budget lines are never written from foyer amounts.
4. Immobilier `tmiAssocie` / PER TMI are not auto-written this branch.
5. Frais-pro min/max for BRUT stay **embedded** seed constants (not OpenFisca `abatpro` sync).

## Options considered

### Hardcode one millésime in UI

**Advantages:** no network.

**Disadvantages:** thresholds perish; rejected in cadrage.

### Full CGI engine (décote, plafond QF, CEHR)

**Advantages:** closer to avis.

**Disadvantages:** false precision; out of scope.

## Consequences

CONSTRAINTS §4 allowlist includes official IR barème YAML. Web Fiscalité and
Budget show the same pack. Mobile preserves the sheet on rewrite.

## Uncovered cases

Décote, plafond QF, CEHR, CSG déductible, IFI, PAS push to employer /
impots.gouv, mobile observation UI, OpenFisca `abatpro` YAML sync, filtering
`LOCATIF` out of `FROM_BUDGET`.

## Follow-up

Optional later: prefill immobilier TMI from observation; sync `abatpro` YAML.

## See also

- Branch CONTRACT: `docs/agent/branches/feat-tax-bracket-observation/`
- [CONSTRAINTS.md](../../CONSTRAINTS.md) §3, §4
- [ADR 0024](0024-livret-official-rate-series.md)
- [ADR 0028](0028-realestate-projection-reliability.md)
