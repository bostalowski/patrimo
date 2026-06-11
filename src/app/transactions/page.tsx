import { loadWorkbook } from "@/lib/excel";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TransactionsTable,
  type TransactionRow,
} from "./transactions-table";

export default function TransactionsPage() {
  const { transactions, assets, accounts } = loadWorkbook();
  const assetLabels = new Map(assets.map((a) => [a.id, a.label]));
  const accountLabels = new Map(accounts.map((a) => [a.id, a.label]));

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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {transactions.length} mouvements chargés depuis l&apos;Excel.
          Édition manuelle dans le fichier source.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Historique complet</CardTitle>
        </CardHeader>
        <CardBody className="px-0">
          <TransactionsTable rows={rows} />
        </CardBody>
      </Card>
    </div>
  );
}
