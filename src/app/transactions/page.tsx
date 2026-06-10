import { loadWorkbook } from "@/lib/excel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  formatDate,
  formatEuro,
  formatFee,
  formatQuantity,
  signClass,
} from "@/lib/utils";
import type { TransactionType } from "@/lib/schema";

const typeVariants: Record<TransactionType, "default" | "success" | "danger" | "warning" | "info"> = {
  ACHAT: "success",
  VENTE: "danger",
  DIVIDENDE: "info",
  INTERET: "info",
  TRANSFERT: "warning",
  DEPOT: "default",
  RETRAIT: "warning",
};

export default function TransactionsPage() {
  const { transactions, assets, accounts } = loadWorkbook();
  const assetLabels = new Map(assets.map((a) => [a.id, a.label]));
  const accountLabels = new Map(accounts.map((a) => [a.id, a.label]));

  const sorted = [...transactions].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

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
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Type</TH>
                <TH>Compte</TH>
                <TH>Actif</TH>
                <TH className="text-right">Quantité</TH>
                <TH className="text-right">Prix unitaire</TH>
                <TH className="text-right">Montant</TH>
                <TH className="text-right">Frais</TH>
              </TR>
            </THead>
            <TBody>
              {sorted.map((tx, i) => {
                const montant =
                  tx.prixUnitaire !== null ? tx.quantite * tx.prixUnitaire : null;
                const sign =
                  tx.type === "ACHAT" || tx.type === "RETRAIT"
                    ? -1
                    : tx.type === "VENTE" ||
                        tx.type === "DIVIDENDE" ||
                        tx.type === "INTERET" ||
                        tx.type === "DEPOT"
                      ? 1
                      : 0;
                return (
                  <TR key={i}>
                    <TD className="whitespace-nowrap font-mono text-xs text-zinc-500">
                      {formatDate(tx.date)}
                    </TD>
                    <TD>
                      <Badge variant={typeVariants[tx.type]}>{tx.type}</Badge>
                    </TD>
                    <TD className="text-zinc-600 dark:text-zinc-400">
                      {accountLabels.get(tx.compte) ?? tx.compte}
                      {tx.compteDestination && (
                        <span className="text-zinc-400">
                          {" → "}
                          {accountLabels.get(tx.compteDestination) ??
                            tx.compteDestination}
                        </span>
                      )}
                    </TD>
                    <TD className="font-medium">
                      {assetLabels.get(tx.actif) ?? tx.actif}
                    </TD>
                    <TD className="text-right font-mono text-xs">
                      {formatQuantity(tx.quantite)}
                    </TD>
                    <TD className="text-right font-mono text-xs">
                      {tx.prixUnitaire !== null
                        ? formatEuro(tx.prixUnitaire, true)
                        : "—"}
                    </TD>
                    <TD
                      className={`text-right font-mono text-xs ${signClass(sign * (montant ?? 0))}`}
                    >
                      {montant !== null ? formatEuro(sign * montant) : "—"}
                    </TD>
                    <TD className="text-right font-mono text-xs text-zinc-500">
                      {formatFee(tx.frais, tx.fraisDevise)}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
