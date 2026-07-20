import type React from "react";
import {
  createContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import type { Workbook } from "@patrimo/core/schema";
import { parseWorkbook } from "./excel-mobile";
import { getActiveSource, readSourceFile, clearSource } from "./file-source";
import { syncPrices, buildPriceMap, type PriceStore } from "./price-sync";

export type WorkbookState = {
  workbook: Workbook | null;
  transactionKeys: string[];
  prices: Map<string, number>;
  priceStore: PriceStore;
  loading: boolean;
  error: string | null;
  connected: boolean;
  sourceType: "drive" | "local" | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
};

const EMPTY_MAP = new Map<string, number>();

const defaultState: WorkbookState = {
  workbook: null,
  transactionKeys: [],
  prices: EMPTY_MAP,
  priceStore: {},
  loading: true,
  error: null,
  connected: false,
  sourceType: null,
  connect: async () => {},
  disconnect: async () => {},
  refresh: async () => {},
};

export const WorkbookContext = createContext<WorkbookState>(defaultState);

export function WorkbookProvider({ children }: { children: React.ReactNode }) {
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [transactionKeys, setTransactionKeys] = useState<string[]>([]);
  const [priceStore, setPriceStore] = useState<PriceStore>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [sourceType, setSourceType] = useState<"drive" | "local" | null>(null);

  const load = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);

      const source = await getActiveSource();

      if (!source) {
        setConnected(false);
        setSourceType(null);
        setWorkbook(null);
        setLoading(false);
        return;
      }

      setConnected(true);
      setSourceType(source.type);

      const buffer = await readSourceFile(source);
      const { workbook: wb, transactionKeys: keys } = parseWorkbook(buffer);
      setWorkbook(wb);
      setTransactionKeys(keys);

      const prices = await syncPrices(wb.assets, wb.transactions, force);
      setPriceStore(prices);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const connect = useCallback(async () => {
    await load(false);
  }, [load]);

  const disconnect = useCallback(async () => {
    await clearSource();
    setConnected(false);
    setSourceType(null);
    setWorkbook(null);
    setTransactionKeys([]);
    setPriceStore({});
  }, []);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  const prices = useMemo(
    () => (workbook ? buildPriceMap(workbook.assets, priceStore) : EMPTY_MAP),
    [workbook, priceStore],
  );

  const value = useMemo<WorkbookState>(
    () => ({
      workbook,
      transactionKeys,
      prices,
      priceStore,
      loading,
      error,
      connected,
      sourceType,
      connect,
      disconnect,
      refresh,
    }),
    [
      workbook,
      transactionKeys,
      prices,
      priceStore,
      loading,
      error,
      connected,
      sourceType,
      connect,
      disconnect,
      refresh,
    ],
  );

  return (
    <WorkbookContext.Provider value={value}>{children}</WorkbookContext.Provider>
  );
}
