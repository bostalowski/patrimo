# Portfolio health cockpit

Derived traffic-light composition of existing health signals. Decision:
[ADR 0018](../../docs/adr/0018-portfolio-health-cockpit.md).

## Intent

Answer “how is my portfolio doing, and what should I do next?” in one Dashboard
glance without inventing a proprietary score `/100`.

## Flow

```text
EF + savings + coherence + risk metrics + goals + next-euro
        │
        ▼
buildPortfolioHealthCockpit ──► Dashboard pills + one next-action sentence
```

Derived only — no workbook sheet or field.

## Core

| Function | Role |
|---|---|
| `buildPortfolioHealthCockpit(input)` | Pills + next-action, or `null` (hide) |
| `toneFor*` helpers | Locked tone map per signal |

Tone: `ok` \| `watch` \| `breach`. Hide a pill when its source is `null`.
Next-action priority: next-euro first step → worst visible pill → calm all-ok.

Fees are **out** of V1 (ADR 0007 forbids fee color bands).

## Platforms

| Surface | Status |
|---|---|
| Web / Electron Dashboard | done |
| Mobile | absent (same core API later) |
