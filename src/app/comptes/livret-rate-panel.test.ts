import { describe, expect, it } from "vitest";
import type { Transaction } from "@patrimo/core/schema";
import {
  groupTransactionsByRatePalier,
} from "./livret-rate-panel";

const series = [
  { effectiveFrom: "2024-01-01", annualRate: 0.03 },
  { effectiveFrom: "2025-02-01", annualRate: 0.024 },
  { effectiveFrom: "2025-08-01", annualRate: 0.017 },
];

function tx(
  iso: string,
  type: Transaction["type"],
  amount: number,
): Transaction {
  return {
    date: new Date(`${iso}T00:00:00.000Z`),
    type,
    compte: "livret-a",
    actif: "",
    quantite: amount,
    prixUnitaire: 1,
    devise: "EUR",
    frais: 0,
    fraisDevise: "EUR",
  };
}

describe("groupTransactionsByRatePalier", () => {
  it("places each movement under the rate palier in force on its date", () => {
    const blocks = groupTransactionsByRatePalier(series, [
      tx("2024-06-15", "DEPOT", 5_000),
      tx("2025-03-10", "DEPOT", 1_000),
      tx("2025-09-01", "RETRAIT", 200),
      tx("2025-12-31", "INTERET", 120),
    ]);

    expect(blocks.map((b) => b.step.effectiveFrom)).toEqual([
      "2025-08-01",
      "2025-02-01",
      "2024-01-01",
    ]);

    expect(blocks[0].transactions.map((t) => t.type)).toEqual([
      "INTERET",
      "RETRAIT",
    ]);
    expect(blocks[0].transactions[1].amount).toBe(-200);

    expect(blocks[1].transactions).toHaveLength(1);
    expect(blocks[1].transactions[0].amount).toBe(1_000);

    expect(blocks[2].transactions).toHaveLength(1);
    expect(blocks[2].transactions[0].amount).toBe(5_000);
  });

  it("omits paliers with no movements", () => {
    const blocks = groupTransactionsByRatePalier(series, [
      tx("2025-09-01", "DEPOT", 100),
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].step.effectiveFrom).toBe("2025-08-01");
    expect(blocks[0].transactions).toHaveLength(1);
  });
});
