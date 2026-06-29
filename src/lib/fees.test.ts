import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/schema";
import { feesByCurrency } from "@/lib/fees";

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
