# Rework log

One row per feature branch that reaches `main`
([ADR 0026](../adr/0026-feature-flow-cadrage-to-merge.md) D8). Append / refresh
the row **in the PR about to merge** with:

```bash
make rework-log-stamp   # upserts Date / Slug / Feature / Touched / Reworked?=no
```

`Touched` is a fingerprint of production paths from `git diff origin/main...HEAD`
(tests and branch CONTRACT folders excluded). `make pr-check` then:

1. **Fails** if this branch has no row or empty `Touched`.
2. **Fails** if the current diff **overlaps** `Touched` of another row with
   `Reworked?=no` and `Date merged` within 30 days — set that row to
   `yes` (optionally `yes — PR #N`) in the same PR. That is how follow-up
   fixes are recorded; no human memory required.

| Date merged | Slug | Feature | Touched | Reworked? (follow-up within 30 days) |
|---|---|---|---|---|
| 2026-09-05 | bostalowski-harness-flow | Feature flow — cadrage to merge as executable gates ([PR #78](https://github.com/bostalowski/patrimo/pull/78), [ADR 0026](../adr/0026-feature-flow-cadrage-to-merge.md)) | scripts/pr-check.sh scripts/gauntlet.sh scripts/red-evidence.sh scripts/role-worktree.sh docs/howto/feature-flow.md docs/adr/0026-feature-flow-cadrage-to-merge.md | yes — auto-detect PR (rework-log overlap) |
| 2026-09-05 | bostalowski-ajout-taxe-fonci-re | Taxe foncière par année (feuille classeur + résolution projection/UI) ([PR #77](https://github.com/bostalowski/patrimo/pull/77), [ADR 0027](../adr/0027-property-tax-history.md)) | packages/core/src/property-taxes.ts packages/core/src/realestate/projection.ts packages/core/src/realestate/property.ts packages/core/src/schema.ts packages/core/src/workbook-template.ts src/app/api/property-taxes/route.ts src/app/immobilier/property-tax-history.tsx src/lib/excel.ts mobile/lib/excel-mobile.ts e2e/property-tax.spec.ts | no |
| 2026-09-05 | bostalowski-rework-log-in-feature-pr | Require rework-log row in the merging PR ([PR #81](https://github.com/bostalowski/patrimo/pull/81); ADR 0026 D8 timing) | scripts/pr-check.sh scripts/pr-check.test.ts docs/agent/rework-log.md docs/howto/feature-flow.md docs/adr/0026-feature-flow-cadrage-to-merge.md | yes — auto-detect PR (rework-log overlap) |
