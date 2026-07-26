# Import a Trade Republic CSV

Web-only procedure. Mobile has no CSV import UI today ([Platforms](../overview/platforms.md)).

## Export from Trade Republic

1. In the Trade Republic app: **Profil → Relevés de compte → Export des transactions**.
2. Choose period → create → download the CSV.
3. Keep the file as exported (UTF-8 CSV with broker headers such as `Datum` / `Date`, `Typ` / `Type`, `ISIN`, `Anzahl` / `Shares`, `Kurs` / `Price`).

There is no supported official Trade Republic API in Patrimo. File import is the supported channel.

## Import in Patrimo

1. Open **Transactions → Importer un CSV** (`/transactions/import`).
2. Choose the **Trade Republic** profile.
3. Select the target **Compte** (`defaultCompte` for every imported row).
4. Upload / paste the CSV and run **preview**.
5. Review:
   - **ok** rows ready to import
   - **duplicate** rows (signature `date|type|compte|actif|quantité|prix` against existing workbook and within the file)
   - **skipped** rows (card payments, deposits/withdrawals, taxes, transfers, …)
   - **error** rows (invalid date, unrecognized usable type without ignore match, …)
6. For unknown ISINs / names, fill asset metadata (type, price source, …) and create missing accounts if prompted.
7. **Commit** — one workbook write creates new accounts/assets and appends transactions.

## What is imported

Mapped operation types (keyword match on the Type column):

| Broker wording (examples) | Patrimo type |
|---|---|
| Kauf / Buy / Achat / Savings plan / Sparplan | `ACHAT` |
| Verkauf / Sell / Vente | `VENTE` |
| Dividende / Dividend / Ausschüttung | `DIVIDENDE` |
| Zins / Interest / Intérêt | `INTERET` |

Ignored examples: card payment, round up, saveback, tax, fee refund, deposit, withdrawal, transfer.

Asset identity prefers **ISIN**, else instrument name. Unit price falls back to `|amount| / shares` when Kurs is missing.

## Generic CSV alternative

If the broker is not Trade Republic, use the **CSV générique** profile: map columns to Patrimo fields and optionally set a default type / amount-sign mapping. Same preview → commit flow.

## API equivalent

`POST /api/transactions/import` with `action: "preview"` then `action: "commit"`. Profile shape for Trade Republic:

```json
{
  "action": "preview",
  "csv": "…",
  "profile": {
    "source": "trade-republic",
    "defaultCompte": "ACCOUNT_ID"
  }
}
```

Details: [API routes](../reference/api-routes.md).

## See also

- [Excel workbook schema](../reference/excel-workbook.md)
- [Workbook persistence](../architecture/workbook-persistence.md)
- Root README section « Importer des transactions depuis un broker »
