# Configure the Excel source

## Web / Electron

1. Open **Réglages** (`/reglages`).
2. Either:
   - **Choose an existing `.xlsx`**, or
   - **Create a blank workbook** with the required sheets.
3. Confirm the path is stored.

Persistence:

- Development: `./data/config.json` (unless `FINGRAPHS_DATA_DIR` is set)
- Packaged Electron: `~/Library/Application Support/patrimo/data/config.json`

`EXCEL_PATH` remains a fallback when `excelPath` is unset.

### Google Drive on desktop

Patrimo web/Electron does not call the Drive API. Mount the file with Google Drive Desktop, mark it available offline, then select that local path in **Réglages**. Details: root README.

## Mobile

1. Open **Settings**.
2. Choose **local file** or **Google Drive**.
3. For Drive, complete OAuth; the app downloads and re-uploads the workbook.

## Validation

Portfolio pages require a readable workbook with `Transactions`, `Actifs`, and `Comptes`. Web uses `requireExcelConfigured()` and redirects to **Réglages** when missing or invalid.

## See also

- [Workbook persistence](../architecture/workbook-persistence.md)
- [Local development setup](local-dev-setup.md)
