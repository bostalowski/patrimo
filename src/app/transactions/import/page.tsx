import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { ImportWizard } from "./import-wizard";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  requireExcelConfigured();
  const { assets, accounts } = loadWorkbook();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Importer des transactions
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Charge un fichier exporté depuis ton broker (Trade Republic, ou
          n&apos;importe quel CSV) pour ajouter plusieurs transactions
          d&apos;un coup.
        </p>
      </header>

      <ImportWizard
        existingAssets={assets.map((a) => ({
          id: a.id,
          label: a.label,
          isin: a.isin,
          ticker: a.ticker,
          type: a.type,
          currency: a.currency,
        }))}
        existingAccounts={accounts.map((a) => ({
          id: a.id,
          label: a.label,
          type: a.type,
          envelope: a.envelope,
        }))}
      />
    </div>
  );
}
