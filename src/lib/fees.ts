import type { Transaction } from "@/lib/schema";

export type FeeTotal = {
  currency: string;
  total: number;
};

export function feesByCurrency(
  transactions: Transaction[],
  assetId: string,
): FeeTotal[] {
  const totals = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.actif !== assetId || tx.frais <= 0) continue;
    totals.set(tx.fraisDevise, (totals.get(tx.fraisDevise) ?? 0) + tx.frais);
  }

  return [...totals.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => {
      if (a.currency === "EUR") return -1;
      if (b.currency === "EUR") return 1;
      return a.currency.localeCompare(b.currency);
    });
}
