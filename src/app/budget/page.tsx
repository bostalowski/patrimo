import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardValue,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AllocationDonut } from "@/components/charts/allocation-donut";
import { getBudget } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { formatEuro, formatPercent, signClass } from "@/lib/utils";
import type { BudgetLine } from "@/lib/schema";
import {
  CATEGORY_LABELS,
  FREQUENCY_LABELS,
  monthlyAmount,
  summarizeBudget,
} from "@/lib/budget";
import { BudgetForm } from "./budget-form";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  requireExcelConfigured();
  const lines = getBudget();
  const summary = summarizeBudget(lines);

  const revenus = lines
    .filter((l) => l.kind === "REVENU")
    .sort((a, b) => monthlyAmount(b) - monthlyAmount(a));
  const depenses = lines
    .filter((l) => l.kind === "DEPENSE")
    .sort((a, b) => monthlyAmount(b) - monthlyAmount(a));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Saisis tes revenus et dépenses récurrents pour estimer ta capacité d&apos;épargne mensuelle.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Revenus mensuels</CardTitle>
            <CardValue className="text-emerald-600 dark:text-emerald-400">
              {formatEuro(summary.revenusMensuels)}
            </CardValue>
            <p className="text-xs text-zinc-500">{revenus.length} ligne(s)</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dépenses mensuelles</CardTitle>
            <CardValue className="text-rose-600 dark:text-rose-400">
              {formatEuro(summary.depensesMensuelles)}
            </CardValue>
            <p className="text-xs text-zinc-500">{depenses.length} ligne(s)</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Capacité d&apos;épargne</CardTitle>
            <CardValue className={signClass(summary.capaciteEpargne)}>
              {formatEuro(summary.capaciteEpargne)}
            </CardValue>
            <p className="text-xs text-zinc-500">par mois</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Taux d&apos;épargne</CardTitle>
            <CardValue className={signClass(summary.tauxEpargne)}>
              {formatPercent(summary.tauxEpargne)}
            </CardValue>
            <p className="text-xs text-zinc-500">épargne / revenus</p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Répartition des dépenses</CardTitle>
        </CardHeader>
        <CardBody>
          <AllocationDonut data={summary.depensesParCategorie} />
        </CardBody>
      </Card>

      <BudgetSection
        title="Revenus"
        lines={revenus}
        total={summary.revenusMensuels}
        defaultKind="REVENU"
        amountClass="text-emerald-600 dark:text-emerald-400"
      />

      <BudgetSection
        title="Dépenses"
        lines={depenses}
        total={summary.depensesMensuelles}
        defaultKind="DEPENSE"
        amountClass="text-rose-600 dark:text-rose-400"
      />
    </div>
  );
}

function BudgetSection({
  title,
  lines,
  total,
  defaultKind,
  amountClass,
}: {
  title: string;
  lines: BudgetLine[];
  total: number;
  defaultKind: "REVENU" | "DEPENSE";
  amountClass: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="text-xs text-zinc-500">
            Total mensualisé : <span className={amountClass}>{formatEuro(total)}</span>
          </p>
        </div>
        <BudgetForm defaultKind={defaultKind} />
      </CardHeader>
      <CardBody className="px-0">
        {lines.length === 0 ? (
          <p className="px-6 py-4 text-sm text-zinc-500">
            Aucune ligne pour le moment.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Libellé</TH>
                <TH>Catégorie</TH>
                <TH className="text-right">Montant</TH>
                <TH>Fréquence</TH>
                <TH className="text-right">Équivalent mensuel</TH>
                <TH className="w-12"></TH>
              </TR>
            </THead>
            <TBody>
              {lines.map((line) => (
                <TR key={line.id}>
                  <TD>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {line.label}
                    </div>
                    {line.notes && (
                      <div className="text-xs text-zinc-500">{line.notes}</div>
                    )}
                  </TD>
                  <TD>
                    <Badge>{CATEGORY_LABELS[line.category]}</Badge>
                  </TD>
                  <TD className="text-right font-mono tabular-nums">
                    {formatEuro(line.amount)}
                  </TD>
                  <TD className="text-xs text-zinc-500">
                    {FREQUENCY_LABELS[line.frequency]}
                  </TD>
                  <TD
                    className={`text-right font-mono font-semibold tabular-nums ${amountClass}`}
                  >
                    {formatEuro(monthlyAmount(line))}
                  </TD>
                  <TD className="text-right">
                    <BudgetForm line={line} trigger="icon" />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}
