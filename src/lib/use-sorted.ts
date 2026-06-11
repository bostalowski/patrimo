"use client";

import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export type SortConfig<K extends string> = {
  key: K;
  direction: SortDirection;
};

export type SortValue = string | number | Date | null | undefined;

export type Accessors<T, K extends string> = Record<K, (row: T) => SortValue>;

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

function compare(a: SortValue, b: SortValue): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

export function useSortedRows<T, K extends string>(
  rows: T[],
  accessors: Accessors<T, K>,
  initial: SortConfig<K>,
) {
  const [sort, setSort] = useState<SortConfig<K>>(initial);

  const sorted = useMemo(() => {
    const get = accessors[sort.key];
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => compare(get(a), get(b)) * factor);
  }, [rows, sort, accessors]);

  const toggle = (key: K, defaultDirection: SortDirection = "desc") =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: defaultDirection },
    );

  return { sorted, sort, toggle };
}
