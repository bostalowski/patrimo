# ADR 0012: Allocation plan (target) and coherence

- Status: accepted
- Date: 2026-08-17
- implementation_ready: yes

```text
Contract (do not invent):

Allocation plan = Target allocation = categories with targetPct and assetIds
  stored in workbook sheet "Allocation cible".
  Categories unique; each assetId in at most one category; Σ targetPct ≈ 1 (±1e-3).

Bootstrap (suggest only — never auto-persist):
  WHEN targetAllocations empty OR Σ targetPct not ≈ 1
    AND annualized DCA total > 0
  THEN suggestTargetPlanFromDca(dca) returns proposed categories:
    - each DCA line → candidate (label = line.label ?? config.label,
      assetIds = line.assetIds, annualEUR = annualize(config) * line.targetPct)
    - merge candidates with the same sorted assetIds set (sum annualEUR; keep first label)
    - assign each assetId to at most one category (first claim by descending annualEUR
      of the candidate; drop asset from later candidates)
    - drop candidates with zero remaining assets or zero annualEUR
    - targetPct = categoryAnnual / sum(categoryAnnual); renormalize to sum ≈ 1
  WHEN no usable DCA → suggestion is [].

Persistence:
  WHEN user saves a plan
  THEN validate (unique labels, known assets, asset uniqueness, Σ ≈ 1, targetPct > 0)
    ELSE reject save with error; do not write workbook.
  THEN write sheet "Allocation cible" (web API + mobile serialize).
  Excel column "Actifs" OR legacy header "Actifs (séparés par virgule)" both parse.

Coherence (assessAllocationCoherence):
  WHEN no valid saved targets (empty OR Σ not ≈ 1)
  THEN return null → UI hides status card (editor may still show bootstrap suggestion).

  WHEN targets valid
  THEN liquidInvested, annualDcaTotal, per-category targetPct / stockPct / flowPct
       as in prior contract.
  THEN findings ONLY:
    category_drift   : |stockPct − targetPct| ≥ 0.05 (liquidInvested > 0)
    flow_misalign    : annualDcaTotal > 0 AND |flowPct − targetPct| ≥ 0.05
    unmapped_stock   : unmapped MV ≥ 5% of liquidInvested
    geo_coverage_gap : uncovered liquid MV share ≥ 0.25
  THEN status:
    misaligned if any category_drift, flow_misalign, or unmapped_stock
    watch      if only geo_coverage_gap
    aligned    if no findings

REMOVED: overlapping_sleeve (multi-asset sleeves are intentional).

FORBIDDEN: HHI / Top1 / Top3; thresholds outside @patrimo/core;
  auto-persisting bootstrap without user confirm; inventing sector weights;
  "aligned" when findings exist.

OPEN (out of scope this increment): sector look-through; geo target bands;
  LLM coach.
```

## Context

Users care about an allocation **plan** and diversification (geo now; sector later),
but often have **no intent beyond DCA**. A read-only coherence card against an
orphan Excel sheet is not usable. Root cause: no in-app plan lifecycle
(bootstrap → edit → save → align).

Canonical terms: [glossary](../reference/glossary.md) (**Target allocation** /
**Allocation plan**, **Investment plan**, **Geographic allocation**).

## Decision

- Keep workbook sheet `Allocation cible` as the persisted plan.
- Add `suggestTargetPlanFromDca` in `@patrimo/core` (suggestion only).
- Add in-app editor (web Investissements + mobile parity) with validate-then-save.
- Keep `assessAllocationCoherence`; **remove** `overlapping_sleeve`.
- Dashboard card links to the editor; shows stock vs plan (+ flow_misalign).
- Geo: keep `geo_coverage_gap` + link to `/geographie`; no geo target bands yet.

## Invariants

- Thresholds and bootstrap math live only in `@patrimo/core`.
- Bootstrap never writes the workbook by itself.
- Platforms adapt I/O and UI only.
- Multi-asset categories (e.g. MSCI World → WPEA+DCAM) are first-class and not alerts.

## Options considered

| Option | Status | Why |
|---|---|---|
| A — Editable plan seeded from DCA + coherence | Retained | Matches intent without requiring a pre-existing vision |
| B — DCA-only alignment (drop target sheet) | Rejected | Cannot diverge plan from contributions |
| C — Manual plan only (no bootstrap) | Rejected | Leaves empty plan for users whose only vision is DCA |
| D — Auto-persist bootstrap on load | Rejected | Silent overwrite of intent / Excel |

## Consequences

**Positives**

- Plan becomes usable in-app; DCA is a starting point, not the ceiling.
- Intentional multi-ETF sleeves no longer false-alarm.

**Negatives**

- Bootstrap may propose imperfect labels/splits when DCA baskets overlap oddly.
- Two surfaces (editor + card) to keep in sync.

**To monitor**

- Bootstrap quality when the same asset appears in multiple DCA plans.
- Users who never save a suggestion (card stays hidden).

## Uncovered cases

- Sector look-through.
- Editable geographic target bands.
- Shock scenarios / LLM narrative.

## Follow-up

- Sector allocation sheet (analogous to `Exposition geo`).
- Stronger diversification coaching once sector exists.

## See also

- [Allocation plan architecture](../architecture/allocation-coherence.md)
- [Implement allocation plan](../howto/implement-allocation-coherence.md)
- [ADR 0005](0005-emergency-fund-health-indicator.md)
- [ADR 0006](0006-portfolio-risk-readability.md)
- [ADR 0008](0008-geographic-allocation.md)
