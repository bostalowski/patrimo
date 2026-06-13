import { TransactionType, type Transaction } from "@/lib/schema";
import { DEFAULT_AMOUNT_SIGN_TYPES } from "./types";
import type { GenericProfile, RawRow } from "./types";

export type MappedTransactionDraft = {
  date: Date | null;
  type: Transaction["type"] | null;
  compte: string | null;
  compteDestination: string | null;
  actif: string | null;
  quantite: number | null;
  prixUnitaire: number | null;
  devise: string;
  frais: number;
  fraisDevise: string;
  notes: string | null;
};

export function applyGenericProfile(
  row: RawRow,
  profile: GenericProfile,
): MappedTransactionDraft {
  const { mapping, defaults, typeValueMap } = profile;
  const amountSignTypes = profile.amountSignTypes ?? DEFAULT_AMOUNT_SIGN_TYPES;

  const date = mapping.date ? parseDate(row[mapping.date]) : null;
  const rawType = mapping.type ? toStr(row[mapping.type]) : null;
  const explicitType: Transaction["type"] | null =
    (rawType ? typeValueMap?.[rawType] : undefined) ??
    (rawType ? matchKnownType(rawType) : null) ??
    null;

  const signedAmount = mapping.montant
    ? parseNumber(row[mapping.montant])
    : null;
  const signType: Transaction["type"] | null =
    signedAmount === null
      ? null
      : signedAmount >= 0
        ? amountSignTypes.positive
        : amountSignTypes.negative;

  const type: Transaction["type"] | null =
    explicitType ?? signType ?? defaults.type ?? null;

  const compte = mapping.compte ? toStr(row[mapping.compte]) : null;
  const compteDestination = mapping.compteDestination
    ? toStr(row[mapping.compteDestination])
    : null;
  const actif = mapping.actif ? toStr(row[mapping.actif]) : null;
  const quantite =
    signedAmount !== null
      ? 1
      : mapping.quantite
        ? parseNumber(row[mapping.quantite])
        : null;
  const prixUnitaire =
    signedAmount !== null
      ? Math.abs(signedAmount)
      : mapping.prixUnitaire
        ? parseNumber(row[mapping.prixUnitaire])
        : null;
  const devise =
    (mapping.devise && toStr(row[mapping.devise])) ||
    defaults.devise ||
    "EUR";
  const frais = mapping.frais ? (parseNumber(row[mapping.frais]) ?? 0) : 0;
  const fraisDevise =
    (mapping.fraisDevise && toStr(row[mapping.fraisDevise])) ||
    defaults.fraisDevise ||
    devise;
  const notes = mapping.notes ? toStr(row[mapping.notes]) : null;

  return {
    date,
    type,
    compte: compte ?? defaults.compte ?? null,
    compteDestination,
    actif,
    quantite,
    prixUnitaire,
    devise,
    frais: Math.abs(frais),
    fraisDevise,
    notes,
  };
}

function matchKnownType(value: string): Transaction["type"] | null {
  const upper = value.trim().toUpperCase();
  const direct = TransactionType.safeParse(upper);
  if (direct.success) return direct.data;
  return null;
}

export function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? new Date(value) : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;

  const datePart = raw.split(/[T\s]/, 1)[0] ?? raw;

  const dmY = datePart.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (dmY) {
    const [, d, m, y] = dmY;
    let year = Number(y);
    if (year < 100) year += 2000;
    const month = Number(m);
    const day = Number(d);
    if (
      year >= 1900 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  const isoMatch = datePart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }

  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return new Date(parsed);

  return null;
}

export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const raw = String(value).trim();
  if (!raw) return null;

  let cleaned = raw.replace(/[\u00A0\u202F\u2009\s']/g, "");
  cleaned = cleaned.replace(/[^\d,.\-+]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "+") return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  if (lastComma === -1 && lastDot === -1) {
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  const decimalIndex = Math.max(lastComma, lastDot);
  const decimalSep = cleaned[decimalIndex];
  const thousandSep = decimalSep === "," ? "." : ",";
  cleaned = cleaned.split(thousandSep).join("").replace(",", ".");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length === 0 ? null : s;
}
