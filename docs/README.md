# Patrimo documentation

Technical documentation for **Patrimo**, a local wealth-tracking application.

End-user installation and Excel setup remain in the root [README](../README.md).

## Anchor pages

| Page | Role |
|---|---|
| [Key principles](overview/key-principles.md) | Design commitments |
| [Foundations](architecture/foundations.md) | Mechanical invariants |
| [Glossary](reference/glossary.md) | Canonical vocabulary |

## Overview

- [Platforms](overview/platforms.md) — web, Electron, mobile capabilities

## Architecture

- [Monorepo layers](architecture/monorepo-layers.md)
- [Workbook persistence](architecture/workbook-persistence.md)
- [Price sync pipeline](architecture/price-sync-pipeline.md)
- [Manual price persistence](architecture/manual-price-persistence.md)
- [Deletion pipeline](architecture/deletion-pipeline.md)
- [Asset invested display](architecture/asset-invested-display.md)
- [Mobile projection extra contributions](architecture/mobile-projection-extra-contributions.md)
- [Emergency fund health](architecture/emergency-fund-health.md)
- [Portfolio risk readability](architecture/portfolio-risk-readability.md)

## Reference

- [Glossary](reference/glossary.md)
- [Excel workbook schema](reference/excel-workbook.md)
- [Web API routes](reference/api-routes.md)

## How-to

- [Local development setup](howto/local-dev-setup.md)
- [Configure the Excel source](howto/configure-excel-source.md)
- [Sync prices](howto/sync-prices.md)
- [Import a Trade Republic CSV](howto/import-trade-republic-csv.md)
- [Delete an account or asset](howto/delete-account-or-asset.md)
- [Implement asset invested display](howto/implement-asset-invested-display.md)
- [Implement mobile projection extra contributions](howto/implement-mobile-projection-extra-contributions.md)
- [Implement emergency fund health](howto/implement-emergency-fund-health.md)
- [Implement portfolio risk readability](howto/implement-portfolio-risk-readability.md)

## Decisions

- [ADR index](adr/index.md)
