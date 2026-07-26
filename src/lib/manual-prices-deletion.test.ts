import { describe, expect, it } from "vitest";
import { deleteAccount, deleteAsset } from "@patrimo/core/deletion";
import type {
  Account,
  Asset,
  Transaction,
  Workbook,
} from "@patrimo/core/schema";

type ManualPrice = {
  assetId: string;
  date: Date;
  price: number;
};

type ManualPriceWorkbook = Workbook & {
  manualPrices: ManualPrice[];
};

function account(id: string): Account {
  return {
    id,
    label: id,
    type: "BROKER",
    envelope: "CTO",
  };
}

function asset(id: string): Asset {
  return {
    id,
    label: id,
    type: "ETF",
    source: "manual",
    currency: "EUR",
  };
}

function transaction(compte: string, actif: string): Transaction {
  return {
    date: new Date("2026-01-01T00:00:00.000Z"),
    type: "ACHAT",
    compte,
    actif,
    quantite: 1,
    prixUnitaire: 100,
    devise: "EUR",
    frais: 0,
    fraisDevise: "EUR",
  };
}

function manualPrice(assetId: string, date: string, price: number): ManualPrice {
  return {
    assetId,
    date: new Date(`${date}T00:00:00.000Z`),
    price,
  };
}

function workbook(overrides: Partial<ManualPriceWorkbook>): ManualPriceWorkbook {
  return {
    accounts: [],
    assets: [],
    transactions: [],
    budget: [],
    properties: [],
    dca: [],
    manualPrices: [],
    ...overrides,
  };
}

function pricesFrom(result: Workbook): ManualPrice[] {
  return (result as ManualPriceWorkbook).manualPrices;
}

describe("core deletion of manual prices", () => {
  it("deleting an asset removes all of its manual prices", () => {
    const retained = manualPrice("bond", "2026-01-15", 200);
    const source = workbook({
      assets: [asset("fund"), asset("bond")],
      manualPrices: [
        manualPrice("fund", "2026-01-15", 100),
        manualPrice("fund", "2026-01-16", 101),
        retained,
      ],
    });

    const result = deleteAsset(source, "fund");

    expect(pricesFrom(result.workbook)).toEqual([retained]);
  });

  it("cascading an account deletion removes manual prices for assets deleted by the cascade", () => {
    const retained = manualPrice("bond", "2026-01-15", 200);
    const source = workbook({
      accounts: [account("deleted"), account("other")],
      assets: [asset("fund"), asset("bond")],
      transactions: [
        transaction("deleted", "fund"),
        transaction("other", "bond"),
      ],
      manualPrices: [
        manualPrice("fund", "2026-01-15", 100),
        retained,
      ],
    });

    const result = deleteAccount(source, "deleted", "cascade");

    expect(result.deletedAssetIds).toEqual(["fund"]);
    expect(pricesFrom(result.workbook)).toEqual([retained]);
  });

  it("cascading an account deletion preserves manual prices for assets still referenced elsewhere", () => {
    const retained = manualPrice("fund", "2026-01-15", 100);
    const source = workbook({
      accounts: [account("deleted"), account("other")],
      assets: [asset("fund")],
      transactions: [
        transaction("deleted", "fund"),
        transaction("other", "fund"),
      ],
      manualPrices: [retained],
    });

    const result = deleteAccount(source, "deleted", "cascade");

    expect(result.deletedAssetIds).toEqual([]);
    expect(pricesFrom(result.workbook)).toEqual([retained]);
  });

  it("detaching an account preserves every manual price", () => {
    const manualPrices = [
      manualPrice("fund", "2026-01-15", 100),
      manualPrice("bond", "2026-01-15", 200),
    ];
    const source = workbook({
      accounts: [account("deleted")],
      assets: [asset("fund"), asset("bond")],
      transactions: [transaction("deleted", "fund")],
      manualPrices,
    });

    const result = deleteAccount(source, "deleted", "detach");

    expect(pricesFrom(result.workbook)).toEqual(manualPrices);
  });
});
