import { ExternalLink } from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadWorkbook } from "@/lib/excel";
import { readManualPrices } from "@/lib/store";
import { ManualPriceForm } from "./manual-price-form";

export const dynamic = "force-dynamic";

export default async function ManualPricesPage() {
  const { assets } = loadWorkbook();
  const manualAssets = assets.filter((a) => a.source === "manual");
  const store = await readManualPrices();

  const entries = Object.entries(store)
    .flatMap(([assetId, history]) =>
      Object.entries(history).map(([date, price]) => ({ assetId, date, price })),
    )
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Prix manuels
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Saisis les VL de tes FCPE et autres actifs sans API.
          </p>
        </div>
        <a
          href="https://www.interepargne.natixis.com/web/portail-salarie/connexion-portail-salarie"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Espace Natixis Interépargne
        </a>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle saisie</CardTitle>
        </CardHeader>
        <CardBody>
          {manualAssets.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucun actif configuré avec la source <code>manual</code>.
            </p>
          ) : (
            <ManualPriceForm assets={manualAssets} entries={entries} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
