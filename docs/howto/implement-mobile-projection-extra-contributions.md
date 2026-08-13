# Implement mobile projection extra contributions

> 🚧 Anticipated plan (Phase 1.5 draft) — confirm after implementation. See [ADR 0004](../adr/0004-show-non-monthly-streams-on-mobile-projection.md).

Ordered vertical scope and test strategy for showing non-monthly DCA streams on mobile Projection.

## Prerequisites

- Spec: [ADR 0004](../adr/0004-show-non-monthly-streams-on-mobile-projection.md) (`proposed` until delivery)
- Branch: `fix/mobile-projection-extra-streams`

## Increment plan

### Scope 1 — Mobile Projection extra-stream badges

Pass `extraStreams` into the envelope card; render badges under the monthly field; format like web. Covers Phase 0 cases 1–5.

Tests: `mobile/lib/projection-extra-streams-ui.test.tsx` (name may adjust; keep UI-test pattern).

## Test strategy

| Level | What it proves |
|---|---|
| Mobile Projection UI | Monthly-only → no badge; annual / quarterly / mixed → correct badges; empty extras → silent |
| Core projection | Not required (math unchanged) |
| Web Projection | Not required (already correct) |

## Commands

```bash
npm test -- mobile/lib/projection-extra-streams-ui
```

## See also

- [Mobile projection extra contributions](../architecture/mobile-projection-extra-contributions.md)
- [ADR 0004](../adr/0004-show-non-monthly-streams-on-mobile-projection.md)
