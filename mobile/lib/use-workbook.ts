import { useState, useEffect, useCallback } from "react";
import type { Workbook } from "@patrimo/core/schema";
import { parseWorkbook } from "./excel-mobile";
import { getToken, getFileId, downloadFile, clearToken } from "./google-drive";
import { loadPrices, buildPriceMap, type PriceStore } from "./price-sync";

type WorkbookState = {
  workbook: Workbook | null;
  prices: Map<string, number>;
  priceStore: PriceStore;
  loading: boolean;
  error: string | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useWorkbook(): WorkbookState {
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [priceStore, setPriceStore] = useState<PriceStore>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      const fileId = await getFileId();

      if (!token || !fileId) {
        setConnected(false);
        setLoading(false);
        return;
      }

      setConnected(true);

      const buffer = await downloadFile(token, fileId);
      const wb = parseWorkbook(buffer);
      setWorkbook(wb);

      const prices = await loadPrices();
      setPriceStore(prices);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connect = useCallback(async () => {
    // OAuth flow handled in settings screen
    setConnected(true);
    await load();
  }, [load]);

  const disconnect = useCallback(async () => {
    await clearToken();
    setConnected(false);
    setWorkbook(null);
  }, []);

  const prices = workbook
    ? buildPriceMap(workbook.assets, priceStore)
    : new Map<string, number>();

  return {
    workbook,
    prices,
    priceStore,
    loading,
    error,
    connected,
    connect,
    disconnect,
    refresh: load,
  };
}
