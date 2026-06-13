import type { Transaction, Workbook } from "@/lib/schema";
import type { AssetPriceHistory, PriceStore } from "@/lib/store";
import { livretDailyValues, livretFlows } from "@/lib/livret";

export type DailyPoint = {
  date: string;
  value: number;
  invested: number;
};

export type AssetHistorySeries = {
  assetId: string;
  label: string;
  values: number[];
  invested: number[];
};

export type HistorySeries = {
  dates: string[];
  perAsset: AssetHistorySeries[];
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

export function aggregateHistory(
  history: HistorySeries,
  selectedAssetIds?: ReadonlySet<string>,
): DailyPoint[] {
  const includes = (id: string) =>
    selectedAssetIds === undefined || selectedAssetIds.has(id);
  return history.dates.map((date, index) => {
    let value = 0;
    let invested = 0;
    for (const series of history.perAsset) {
      if (!includes(series.assetId)) continue;
      value += series.values[index] ?? 0;
      invested += series.invested[index] ?? 0;
    }
    return { date, value, invested };
  });
}

export function buildHistorySeries(
  workbook: Workbook,
  prices: PriceStore,
  manual: PriceStore,
): HistorySeries {
  const txs = [...workbook.transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  if (txs.length === 0) return { dates: [], perAsset: [] };

  const firstDate = toIsoDate(txs[0].date);
  const lastDate = toIsoDate(new Date());

  const livretAccountIds = new Set(
    workbook.accounts.filter((a) => a.envelope === "LIVRET").map((a) => a.id),
  );
  const assetById = new Map(workbook.assets.map((a) => [a.id, a]));
  const qtyByAsset = new Map<string, number>();
  const investedByAsset = new Map<string, number>();
  const series = new Map<string, AssetHistorySeries>();

  const dates: string[] = [];

  const ensureSeries = (assetId: string): AssetHistorySeries => {
    const existing = series.get(assetId);
    if (existing) return existing;
    const created: AssetHistorySeries = {
      assetId,
      label: assetById.get(assetId)?.label ?? assetId,
      values: new Array(dates.length).fill(0),
      invested: new Array(dates.length).fill(0),
    };
    series.set(assetId, created);
    return created;
  };

  let txIndex = 0;

  for (let cursor = firstDate; cursor <= lastDate; cursor = addDays(cursor, 1)) {
    while (txIndex < txs.length && toIsoDate(txs[txIndex].date) <= cursor) {
      const tx = txs[txIndex];
      txIndex += 1;
      if (livretAccountIds.has(tx.compte)) continue;
      applyTxToQuantities(tx, qtyByAsset, investedByAsset);
      if (tx.actif !== INCOME_ASSET) ensureSeries(tx.actif);
    }

    const dateIndex = dates.length;
    dates.push(cursor);

    for (const assetSeries of series.values()) {
      const assetId = assetSeries.assetId;
      const qty = qtyByAsset.get(assetId) ?? 0;
      const invested = investedByAsset.get(assetId) ?? 0;
      const source = assetById.get(assetId)?.source;
      const history = source === "manual" ? manual[assetId] : prices[assetId];
      const price = history ? findPriceAtOrBefore(history, cursor) : null;
      const value =
        price !== null && price !== undefined
          ? qty * price
          : qty > 0
            ? invested
            : 0;
      assetSeries.values[dateIndex] = value;
      assetSeries.invested[dateIndex] = invested;
    }
  }

  for (const account of workbook.accounts) {
    if (account.envelope !== "LIVRET") continue;
    const flows = livretFlows(account.id, workbook.transactions);
    if (flows.length === 0) continue;
    const { values, invested } = livretDailyValues(
      account.rate ?? 0,
      flows,
      dates,
    );
    series.set(`livret:${account.id}`, {
      assetId: `livret:${account.id}`,
      label: account.label,
      values,
      invested,
    });
  }

  const perAsset = [...series.values()].sort((a, b) => {
    const lastA = a.values[a.values.length - 1] ?? 0;
    const lastB = b.values[b.values.length - 1] ?? 0;
    if (lastA !== lastB) return lastB - lastA;
    return a.label.localeCompare(b.label);
  });

  return { dates, perAsset };
}

export function buildBenchmarkSeries(
  points: DailyPoint[],
  history: AssetPriceHistory,
): (number | null)[] {
  const result: (number | null)[] = new Array(points.length).fill(null);
  if (points.length === 0) return result;

  const historyDates = Object.keys(history).sort();
  let histIdx = 0;
  let lastPrice: number | null = null;

  let prevInvested = 0;
  let shares = 0;
  let pendingCash = 0;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const delta = point.invested - prevInvested;
    prevInvested = point.invested;

    while (
      histIdx < historyDates.length &&
      historyDates[histIdx] <= point.date
    ) {
      const priceAtDate = history[historyDates[histIdx]];
      if (typeof priceAtDate === "number" && priceAtDate > 0) {
        lastPrice = priceAtDate;
      }
      histIdx += 1;
    }

    if (lastPrice === null) {
      pendingCash += delta;
      continue;
    }

    if (pendingCash !== 0) {
      shares += pendingCash / lastPrice;
      pendingCash = 0;
    }
    if (delta !== 0) {
      shares += delta / lastPrice;
    }
    result[i] = shares * lastPrice;
  }

  return result;
}
