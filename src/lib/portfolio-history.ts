import type { Transaction, Workbook } from "@/lib/schema";
import type { PriceStore } from "@/lib/store";

export type DailyPoint = {
  date: string;
  value: number;
  invested: number;
};

const INCOME_ASSET = "INTERETS";

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

function applyTxToQuantities(
  tx: Transaction,
  qtyByAsset: Map<string, number>,
  investedByAsset: Map<string, number>,
): void {
  const get = (m: Map<string, number>, k: string) => m.get(k) ?? 0;
  const set = (m: Map<string, number>, k: string, v: number) => m.set(k, v);
  const price = tx.prixUnitaire ?? 0;
  const qty = tx.quantite;
  const fees = tx.frais ?? 0;

  switch (tx.type) {
    case "ACHAT": {
      set(qtyByAsset, tx.actif, get(qtyByAsset, tx.actif) + qty);
      set(investedByAsset, tx.actif, get(investedByAsset, tx.actif) + qty * price + fees);
      return;
    }
    case "VENTE": {
      set(qtyByAsset, tx.actif, get(qtyByAsset, tx.actif) - qty);
      const proceeds = qty * price - fees;
      set(investedByAsset, tx.actif, get(investedByAsset, tx.actif) - proceeds);
      return;
    }
    case "DIVIDENDE": {
      if (price === 0) {
        set(qtyByAsset, tx.actif, get(qtyByAsset, tx.actif) + qty);
      }
      return;
    }
    case "RETRAIT": {
      set(qtyByAsset, tx.actif, get(qtyByAsset, tx.actif) - qty);
      return;
    }
    case "TRANSFERT": {
      const networkFee = tx.fraisDevise === tx.actif ? fees : 0;
      set(qtyByAsset, tx.actif, get(qtyByAsset, tx.actif) - networkFee);
      return;
    }
    case "INTERET":
    case "DEPOT":
      return;
  }
}

function findPriceAtOrBefore(
  history: Record<string, number>,
  date: string,
): number | null {
  if (history[date] !== undefined) return history[date];
  const dates = Object.keys(history).sort();
  let best: number | null = null;
  for (const d of dates) {
    if (d <= date) best = history[d];
    else break;
  }
  return best;
}

export function buildHistorySeries(
  workbook: Workbook,
  prices: PriceStore,
  manual: PriceStore,
): DailyPoint[] {
  const txs = [...workbook.transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  if (txs.length === 0) return [];

  const firstDate = toIsoDate(txs[0].date);
  const lastDate = toIsoDate(new Date());

  const sourceByAsset = new Map(workbook.assets.map((a) => [a.id, a.source]));

  const qtyByAsset = new Map<string, number>();
  const investedByAsset = new Map<string, number>();

  let txIndex = 0;
  const points: DailyPoint[] = [];

  for (let cursor = firstDate; cursor <= lastDate; cursor = addDays(cursor, 1)) {
    while (
      txIndex < txs.length &&
      toIsoDate(txs[txIndex].date) <= cursor
    ) {
      applyTxToQuantities(txs[txIndex], qtyByAsset, investedByAsset);
      txIndex += 1;
    }

    let value = 0;
    let invested = 0;
    for (const [assetId, qty] of qtyByAsset.entries()) {
      if (assetId === INCOME_ASSET) continue;
      const source = sourceByAsset.get(assetId);
      const history = source === "manual" ? manual[assetId] : prices[assetId];
      const price = history ? findPriceAtOrBefore(history, cursor) : null;
      if (price !== null && price !== undefined) {
        value += qty * price;
      }
      invested += investedByAsset.get(assetId) ?? 0;
    }
    points.push({ date: cursor, value, invested });
  }

  return points;
}
