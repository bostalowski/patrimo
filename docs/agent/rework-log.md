# Rework log

One row per feature branch that reaches `main`
([ADR 0026](../adr/0026-feature-flow-cadrage-to-merge.md) D8, timing amended
2026-09-05). Append the row **in the PR about to merge** (same diff as the
feature — not a follow-up PR). Increment `Reworked?` if a follow-up fix lands
on the same area within 30 days of merge. This is the only merge-signal this
harness tracks — kept deliberately small rather than a full metrics dashboard.

`make pr-check` **fails** if this file has no row for the current branch's
slug yet (gate G6). Use today's date (or the expected merge day) in
`Date merged`; set `Reworked?` to `no` until a real follow-up lands.

| Date merged | Slug | Feature | Reworked? (follow-up within 30 days) |
|---|---|---|---|
| 2026-09-05 | bostalowski-harness-flow | Feature flow — cadrage to merge as executable gates ([PR #78](https://github.com/bostalowski/patrimo/pull/78), [ADR 0026](../adr/0026-feature-flow-cadrage-to-merge.md)) | no |
| 2026-09-05 | bostalowski-ajout-taxe-fonci-re | Taxe foncière par année (feuille classeur + résolution projection/UI) ([PR #77](https://github.com/bostalowski/patrimo/pull/77), [ADR 0027](../adr/0027-property-tax-history.md)) | no |
| 2026-09-05 | bostalowski-rework-log-in-feature-pr | Require rework-log row in the merging PR (`make pr-check` blocker; ADR 0026 D8 timing) | no |
