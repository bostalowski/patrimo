"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { TH } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/lib/use-sorted";

type Props<K extends string> = {
  label: string;
  columnKey: K;
  activeKey: K;
  direction: SortDirection;
  onSort: (key: K) => void;
  align?: "left" | "right";
};

export function SortableTH<K extends string>({
  label,
  columnKey,
  activeKey,
  direction,
  onSort,
  align = "left",
}: Props<K>) {
  const isActive = activeKey === columnKey;
  const Icon = !isActive ? ChevronsUpDown : direction === "asc" ? ChevronUp : ChevronDown;

  return (
    <TH className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          "inline-flex select-none items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors",
          isActive
            ? "text-zinc-900 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
          align === "right" && "flex-row-reverse",
        )}
      >
        <span>{label}</span>
        <Icon
          className={cn(
            "h-3 w-3 shrink-0",
            !isActive && "opacity-50",
          )}
          aria-hidden
        />
      </button>
    </TH>
  );
}
