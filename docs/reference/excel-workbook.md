# Excel workbook schema

Canonical sheet names and headers come from `packages/core/src/workbook-template.ts`. Field types come from `packages/core/src/schema.ts`.

## Sheets

| Sheet | Required | Purpose |
|---|---|---|
| `Transactions` | Yes | Portfolio movements |
| `Actifs` | Yes | Asset catalog and price source metadata |
| `Comptes` | Yes | Accounts and tax envelopes |
| `Budget` | No | Recurring income / expense / savings lines |
| `Immobilier` | No | Real-estate properties |
| `DCA` | No | Investment plans (baskets + target %) |
| `Prix manuels` | No | Dated user-entered valuations for `manual` assets |
| `Exposition geo` | No | Look-through country weights per asset |

A blank workbook created by the app includes all listed sheets with headers. Existing workbooks without `Prix manuels` or `Exposition geo` remain valid; each sheet is created on the first write that needs it.

## `Transactions`

| Column | Schema field | Notes |
|---|---|---|
| `Date` | `date` | Coerced date |
| `Type` | `type` | See transaction types below |
| `Compte` | `compte` | Account id |
| `Compte destination` | `compteDestination` | Required for `TRANSFERT` |
| `Actif` | `actif` | Asset id; may be empty on `LIVRET` cash flows |
| `Quantité` | `quantite` | Non-negative |
| `Prix unitaire` | `prixUnitaire` | Nullable number |
| `Devise` | `devise` | Default `EUR` |
| `Frais` | `frais` | Non-negative; default `0` |
| `Frais devise` | `fraisDevise` | Default `EUR`; may equal the asset id for network fees on transfers |
| `Notes` | `notes` | Optional |

### Transaction types

| Type | Portfolio effect (implemented) |
|---|---|
| `ACHAT` | Cost = quantity × price + fees; increases quantity |
| `VENTE` | Proceeds = quantity × price − fees; realizes P&L vs PRU |
| `DIVIDENDE` | `prix > 0`: cash dividend (realized income, quantity unchanged). `prix = 0`: in-kind distribution (adds free quantity) |
| `INTERET` | Cash interest accumulated at account level |
| `TRANSFERT` | Moves quantity source → destination; asset-denominated fees reduce received quantity |
| `DEPOT` | Cash/security deposit into an account |
| `RETRAIT` | Reduces quantity and cost basis at PRU without realizing P&L |

## `Actifs`

| Column | Schema field | Allowed values / notes |
|---|---|---|
| `ID` | `id` | Stable identifier referenced by transactions and DCA |
| `Libellé` | `label` | Display name |
| `Type` | `type` | `CRYPTO`, `ETF`, `ACTION`, `FCPE`, `CASH` |
| `ISIN` | `isin` | Optional |
| `Ticker` | `ticker` | Optional |
| `Source prix` | `source` | `coingecko`, `yahoo`, `investir`, `zonebourse`, `manual` |
| `Param source` | `param` | Coin id, Yahoo symbol, ISIN, Zonebourse URL, … |
| `Devise` | `currency` | Default `EUR` |
| `TER` | `ter` | Optional annual fee ratio |

Reserved asset id: `__UNASSIGNED_CASH__` (see [glossary](glossary.md)).

## `Comptes`

| Column | Schema field | Allowed values / notes |
|---|---|---|
| `ID` | `id` | Stable identifier |
| `Libellé` | `label` | Display name |
| `Type` | `type` | `BROKER`, `EXCHANGE_CRYPTO`, `WALLET_CRYPTO`, `EPARGNE_SALARIALE`, `BANQUE` |
| `Enveloppe` | `envelope` | `CTO`, `PEA`, `PEE`, `AV`, `LIVRET`, `PER` |
| `Date d'ouverture` | `openDate` | Optional; used by tax holding-period heuristics |
| `Taux` | `rate` | Optional (e.g. livret rate) |
| `Plafond` | `plafond` | Optional positive ceiling |

Reserved account reference: `__NO_ACCOUNT__` — not stored as a `Comptes` row.

## `Budget`

| Column | Schema field | Allowed values |
|---|---|---|
| `ID` | `id` | |
| `Libellé` | `label` | |
| `Type` | `kind` | `REVENU`, `DEPENSE`, `EPARGNE` |
| `Montant` | `amount` | Positive |
| `Fréquence` | `frequency` | `MENSUEL`, `TRIMESTRIEL`, `ANNUEL` |
| `Catégorie` | `category` | See `BudgetCategory` in schema |
| `Notes` | `notes` | Optional |

## `Immobilier`

Headers match `IMMOBILIER_HEADERS` in `workbook-template.ts`. Core fields include detention (`SCI` / `DIRECT`), regime (`IR_REEL`, `IR_MICRO`, `LMNP_REEL`, `LMNP_MICRO`, `IS`, `RESIDENCE_PRINCIPALE`), purchase/current values, loan parameters, rent, and tax inputs. Full field list: `packages/core/src/schema.ts` → `Property`.

## `DCA`

One logical plan may span multiple rows (one row per basket).

| Column | Meaning |
|---|---|
| `ID` | Plan id |
| `Libellé` | Plan label |
| `Enveloppe` | Target envelope |
| `Montant` | Contribution amount |
| `Fréquence` | `MENSUEL`, `TRIMESTRIEL`, `ANNUEL` |
| `Mois versement` | Optional month for annual/quarterly schedules |
| `Panier` | Basket label |
| `Actifs` | Asset ids in the basket |
| `Cible %` | Target weight (0–1); plan line weights must sum to 1 when saved via API |

## `Prix manuels`

Optional sheet for dated valuations of assets whose `Source prix` is `manual`.

| Column | Schema field | Rules |
|---|---|---|
| `Actif` | `assetId` | Existing asset with source `manual` |
| `Date` | `date` | Calendar date, not in the future |
| `Prix` | `price` | Finite number greater than zero |

Logical key: `Actif + Date`. Last valid row wins when duplicates exist. Invalid and orphan rows are ignored for valuation. See [Manual price persistence](../architecture/manual-price-persistence.md).

## `Exposition geo`

Optional sheet for look-through geographic weights. See [Geographic allocation](../architecture/geographic-allocation.md) and [ADR 0008](../adr/0008-geographic-allocation.md).

| Column | Schema field | Rules |
|---|---|---|
| `Actif` | `assetId` | Existing asset id |
| `Pays` | `country` | ISO 3166-1 alpha-2 or `OTHER` |
| `Poids %` | `weight` | Percent in Excel (0–100); fraction in `[0, 1]` in the model; rows for one asset must sum to ~1 |
| `Source` | `source` | `justetf` or `manual` |

All rows for one `Actif` are replaced together on write. Missing sheet ⇒ empty collection.

## Validation ownership

- Zod parsing: `@patrimo/core/schema`
- Sheet presence checks: `validateExcelFile` in `src/lib/excel.ts`
- Mobile parse/serialize: `mobile/lib/excel-mobile.ts`

## See also

- [Glossary](glossary.md)
- [Workbook persistence](../architecture/workbook-persistence.md)
- [API routes](api-routes.md)
