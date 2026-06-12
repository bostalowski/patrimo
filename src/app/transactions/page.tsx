import { loadWorkbook } from "@/lib/excel";
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
  const { transactions, assets, accounts } = loadWorkbook();
  const assetLabels = new Map(assets.map((a) => [a.id, a.label]));
  const accountLabels = new Map(accounts.map((a) => [a.id, a.label]));

  const usedAccountIds = new Set<string>();
  for (const tx of transactions) {
    usedAccountIds.add(tx.compte);
    if (tx.compteDestination) usedAccountIds.add(tx.compteDestination);
  }
  const accountOptions: AccountOption[] = accounts
    .filter((a) => usedAccountIds.has(a.id))
    .map((a) => ({ id: a.id, label: a.label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const rows: TransactionRow[] = transactions.map((tx, idx) => {
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
      id: `${idx}-${tx.date.getTime()}-${tx.type}-${tx.actif}-${tx.compte}`,
      date: tx.date,
      type: tx.type,
      compte: tx.compte,
      compteLabel: accountLabels.get(tx.compte) ?? tx.compte,
      compteDestinationLabel: tx.compteDestination
        ? (accountLabels.get(tx.compteDestination) ?? tx.compteDestination)
        : null,
      actif: tx.actif,
      actifLabel: assetLabels.get(tx.actif) ?? tx.actif,
      quantite: tx.quantite,
      prixUnitaire: tx.prixUnitaire,
      montant: gross !== null ? sign * gross : null,
      frais: tx.frais,
      fraisDevise: tx.fraisDevise,
    };
  });

  const allAccounts = accounts
    .map((a) => ({ id: a.id, label: a.label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const allAssets = assets
    .map((a) => ({ id: a.id, label: a.label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {transactions.length} mouvements chargés depuis l&apos;Excel. Tu peux
          en ajouter directement ici, ils seront écrits dans le classeur source.
        </p>
      </header>

      <NewTransactionForm assets={allAssets} accounts={allAccounts} />

      <Card>
        <CardHeader>
          <CardTitle>Historique complet</CardTitle>
        </CardHeader>
        <CardBody className="px-0">
          <TransactionsTable rows={rows} accounts={accountOptions} />
        </CardBody>
      </Card>
    </div>
  );
}
