import type { Account, Asset, Transaction } from "@/lib/schema";
import type { PriceMap } from "@/lib/portfolio";

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

export type YearlyFees = {
  year: number;
  transaction: number;
  network: number;
  total: number;
};

export function feesByYear(transactions: Transaction[]): YearlyFees[] {
  const buckets = new Map<number, { transaction: number; network: number }>();

  for (const tx of transactions) {
    if (tx.frais <= 0) continue;
    const year = tx.date.getFullYear();
    const bucket = buckets.get(year) ?? { transaction: 0, network: 0 };

    const isNetworkFee =
      tx.type === "TRANSFERT" && tx.fraisDevise === tx.actif;

    if (isNetworkFee) {
      bucket.network += tx.frais;
    } else {
      bucket.transaction += tx.frais;
    }

    buckets.set(year, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, { transaction, network }]) => ({
      year,
      transaction,
      network,
      total: transaction + network,
    }));
}

export type AssetFees = {
  assetId: string;
  label: string;
  fees: number;
};

export function feesByAsset(
  transactions: Transaction[],
  assets: Asset[],
): AssetFees[] {
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const totals = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.frais <= 0 || !tx.actif) continue;
    totals.set(tx.actif, (totals.get(tx.actif) ?? 0) + tx.frais);
  }

  return [...totals.entries()]
    .map(([assetId, fees]) => ({
      assetId,
      label: assetMap.get(assetId)?.label ?? assetId,
      fees,
    }))
    .sort((a, b) => b.fees - a.fees);
}

export type AccountFees = {
  accountId: string;
  label: string;
  envelope: string;
  fees: number;
};

export function feesByAccount(
  transactions: Transaction[],
  accounts: Account[],
): AccountFees[] {
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const totals = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.frais <= 0) continue;
    totals.set(tx.compte, (totals.get(tx.compte) ?? 0) + tx.frais);
  }

  return [...totals.entries()]
    .map(([accountId, fees]) => {
      const account = accountMap.get(accountId);
      return {
        accountId,
        label: account?.label ?? accountId,
        envelope: account?.envelope ?? "CTO",
        fees,
      };
    })
    .sort((a, b) => b.fees - a.fees);
}

export type FeeTypeBreakdown = {
  type: string;
  label: string;
  fees: number;
};

const FEE_TYPE_LABELS: Record<string, string> = {
  ACHAT: "Achat",
  VENTE: "Vente",
  DIVIDENDE: "Dividende",
  TRANSFERT: "Transfert réseau",
  INTERET: "Intérêt",
  DEPOT: "Dépôt",
  RETRAIT: "Retrait",
};

export function feesByType(transactions: Transaction[]): FeeTypeBreakdown[] {
  const totals = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.frais <= 0) continue;
    totals.set(tx.type, (totals.get(tx.type) ?? 0) + tx.frais);
  }

  return [...totals.entries()]
    .map(([type, fees]) => ({
      type,
      label: FEE_TYPE_LABELS[type] ?? type,
      fees,
    }))
    .sort((a, b) => b.fees - a.fees);
}

export type TerEstimate = {
  assetId: string;
  label: string;
  ter: number;
  marketValue: number;
  annualCost: number;
};

export function estimatedAnnualTer(
  assets: Asset[],
  prices: PriceMap,
  quantities: Map<string, number>,
): { perAsset: TerEstimate[]; total: number } {
  const perAsset: TerEstimate[] = [];
  let total = 0;

  for (const asset of assets) {
    if (!asset.ter || asset.ter <= 0) continue;
    const qty = quantities.get(asset.id) ?? 0;
    if (qty <= 0) continue;
    const price = prices.get(asset.id);
    if (price === undefined || price === null) continue;

    const marketValue = qty * price;
    const annualCost = marketValue * asset.ter;
    perAsset.push({
      assetId: asset.id,
      label: asset.label,
      ter: asset.ter,
      marketValue,
      annualCost,
    });
    total += annualCost;
  }

  perAsset.sort((a, b) => b.annualCost - a.annualCost);
  return { perAsset, total };
}

export function feeRatio(totalFees: number, netInvested: number): number {
  if (netInvested <= 0) return 0;
  return totalFees / netInvested;
}
