import type { LivretRateStep } from "@patrimo/core/livret-rates";
import type { Transaction, TransactionType } from "@patrimo/core/schema";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardValue,
} from "@/components/ui/card";
import { formatDate, formatEuro, formatPercent } from "@/lib/utils";

export type LivretTxRow = {
  date: Date;
  type: TransactionType;
  amount: number;
};

type PalierBlock = {
  step: LivretRateStep;
  endExclusive: string | null;
  transactions: LivretTxRow[];
};

type Props = {
  balance: number;
  currentRate: number;
  series: LivretRateStep[];
  transactions: Transaction[];
};

const TYPE_LABELS: Partial<Record<TransactionType, string>> = {
  DEPOT: "Dépôt",
  RETRAIT: "Retrait",
  INTERET: "Intérêt",
  TRANSFERT: "Transfert",
};

/** Current regulated rate + palier history with account txs under each palier. */
export function LivretRatePanel({
  balance,
  currentRate,
  series,
  transactions,
}: Props) {
  const blocks = groupTransactionsByRatePalier(series, transactions);

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Solde livret {formatEuro(balance)}.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Taux réglementé (Livret A / LDDS)</CardTitle>
          <CardValue>{formatPercent(currentRate)}</CardValue>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            En vigueur aujourd&apos;hui — sert à l&apos;estimation des intérêts
            courus (indépendant du champ Taux du compte).
          </p>
        </CardHeader>
        <CardBody className="border-t border-zinc-200 dark:border-zinc-800">
          <h3 className="mb-3 pt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Historique des paliers et mouvements
          </h3>
          {blocks.length === 0 ? (
            <p className="py-2 text-sm text-zinc-500 dark:text-zinc-400">
              Aucun mouvement sur ce livret.
            </p>
          ) : (
            <ol className="space-y-4">
              {blocks.map((block) => {
                const isCurrent = block.endExclusive === null;
                return (
                  <li
                    key={block.step.effectiveFrom}
                    className="rounded-lg border border-zinc-100 dark:border-zinc-900"
                  >
                    <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-3 py-2.5 text-sm dark:border-zinc-900">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {formatPalierPeriod(
                          block.step.effectiveFrom,
                          block.endExclusive,
                        )}
                        {isCurrent && (
                          <span className="ml-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            en vigueur
                          </span>
                        )}
                      </span>
                      <span
                        className={
                          isCurrent
                            ? "font-semibold tabular-nums text-zinc-900 dark:text-zinc-50"
                            : "tabular-nums text-zinc-700 dark:text-zinc-300"
                        }
                      >
                        {formatPercent(block.step.annualRate)}
                      </span>
                    </div>
                    <ul className="divide-y divide-zinc-50 dark:divide-zinc-950">
                      {block.transactions.map((tx, txIndex) => (
                        <li
                          key={`${tx.date.toISOString()}-${tx.type}-${txIndex}`}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                        >
                          <span className="text-zinc-500 dark:text-zinc-400">
                            {formatDate(tx.date)}
                            <span className="ml-2 text-zinc-700 dark:text-zinc-300">
                              {TYPE_LABELS[tx.type] ?? tx.type}
                            </span>
                          </span>
                          <span
                            className={
                              tx.amount < 0
                                ? "tabular-nums text-rose-600 dark:text-rose-400"
                                : "tabular-nums text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            {tx.amount > 0 ? "+" : ""}
                            {formatEuro(tx.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/** Assign each transaction to the rate palier in force on its date (newest first). */
export function groupTransactionsByRatePalier(
  series: LivretRateStep[],
  transactions: Transaction[],
): PalierBlock[] {
  const sorted = [...series].sort((a, b) =>
    a.effectiveFrom < b.effectiveFrom
      ? -1
      : a.effectiveFrom > b.effectiveFrom
        ? 1
        : 0,
  );
  if (sorted.length === 0) return [];

  const blocks: PalierBlock[] = sorted.map((step, index) => ({
    step,
    endExclusive: sorted[index + 1]?.effectiveFrom ?? null,
    transactions: [],
  }));

  const rows = transactions
    .map((tx) => ({
      date: tx.date,
      type: tx.type,
      amount: signedLivretAmount(tx),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  for (const row of rows) {
    const iso = toIsoDate(row.date);
    let blockIndex = 0;
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i].effectiveFrom <= iso) blockIndex = i;
      else break;
    }
    blocks[blockIndex].transactions.push(row);
  }

  return blocks.filter((block) => block.transactions.length > 0).reverse();
}

function signedLivretAmount(tx: Transaction): number {
  const raw =
    tx.prixUnitaire !== null && tx.prixUnitaire > 0
      ? tx.quantite * tx.prixUnitaire
      : tx.quantite;
  if (tx.type === "RETRAIT") return -Math.abs(raw);
  return Math.abs(raw);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatPalierPeriod(
  startIso: string,
  endExclusiveIso: string | null,
): string {
  if (!endExclusiveIso) {
    return `depuis ${formatIsoDateFr(startIso)}`;
  }
  return `${formatIsoDateFr(startIso)} → ${formatIsoDateFr(dayBefore(endExclusiveIso))}`;
}

function dayBefore(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** Calendar date from YYYY-MM-DD without TZ drift. */
function formatIsoDateFr(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
