import type { Transaction } from "@/lib/schema";
import { parseDate, parseNumber } from "./generic";
import type { MappedTransactionDraft } from "./generic";
import type { RawRow } from "./types";

const HEADER_ALIASES: Record<string, string[]> = {
  date: [
    "date",
    "datum",
    "buchungsdatum",
    "valutadatum",
    "transaction date",
    "trade date",
    "date d'opération",
    "date d'operation",
  ],
  type: [
    "type",
    "typ",
    "buchungstyp",
    "operation",
    "transaktionstyp",
    "transaction type",
    "action",
    "opération",
    "operation",
  ],
  isin: ["isin"],
  name: [
    "name",
    "wertpapier",
    "instrument",
    "asset",
    "title",
    "designation",
    "libellé",
    "libelle",
    "security",
  ],
  shares: [
    "shares",
    "stück",
    "stueck",
    "anzahl",
    "quantity",
    "menge",
    "quantité",
    "quantite",
    "qty",
    "parts",
  ],
  price: [
    "price",
    "kurs",
    "preis",
    "prix",
    "share price",
    "executed price",
    "execution price",
    "prix unitaire",
  ],
  amount: [
    "amount",
    "betrag",
    "value",
    "wert",
    "montant",
    "total",
    "gross",
  ],
  currency: ["currency", "währung", "waehrung", "devise", "ccy"],
  fee: [
    "fee",
    "fees",
    "gebühr",
    "gebuehr",
    "gebühren",
    "gebuehren",
    "frais",
    "commission",
  ],
  note: [
    "note",
    "notiz",
    "details",
    "description",
    "remark",
    "memo",
    "narrative",
  ],
};

const TYPE_KEYWORDS: Array<{ keywords: string[]; type: Transaction["type"] }> =
  [
    { keywords: ["kauf", "buy", "achat", "purchase"], type: "ACHAT" },
    {
      keywords: ["savings plan", "sparplan", "plan d'épargne", "dca"],
      type: "ACHAT",
    },
    { keywords: ["verkauf", "sell", "vente", "sale"], type: "VENTE" },
    {
      keywords: [
        "dividende",
        "dividend",
        "ausschüttung",
        "ausschuettung",
        "distribution",
        "coupon",
      ],
      type: "DIVIDENDE",
    },
    {
      keywords: ["zins", "interest", "intérêt", "interet"],
      type: "INTERET",
    },
  ];

const IGNORED_TYPE_KEYWORDS = [
  "card payment",
  "kartenzahlung",
  "paiement carte",
  "round up",
  "saveback",
  "tax",
  "steuer",
  "fee refund",
  "trade republic card",
  "einzahlung",
  "deposit",
  "dépôt",
  "depot",
  "auszahlung",
  "withdrawal",
  "retrait",
  "transfer",
  "übertrag",
  "transfert",
];

export type HeaderLookup = Map<string, string>;

export function detectTradeRepublicHeaders(headers: string[]): HeaderLookup {
  const lookup: HeaderLookup = new Map();
  for (const header of headers) {
    const key = header.trim().toLowerCase();
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(key)) {
        if (!lookup.has(field)) lookup.set(field, header);
      }
    }
  }
  return lookup;
}

export type TradeRepublicResult =
  | { kind: "draft"; draft: MappedTransactionDraft }
  | { kind: "skip"; reason: string };

export function applyTradeRepublicProfile(
  row: RawRow,
  defaultCompte: string,
  headerLookup: HeaderLookup,
): TradeRepublicResult {
  const get = (field: string): string | null => {
    const col = headerLookup.get(field);
    if (!col) return null;
    const v = row[col];
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s.length === 0 ? null : s;
  };

  const rawType = get("type");
  if (!rawType) {
    return { kind: "skip", reason: "Type d'opération absent" };
  }
  const detectedType = matchTradeRepublicType(rawType);
  if (!detectedType) {
    return { kind: "skip", reason: `Type ignoré : "${rawType}"` };
  }

  const date = parseDate(get("date"));
  const isin = get("isin");
  const name = get("name");
  const actif = isin ?? name;
  if (!actif) {
    return {
      kind: "skip",
      reason: `Aucun ISIN ni libellé d'actif pour "${rawType}"`,
    };
  }

  const quantite = parseNumber(get("shares"));
  let prixUnitaire = parseNumber(get("price"));
  const amount = parseNumber(get("amount"));
  if (prixUnitaire === null && amount !== null && quantite && quantite !== 0) {
    prixUnitaire = Math.abs(amount / quantite);
  }

  const devise = get("currency") ?? "EUR";
  const frais = Math.abs(parseNumber(get("fee")) ?? 0);
  const notes = get("note");

  return {
    kind: "draft",
    draft: {
      date,
      type: detectedType,
      compte: defaultCompte,
      compteDestination: null,
      actif,
      quantite: quantite ?? 0,
      prixUnitaire,
      devise,
      frais,
      fraisDevise: devise,
      notes,
    },
  };
}

function matchTradeRepublicType(value: string): Transaction["type"] | null {
  const lower = value.toLowerCase();
  if (IGNORED_TYPE_KEYWORDS.some((kw) => lower.includes(kw))) {
    return null;
  }
  for (const { keywords, type } of TYPE_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }
  return null;
}
