export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueId(source: string, taken: Iterable<string>): string {
  const takenSet = taken instanceof Set ? taken : new Set(taken);
  const base = slugify(source) || "item";
  if (!takenSet.has(base)) return base;
  let suffix = 2;
  while (takenSet.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
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

const eurCompactFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
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

export function formatEuroCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return eurCompactFormatter.format(value);
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return percentFormatter.format(value);
}

const compactPercentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatPercentCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const formatted = compactPercentFormatter.format(value);
  return value > 0 ? `+${formatted}` : formatted;
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

export function formatRelativeDuration(target: Date, from: Date = new Date()): string {
  if (Number.isNaN(target.getTime())) return "—";
  const diffMs = target.getTime() - from.getTime();
  if (diffMs <= 0) return "débloqué";

  const totalDays = Math.ceil(diffMs / (24 * 3600 * 1000));
  if (totalDays < 31) {
    return totalDays <= 1 ? "dans 1 jour" : `dans ${totalDays} jours`;
  }

  const totalMonths = Math.round(totalDays / 30.4375);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  const parts: string[] = [];
  if (years > 0) parts.push(years === 1 ? "1 an" : `${years} ans`);
  if (months > 0) parts.push(`${months} mois`);
  if (parts.length === 0) parts.push("moins d'un mois");

  return `dans ${parts.join(" ")}`;
}

export function formatFee(amount: number, currency: string): string {
  if (!Number.isFinite(amount) || amount === 0) return "—";
  if (currency === "EUR") return formatEuro(amount);
  return `${formatQuantity(amount)} ${currency}`;
}

export function latestPrice(history: Record<string, number> | undefined): number | null {
  if (!history) return null;
  const dates = Object.keys(history).sort();
  if (dates.length === 0) return null;
  return history[dates[dates.length - 1]];
}
