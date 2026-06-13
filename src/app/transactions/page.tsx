import Link from "next/link";
import { Upload } from "lucide-react";
import { loadTransactionRows, loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TransactionsTable,
  type AccountOption,
  type TransactionRow,
} from "./transactions-table";
import { NewTransactionForm } from "./new-transaction-form";

export const dynamic = "force-dynamic";

export default function TransactionsPage() {
  requireExcelConfigured();
  const { assets, accounts } = loadWorkbook();
  const transactionRows = loadTransactionRows();
  const assetLabels = new Map(assets.map((a) => [a.id, a.label]));
  const accountLabels = new Map(accounts.map((a) => [a.id, a.label]));

  const usedAccountIds = new Set<string>();
  for (const { transaction: tx } of transactionRows) {
    usedAccountIds.add(tx.compte);
    if (tx.compteDestination) usedAccountIds.add(tx.compteDestination);
  }
  const accountOptions: AccountOption[] = accounts
    .filter((a) => usedAccountIds.has(a.id))
    .map((a) => ({ id: a.id, label: a.label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const rows: TransactionRow[] = transactionRows.map(({ transaction: tx, row }) => {
    const gross = tx.prixUnitaire !== null ? tx.quantite * tx.prixUnitaire : null;
    const sign =
      tx.type === "ACHAT" || tx.type === "RETRAIT"
        ? -1
        : tx.type === "VENTE" ||
            tx.type === "DIVIDENDE" ||
            tx.type === "INTERET" ||
            tx.type === "DEPOT"
          ? 1
          : 0;
    return {
      id: `row-${row}`,
      row,
      date: tx.date,
      type: tx.type,
      compte: tx.compte,
      compteLabel: accountLabels.get(tx.compte) ?? tx.compte,
      compteDestination: tx.compteDestination ?? null,
      compteDestinationLabel: tx.compteDestination
        ? (accountLabels.get(tx.compteDestination) ?? tx.compteDestination)
        : null,
      actif: tx.actif,
      actifLabel: tx.actif ? (assetLabels.get(tx.actif) ?? tx.actif) : "—",
      quantite: tx.quantite,
      prixUnitaire: tx.prixUnitaire,
      montant: gross !== null ? sign * gross : null,
      devise: tx.devise,
      frais: tx.frais,
      fraisDevise: tx.fraisDevise,
      notes: tx.notes ?? null,
    };
  });

  const allAccounts = accounts
    .map((a) => ({ id: a.id, label: a.label, envelope: a.envelope }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const allAssets = assets
    .map((a) => ({ id: a.id, label: a.label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {transactionRows.length} mouvements chargés depuis l&apos;Excel. Tu
            peux en ajouter, modifier ou supprimer directement ici, ils seront
            écrits dans le classeur source.
          </p>
        </div>
        <Link
          href="/transactions/import"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          <Upload className="h-4 w-4" />
          Importer un CSV
        </Link>
      </header>

      <NewTransactionForm assets={allAssets} accounts={allAccounts} />

      <Card>
        <CardHeader>
          <CardTitle>Historique complet</CardTitle>
        </CardHeader>
        <CardBody className="px-0">
          <TransactionsTable
            rows={rows}
            accounts={accountOptions}
            allAccounts={allAccounts}
            allAssets={allAssets}
          />
        </CardBody>
      </Card>
    </div>
  );
}
