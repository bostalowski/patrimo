# Envelope overflow at plafond

When a projected envelope clips contributions at its plafond, the surplus is
routed once to a fallback envelope. Decision:
[ADR 0016](../../docs/adr/0016-envelope-overflow-plafond.md).

## Intent

Keep monthly / stream savings invested after PEA or Livret plafond instead of
discarding the clipped surplus in Projection.

## Flow

```text
EnvelopeProjectionSpec[] + overflowEnvelope (default CTO)
        │
        ▼
projectEnvelopesWithOverflow ──► per-envelope InvestmentProjection
                              ──► EnvelopeOverflowEvent[] (UI copy)
```

`projectInvestment` stays single-envelope (goals, retraite, reste-à-allouer).

## Core

| Function / type | Role |
|---|---|
| `projectEnvelopesWithOverflow` | Month loop with single-hop surplus routing |
| `EnvelopeOverflowEvent` | source, target, first month, steady monthly surplus, total |
| `DEFAULT_OVERFLOW_ENVELOPE` | `CTO` |

Invariants: one hop only; source === fallback → clip as today; leftover when
fallback is also capped is dropped; not persisted in the workbook (UI/session).

## Platforms

| Surface | Status |
|---|---|
| Web / Electron Projection (`EnvelopeProjection`, retirement card) | done |
| Mobile Projection | deferred |
