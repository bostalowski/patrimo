# ADR 0011: Restore JustETF geographic sync

- Status: accepted
- Date: 2026-08-17
- implementation_ready: yes
- Amends: [ADR 0009](0009-account-detail-and-mobile-justetf.md) (reintroduces JustETF fetch/sync/restore on web and mobile; keeps account detail, region allocations, guided pickers, and ADR 0010 partial weights)

```text
Contract (do not invent):
- WHEN an asset has an ISIN and the user requests JustETF sync (web or mobile)
- THEN fetch the JustETF profile HTML for that ISIN, parse country weights in
  @patrimo/core, drop residual OTHER without redistributing, and write rows with
  source=justetf for that asset only (other assets unchanged)
- WHEN the asset already has source=manual rows and the user requests ordinary sync
- THEN leave workbook geographic rows unchanged (manual lock)
- WHEN the user requests restore from JustETF
- THEN overwrite that asset's rows with source=justetf even if previous source was manual
- WHEN JustETF fetch or parse fails or yields no usable country weights
- THEN return failure; do not clear existing geographic rows for that asset
- WHEN the user saves guided manual countries or regions
- THEN write source=manual (unchanged from ADR 0009 / ADR 0010)
- ELSE account detail placement, dual country/region views, guided pickers,
  homogeneous country|region rows, and partial weight sums follow ADR 0009 / ADR 0010
- FORBIDDEN syncing without an ISIN; overwriting manual rows without explicit restore;
  putting JustETF parse only in a platform package; clearing other assets on sync
- OPEN (do not implement): scheduled/auto sync without user action; PDF factsheet import;
  interactive map on mobile
```

## Context

ADR 0009 removed JustETF sync as unreliable. Market-cap-weighted ETF country mixes **drift** as constituents reweight, so a one-shot manual entry goes stale. The user chose to bring JustETF sync back: scrape remains best-effort and may fail, but successful syncs keep look-through exposure closer to reality. Manual entry and the manual lock stay available.

## Decision

- Restore shared JustETF parse/apply in `@patrimo/core` and platform fetch helpers.
- Web: `POST /api/geography/sync`; asset detail shows Sync / Restore when an ISIN exists.
- Mobile: same actions on asset edit.
- Keep ADR 0009 account detail, region mode, guided pickers, and ADR 0010 partial sums.
- Ordinary sync does not overwrite `source=manual`; Restore does.

## Invariants

- Replace key remains per-`assetId`; sync never wipes other assets' rows.
- `OTHER` from JustETF is dropped without renormalization (partial coverage allowed).
- Excel `Poids %` read/write must tolerate percent-point and percentage-format cells (see core `weightFromExcelPercentCell`).

## Options considered

| Option | Status | Why |
|---|---|---|
| A — Restore on-demand JustETF sync + manual lock + restore | Retained | Matches drift of ETF country mixes; user can still lock manual edits |
| B — Stay manual-only (ADR 0009) | Rejected | Allocations go stale without refresh |
| C — Scheduled background sync | Rejected / open | Extra complexity; scrape remains fragile |

## Consequences

**Positives**

- ETF country weights can be refreshed when holdings drift.
- Manual lock protects intentional overrides until Restore.

**Negatives**

- Depends on unofficial JustETF HTML; fetch/parse can fail.
- Sync and Restore UI add surface area on asset editors.

**To monitor**

- JustETF markup changes breaking the parser.
- Users overwriting careful manual region splits via Restore by mistake.

## Uncovered cases

- Automatic sync without a button press.
- Non-JustETF providers / PDF factsheets.

## Follow-up

Optional: harden parser fixtures when JustETF markup changes; coverage % KPI.

## See also

- [ADR 0008](0008-geographic-allocation.md)
- [ADR 0009](0009-account-detail-and-mobile-justetf.md)
- [ADR 0010](0010-partial-geographic-allocation-weights.md)
- [Geographic allocation](../architecture/geographic-allocation.md)
- [Implement geographic allocation](../howto/implement-geographic-allocation.md)
