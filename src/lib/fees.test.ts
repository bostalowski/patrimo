import { describe, expect, it } from "vitest";
import type { Account, Asset, Transaction } from "@/lib/schema";
import {
  estimatedAnnualTer,
  feeRatio,
  feesByAccount,
  feesByAsset,
  feesByCurrency,
  feesByType,
  feesByYear,
} from "@/lib/fees";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    date: new Date("2024-01-01"),
    type: "ACHAT",
    compte: "compte-1",
    actif: "BTC",
    quantite: 1,
    prixUnitaire: 100,
    devise: "EUR",
    frais: 0,
    fraisDevise: "EUR",
    ...overrides,
  };
}

describe("feesByCurrency — total & ventilation par devise", () => {
  it("somme les frais d'un actif quand ils sont tous dans la même devise", () => {
    const transactions = [
      tx({ actif: "CW8", frais: 1, fraisDevise: "EUR" }),
      tx({ actif: "CW8", frais: 2, fraisDevise: "EUR" }),
      tx({ actif: "CW8", frais: 3, fraisDevise: "EUR" }),
    ];

    expect(feesByCurrency(transactions, "CW8")).toEqual([{ currency: "EUR", total: 6 }]);
  });

  it("ventile par devise quand plusieurs devises sont présentes", () => {
    const transactions = [
      tx({ actif: "BTC", frais: 12, fraisDevise: "EUR" }),
      tx({ actif: "BTC", type: "TRANSFERT", frais: 0.0003, fraisDevise: "BTC" }),
    ];

    expect(feesByCurrency(transactions, "BTC")).toEqual([
      { currency: "EUR", total: 12 },
      { currency: "BTC", total: 0.0003 },
    ]);
  });

  it("compte les frais de tous les types de transactions", () => {
    const transactions = [
      tx({ actif: "CW8", type: "ACHAT", frais: 1, fraisDevise: "EUR" }),
      tx({ actif: "CW8", type: "VENTE", frais: 2, fraisDevise: "EUR" }),
      tx({ actif: "CW8", type: "DIVIDENDE", frais: 3, fraisDevise: "EUR" }),
      tx({ actif: "CW8", type: "TRANSFERT", frais: 4, fraisDevise: "EUR" }),
    ];

    expect(feesByCurrency(transactions, "CW8")).toEqual([{ currency: "EUR", total: 10 }]);
  });

  it("trie le résultat avec EUR en premier puis par ordre alphabétique", () => {
    const transactions = [
      tx({ actif: "X", frais: 1, fraisDevise: "USD" }),
      tx({ actif: "X", frais: 1, fraisDevise: "BTC" }),
      tx({ actif: "X", frais: 1, fraisDevise: "EUR" }),
    ];

    expect(feesByCurrency(transactions, "X").map((f) => f.currency)).toEqual([
      "EUR",
      "BTC",
      "USD",
    ]);
  });
});

describe("feesByCurrency — filtrage & cas limites", () => {
  it("ne compte que les transactions de l'actif demandé", () => {
    const transactions = [
      tx({ actif: "CW8", frais: 5, fraisDevise: "EUR" }),
      tx({ actif: "ESE", frais: 99, fraisDevise: "EUR" }),
    ];

    expect(feesByCurrency(transactions, "CW8")).toEqual([{ currency: "EUR", total: 5 }]);
  });

  it("renvoie un total vide pour un actif sans aucun frais", () => {
    const transactions = [
      tx({ actif: "CW8", frais: 0, fraisDevise: "EUR" }),
      tx({ actif: "CW8", frais: 0, fraisDevise: "EUR" }),
    ];

    expect(feesByCurrency(transactions, "CW8")).toEqual([]);
  });

  it("ignore les frais à zéro sans créer d'entrée de devise", () => {
    const transactions = [
      tx({ actif: "BTC", frais: 10, fraisDevise: "EUR" }),
      tx({ actif: "BTC", type: "TRANSFERT", frais: 0, fraisDevise: "BTC" }),
    ];

    expect(feesByCurrency(transactions, "BTC")).toEqual([{ currency: "EUR", total: 10 }]);
  });
});

function asset(overrides: Partial<Asset>): Asset {
  return {
    id: "CW8",
    label: "Amundi MSCI World",
    type: "ETF",
    source: "yahoo",
    currency: "EUR",
    ...overrides,
  };
}

function account(overrides: Partial<Account>): Account {
  return {
    id: "compte-1",
    label: "PEA Bourso",
    type: "BROKER",
    envelope: "PEA",
    ...overrides,
  };
}

describe("feesByYear", () => {
  it("aggregates transaction fees by calendar year", () => {
    const transactions = [
      tx({ date: new Date("2023-03-15"), frais: 5 }),
      tx({ date: new Date("2023-11-20"), frais: 3 }),
      tx({ date: new Date("2024-02-10"), frais: 7 }),
    ];

    expect(feesByYear(transactions)).toEqual([
      { year: 2023, transaction: 8, network: 0, total: 8 },
      { year: 2024, transaction: 7, network: 0, total: 7 },
    ]);
  });

  it("separates network fees (TRANSFERT with fraisDevise === actif) from transaction fees", () => {
    const transactions = [
      tx({ date: new Date("2024-01-01"), type: "ACHAT", frais: 10 }),
      tx({
        date: new Date("2024-06-01"),
        type: "TRANSFERT",
        actif: "BTC",
        frais: 0.0003,
        fraisDevise: "BTC",
      }),
      tx({
        date: new Date("2024-06-15"),
        type: "TRANSFERT",
        actif: "ETH",
        frais: 2,
        fraisDevise: "EUR",
      }),
    ];

    const result = feesByYear(transactions);
    expect(result).toEqual([
      { year: 2024, transaction: 12, network: 0.0003, total: 12.0003 },
    ]);
  });

  it("returns empty array when no transactions have fees", () => {
    const transactions = [tx({ frais: 0 }), tx({ frais: 0 })];
    expect(feesByYear(transactions)).toEqual([]);
  });
});

describe("feesByAsset", () => {
  it("aggregates fees per asset, sorted descending", () => {
    const assets = [
      asset({ id: "CW8", label: "MSCI World" }),
      asset({ id: "ESE", label: "S&P 500" }),
    ];
    const transactions = [
      tx({ actif: "CW8", frais: 3 }),
      tx({ actif: "ESE", frais: 10 }),
      tx({ actif: "CW8", frais: 2 }),
    ];

    expect(feesByAsset(transactions, assets)).toEqual([
      { assetId: "ESE", label: "S&P 500", fees: 10 },
      { assetId: "CW8", label: "MSCI World", fees: 5 },
    ]);
  });

  it("skips transactions without fees or without asset", () => {
    const transactions = [
      tx({ actif: "CW8", frais: 0 }),
      tx({ actif: "", frais: 5 }),
    ];
    expect(feesByAsset(transactions, [])).toEqual([]);
  });
});

describe("feesByAccount", () => {
  it("aggregates fees per account, joined with label and envelope", () => {
    const accounts = [
      account({ id: "pea", label: "PEA Bourso", envelope: "PEA" }),
      account({ id: "cto", label: "CTO TR", envelope: "CTO" }),
    ];
    const transactions = [
      tx({ compte: "pea", frais: 4 }),
      tx({ compte: "cto", frais: 7 }),
      tx({ compte: "pea", frais: 1 }),
    ];

    expect(feesByAccount(transactions, accounts)).toEqual([
      { accountId: "cto", label: "CTO TR", envelope: "CTO", fees: 7 },
      { accountId: "pea", label: "PEA Bourso", envelope: "PEA", fees: 5 },
    ]);
  });
});

describe("feesByType", () => {
  it("groups fees by transaction type with readable labels", () => {
    const transactions = [
      tx({ type: "ACHAT", frais: 5 }),
      tx({ type: "VENTE", frais: 3 }),
      tx({ type: "ACHAT", frais: 2 }),
      tx({ type: "DIVIDENDE", frais: 1 }),
    ];

    const result = feesByType(transactions);
    expect(result).toEqual([
      { type: "ACHAT", label: "Achat", fees: 7 },
      { type: "VENTE", label: "Vente", fees: 3 },
      { type: "DIVIDENDE", label: "Dividende", fees: 1 },
    ]);
  });

  it("excludes transaction types with zero fees", () => {
    const transactions = [
      tx({ type: "ACHAT", frais: 5 }),
      tx({ type: "VENTE", frais: 0 }),
    ];

    expect(feesByType(transactions)).toEqual([
      { type: "ACHAT", label: "Achat", fees: 5 },
    ]);
  });
});

describe("estimatedAnnualTer", () => {
  it("computes annual TER cost based on market value and ter rate", () => {
    const assets = [
      asset({ id: "CW8", label: "MSCI World", ter: 0.0038 }),
      asset({ id: "ESE", label: "S&P 500", ter: 0.0007 }),
    ];
    const prices = new Map([
      ["CW8", 500],
      ["ESE", 60],
    ]);
    const quantities = new Map([
      ["CW8", 20],
      ["ESE", 100],
    ]);

    const result = estimatedAnnualTer(assets, prices, quantities);
    expect(result.perAsset).toHaveLength(2);
    expect(result.perAsset[0].assetId).toBe("CW8");
    expect(result.perAsset[0].annualCost).toBeCloseTo(500 * 20 * 0.0038);
    expect(result.perAsset[1].assetId).toBe("ESE");
    expect(result.perAsset[1].annualCost).toBeCloseTo(60 * 100 * 0.0007);
    expect(result.total).toBeCloseTo(500 * 20 * 0.0038 + 60 * 100 * 0.0007);
  });

  it("skips assets without ter or with zero quantity", () => {
    const assets = [
      asset({ id: "CW8", ter: undefined }),
      asset({ id: "ESE", ter: 0.002 }),
    ];
    const prices = new Map([
      ["CW8", 500],
      ["ESE", 60],
    ]);
    const quantities = new Map([["CW8", 10]]);

    const result = estimatedAnnualTer(assets, prices, quantities);
    expect(result.perAsset).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("feeRatio", () => {
  it("returns the ratio of total fees to net invested", () => {
    expect(feeRatio(50, 10000)).toBeCloseTo(0.005);
  });

  it("returns 0 when net invested is zero or negative", () => {
    expect(feeRatio(50, 0)).toBe(0);
    expect(feeRatio(50, -100)).toBe(0);
  });
});
