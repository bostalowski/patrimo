# Rework log

One row per merged feature branch. Append a row when a branch merges
([ADR 0026](../adr/0026-feature-flow-cadrage-to-merge.md) D8); increment
`Reworked?` if a follow-up fix lands on the same area within 30 days of
merge. This is the only post-merge signal this harness tracks — kept
deliberately small rather than a full metrics dashboard.

`make pr-check` prints a non-blocking reminder (does not fail the gate) if
this file has no row for the current branch's slug yet.

| Date merged | Slug | Feature | Reworked? (follow-up within 30 days) |
|---|---|---|---|
| 2026-09-05 | bostalowski-harness-flow | Feature flow — cadrage to merge as executable gates ([PR #78](https://github.com/bostalowski/patrimo/pull/78), [ADR 0026](../adr/0026-feature-flow-cadrage-to-merge.md)) | no |
| 2026-09-05 | bostalowski-ajout-taxe-fonci-re | Taxe foncière par année (feuille classeur + résolution projection/UI) ([PR #77](https://github.com/bostalowski/patrimo/pull/77), [ADR 0027](../adr/0027-property-tax-history.md)) | no |
