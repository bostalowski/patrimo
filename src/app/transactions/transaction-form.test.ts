import { describe, expect, it } from "vitest";
import {
  emptyTxValue,
  TX_CURRENCIES,
  validateTxValue,
} from "./transaction-form";

const accounts = [
  { id: "ledger", label: "Ledger" },
  { id: "kraken", label: "Kraken" },
];
const assets = [{ id: "BTC", label: "Bitcoin" }];

describe("devises d'une transaction", () => {
  it("N1: propose BTC, ETH et SOL", () => {
    expect(TX_CURRENCIES).toEqual(expect.arrayContaining(["BTC", "ETH", "SOL"]));
  });

  it("N2: un transfert en BTC garde la devise BTC", () => {
    const result = validateTxValue({
      ...emptyTxValue(accounts, assets),
      type: "TRANSFERT",
      compte: "ledger",
      compteDestination: "kraken",
      actif: "BTC",
      quantite: "0.5",
      devise: "BTC",
      fraisDevise: "BTC",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.devise).toBe("BTC");
      expect(result.payload.fraisDevise).toBe("BTC");
    }
  });

  it("E1: garde EUR, USD, GBP, CHF", () => {
    expect(TX_CURRENCIES).toEqual(
      expect.arrayContaining(["EUR", "USD", "GBP", "CHF"]),
    );
  });
});
