import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const eurFormatterPreciseSmall = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 8,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatEuro(value: number, precise = false): string {
  if (!Number.isFinite(value)) return "—";
  if (precise && Math.abs(value) < 1) return eurFormatterPreciseSmall.format(value);
  return eurFormatter.format(value);
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return percentFormatter.format(value);
}

export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return numberFormatter.format(value);
}

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function signClass(value: number): string {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-rose-600 dark:text-rose-400";
  return "text-zinc-500 dark:text-zinc-400";
}

export function formatFee(amount: number, currency: string): string {
  if (!Number.isFinite(amount) || amount === 0) return "—";
  if (currency === "EUR") return formatEuro(amount);
  return `${formatQuantity(amount)} ${currency}`;
}
