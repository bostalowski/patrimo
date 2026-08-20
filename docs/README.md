# Patrimo documentation

Technical documentation for **Patrimo**, a local wealth-tracking application.

Harness map: [AGENTS.md](../AGENTS.md) · [CONSTRAINTS.md](../CONSTRAINTS.md) · [docs/DOC_MODEL.md](DOC_MODEL.md) · [FEATURES.md](../FEATURES.md) · [PROGRESS.md](../PROGRESS.md).

End-user installation and Excel setup remain in the root [README](../README.md).

## Entry points

| Page | Role |
|---|---|
| [CONSTRAINTS.md](../CONSTRAINTS.md) | Hard MUST / MUST NOT |
| [packages/core/ARCHITECTURE.md](../packages/core/ARCHITECTURE.md) | Domain mechanics |
| [src/ARCHITECTURE.md](../src/ARCHITECTURE.md) | Web adapters / UI |
| [mobile/ARCHITECTURE.md](../mobile/ARCHITECTURE.md) | Expo app |
| [electron/ARCHITECTURE.md](../electron/ARCHITECTURE.md) | Desktop shell |
| [Glossary](reference/glossary.md) | Canonical vocabulary |

## Overview

- [Platforms](overview/platforms.md) — web, Electron, mobile capabilities

## Colocated mechanics (canonical)

- [Workbook persistence](../src/workbook-persistence.md)
- [Price sync](../src/price-sync.md)
- [Deletion](../packages/core/deletion.md)
- [Manual prices](../packages/core/manual-prices.md)
- [Geographic allocation](../packages/core/geographic-allocation.md)
- [Sector allocation](../packages/core/sector-allocation.md)
- [Diversification targets](../packages/core/diversification-targets.md)
- [Financial goals](../packages/core/financial-goals.md)
- [Emergency fund](../packages/core/emergency-fund.md)
- [Portfolio risk](../packages/core/portfolio-risk.md)
- [Fee monitoring](../packages/core/fee-monitoring.md)
- [Asset invested display](../src/asset-invested-display.md)
- [Mobile projection extras](../mobile/projection-extra-contributions.md)

Stubs under [architecture/](architecture/) redirect to the paths above.

## Reference

- [Glossary](reference/glossary.md)
- [Excel workbook schema](reference/excel-workbook.md)
- [Web API routes](reference/api-routes.md)

## Agent harness

- [Sprint contract](agent/sprint-contract.md)
- [Scoring rubric](agent/scoring-rubric.md)
- [Run logs](agent/runs/README.md)
- [Maker / checker](howto/maker-checker.md)
- [Agent loops](howto/agent-loop.md)
- [Cold-start test](howto/cold-start-test.md)

## How-to

- [PR checklist (harness)](howto/pr-checklist.md)
- [Cut a desktop release](howto/cut-a-desktop-release.md)
- [Local development setup](howto/local-dev-setup.md)
- [Configure the Excel source](howto/configure-excel-source.md)
- [Sync prices](howto/sync-prices.md)
- [Import a Trade Republic CSV](howto/import-trade-republic-csv.md)
- [Delete an account or asset](howto/delete-account-or-asset.md)
- [Implement asset invested display](howto/implement-asset-invested-display.md)
- [Implement mobile projection extra contributions](howto/implement-mobile-projection-extra-contributions.md)
- [Implement emergency fund health](howto/implement-emergency-fund-health.md)
- [Implement portfolio risk readability](howto/implement-portfolio-risk-readability.md)
- [Implement fee monitoring ratios](howto/implement-fee-monitoring-ratios.md)
- [Implement geographic allocation](howto/implement-geographic-allocation.md)
- [Implement diversification targets](howto/implement-diversification-targets.md)
- [Implement financial goals](howto/implement-financial-goals.md)

## Decisions

- [ADR index](adr/index.md)
