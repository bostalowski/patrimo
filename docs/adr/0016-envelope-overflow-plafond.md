# ADR 0016: Envelope contribution overflow at plafond

- Status: accepted
- Date: 2026-08-21
- implementation_ready: yes

```text
Contract (do not invent):

When projectInvestment would clip contributions at an envelope plafond,
multi-envelope Projection routes the surplus once to overflowEnvelope
(default CTO). UI/session override only — not a workbook field.

Single hop: if the fallback is also at plafond that month, remaining
surplus is dropped (no A→B→C). Self-overflow (source === fallback):
clip as today, no redirect.

Extra streams (TRIMESTRIEL / ANNUEL) share the same clip → overflow path.
Domain math in @patrimo/core (`projectEnvelopesWithOverflow`); platforms
display metadata (source, target, first month, steady monthly surplus).

FORBIDDEN in V1: workbook column; per-source overflow map; multi-hop;
mobile Projection parity; changing projectLivret / retraite / goals callers.
```

## Context

`projectInvestment` already sets `plafondReachedMonth` and clips contributions
when invested reaches the plafond. The clipped euros were discarded, so a PEA
near 150 k€ understated total projected wealth versus the user’s intent to keep
saving (typically into a CTO).

## Decision

Add `projectEnvelopesWithOverflow` in `@patrimo/core` and wire web Projection
(`EnvelopeProjection`, retirement income card) to it. Keep plain
`projectInvestment` for single-envelope callers.

## Invariants

1. Overflow is computed only in `@patrimo/core` (CONSTRAINTS §6).
2. One hop to a global `overflowEnvelope` (default `CTO`).
3. No workbook persistence for the overflow target in V1.

## Options considered

### Option A — Clip and discard (status quo)

**Advantages**

Simple; matches historical single-envelope math.

**Disadvantages**

Understates engaged savings after plafond.

### Option B — Single-hop overflow to a global fallback (chosen)

**Advantages**

Matches common PEA → CTO behaviour; small API; reusable later on mobile.

**Disadvantages**

No cascade when the fallback is also capped.

### Option C — Per-envelope overflow map + multi-hop

**Advantages**

Maximum control.

**Disadvantages**

Heavier UX and schema pressure; out of V1 scope.

## Consequences

- Web Projection totals and charts include overflow into the fallback.
- French UI copy surfaces first overflow year and steady monthly surplus when constant.
- Mobile Projection remains on independent `projectInvestment` until a follow-up.

## Uncovered cases

- Fallback also at plafond the same month (surplus dropped).
- Source equals fallback (no redirect).
- Callers outside Projection web (goals, retraite, fiscal reste) unchanged.

## Follow-up

- Mobile Projection parity.
- Optional workbook preference if users want a durable default.

## See also

- [glossary — Envelope overflow](../reference/glossary.md)
- [packages/core/envelope-overflow.md](../../packages/core/envelope-overflow.md)
- Issue [#18](https://github.com/bostalowski/patrimo/issues/18)
