# Platforms

Current capabilities of Patrimo surfaces that share the Excel workbook.

Product direction: web/Electron and mobile should become feature-iso over time. The table below describes **what exists today**, not the target end state. Transaction create / update / delete is aligned across platforms.

## Surfaces

| Surface | Runtime | Entry |
|---|---|---|
| Web | Next.js App Router on localhost | `npm run dev` |
| Electron | Packaged macOS app embedding Next standalone | `npm run electron:dev` / `electron:build` |
| Mobile | Expo / React Native | `mobile/` (`expo start`) |

## Capability matrix (current)

| Capability | Web / Electron | Mobile |
|---|---|---|
| Local Excel file | Present | Present |
| Google Drive workbook | Partial — path via Drive Desktop mount | Present — OAuth upload/download |
| Accounts create / update / delete | Present | Present |
| Assets create / update / delete | Present | Present |
| Transactions create / update / delete | Present | Present |
| Account/asset deletion rules | Present — shared `@patrimo/core` | Present — same core |
| Historical price sync | Present | Absent — spot / latest only |
| Manual price entry | Present — workbook sheet | Present — workbook sheet |
| CSV import | Present | Absent |
| Budget | Present | Present |
| DCA plans | Present | Present |
| Real estate | Present — CRUD + analytics | Partial — read-only |
| Fiscalité | Present — realized + foncier | Partial — realized only |
| Fees | Present | Partial |
| Projection | Present | Partial |
| Retirement profile | Present | Partial |
| Benchmarks | Present | Absent |

## Shared versus platform-owned

| Shared (`@patrimo/core`) | Platform-owned |
|---|---|
| Zod schema, workbook sheet contract | File pickers, Drive OAuth, Electron menus |
| Portfolio, performance, fees, tax estimates | Route Handlers (web) vs client writers (mobile) |
| Deletion transformations | Confirmation UI and persistence adapters |
| Price sync schedule helpers | Fetchers and cache storage |

## See also

- [Key principles](key-principles.md)
- [Monorepo layers](../architecture/monorepo-layers.md)
- [Price sync pipeline](../architecture/price-sync-pipeline.md)
