import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export {
  slugify,
  uniqueId,
  formatEuro,
  formatEuroCompact,
  formatPercent,
  formatPercentCompact,
  formatQuantity,
  formatDate,
  formatRelativeDuration,
  formatFee,
} from "@patrimo/core/format";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function signClass(value: number): string {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-rose-600 dark:text-rose-400";
  return "text-zinc-500 dark:text-zinc-400";
}
