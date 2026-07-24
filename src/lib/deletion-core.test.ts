import { describe, expect, it } from "vitest";
import * as core from "@patrimo/core";
import type {
  Account,
  Asset,
  DcaConfig,
  Transaction,
  Workbook,
} from "@patrimo/core/schema";

type AccountDeletionMode = "cascade" | "detach";
type DeletionResult = {
  workbook: Workbook;
  deletedAssetIds: string[];
};
type DeletionApi = {
  NO_ACCOUNT_ID?: string;
  UNASSIGNED_CASH_ASSET_ID?: string;
  deleteAccount?: (
    workbook: Workbook,
    accountId: string,
    mode: AccountDeletionMode,
  ) => DeletionResult;
  deleteAsset?: (workbook: Workbook, assetId: string) => DeletionResult;
};

const deletionApi = core as DeletionApi;

function account(id: string, envelope: Account["envelope"] = "CTO"): Account {
  return {
    id,
    label: id,
    type: envelope === "LIVRET" ? "BANQUE" : "BROKER",
    envelope,
    rate: envelope === "LIVRET" ? 0.03 : undefined,
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

function transaction(
  overrides: Partial<Transaction> & Pick<Transaction, "compte" | "actif">,
): Transaction {
  return {
    date: new Date("2025-01-01T00:00:00.000Z"),
    type: "ACHAT",
    quantite: 1,
    prixUnitaire: 100,
    devise: "EUR",
    frais: 0,
    fraisDevise: "EUR",
    ...overrides,
  };
}

function plan(id: string, lines: DcaConfig["lines"]): DcaConfig {
  return {
    id,
    label: id,
    envelope: "CTO",
    amount: 100,
    frequency: "MENSUEL",
    lines,
  };
}

function workbook(overrides: Partial<Workbook> = {}): Workbook {
  return {
    accounts: [],
    assets: [],
    transactions: [],
    budget: [],
    properties: [],
    dca: [],
    ...overrides,
  };
}

function deleteAccount(
  source: Workbook,
  accountId: string,
  mode: AccountDeletionMode,
): DeletionResult {
  expect(
    deletionApi.deleteAccount,
    "The shared account deletion behavior is not implemented",
  ).toBeTypeOf("function");
  return deletionApi.deleteAccount!(source, accountId, mode);
}

function deleteAsset(source: Workbook, assetId: string): DeletionResult {
  expect(
    deletionApi.deleteAsset,
    "The shared asset deletion behavior is not implemented",
  ).toBeTypeOf("function");
  return deletionApi.deleteAsset!(source, assetId);
}

function noAccountId(): string {
  expect(
    deletionApi.NO_ACCOUNT_ID,
    "The No account identifier is not implemented",
  ).toBeTypeOf("string");
  return deletionApi.NO_ACCOUNT_ID!;
}

function unassignedCashAssetId(): string {
  expect(
    deletionApi.UNASSIGNED_CASH_ASSET_ID,
    "The unassigned cash identifier is not implemented",
  ).toBeTypeOf("string");
  return deletionApi.UNASSIGNED_CASH_ASSET_ID!;
}

describe("account cascade deletion", () => {
  it("deletes an empty account without changing unrelated workbook data", () => {
    const otherAccount = account("other");
    const source = workbook({
      accounts: [account("deleted"), otherAccount],
      assets: [asset("unused")],
      budget: [{ id: "salary", label: "Salary", kind: "REVENU", amount: 1, frequency: "MENSUEL", category: "SALAIRE" }],
    });

    const result = deleteAccount(source, "deleted", "cascade");

    expect(result.workbook).toEqual({
      ...source,
      accounts: [otherAccount],
    });
    expect(result.deletedAssetIds).toEqual([]);
  });

  it("deletes every transaction whose source account is deleted", () => {
    const deletedTransaction = transaction({
      compte: "deleted",
      actif: "stock",
    });
    const retainedTransaction = transaction({
      compte: "other",
      actif: "bond",
    });
    const source = workbook({
      accounts: [account("deleted"), account("other")],
      assets: [asset("stock"), asset("bond")],
      transactions: [deletedTransaction, retainedTransaction],
    });

    const result = deleteAccount(source, "deleted", "cascade");

    expect(result.workbook.transactions).toEqual([retainedTransaction]);
  });

  it("deletes complete transfers when the deleted account is the source or destination", () => {
    const sourceTransfer = transaction({
      type: "TRANSFERT",
      compte: "deleted",
      compteDestination: "other",
      actif: "stock",
    });
    const destinationTransfer = transaction({
      type: "TRANSFERT",
      compte: "other",
      compteDestination: "deleted",
      actif: "bond",
    });
    const retainedTransfer = transaction({
      type: "TRANSFERT",
      compte: "other",
      compteDestination: "third",
      actif: "shared",
    });
    const source = workbook({
      accounts: [account("deleted"), account("other"), account("third")],
      assets: [asset("stock"), asset("bond"), asset("shared")],
      transactions: [sourceTransfer, destinationTransfer, retainedTransfer],
    });

    const result = deleteAccount(source, "deleted", "cascade");

    expect(result.workbook.transactions).toEqual([retainedTransfer]);
  });

  it("preserves assets still referenced by transactions from another account", () => {
    const source = workbook({
      accounts: [account("deleted"), account("other")],
      assets: [asset("shared")],
      transactions: [
        transaction({ compte: "deleted", actif: "shared" }),
        transaction({ compte: "other", actif: "shared" }),
      ],
    });

    const result = deleteAccount(source, "deleted", "cascade");

    expect(result.workbook.assets).toEqual([asset("shared")]);
    expect(result.deletedAssetIds).toEqual([]);
  });

  it("deletes assets that become unused after deleting the account", () => {
    const source = workbook({
      accounts: [account("deleted"), account("other")],
      assets: [asset("orphaned"), asset("already-unused")],
      transactions: [
        transaction({ compte: "deleted", actif: "orphaned" }),
      ],
    });

    const result = deleteAccount(source, "deleted", "cascade");

    expect(result.workbook.assets).toEqual([asset("already-unused")]);
    expect(result.deletedAssetIds).toEqual(["orphaned"]);
  });

  it("removes newly unused assets from investment plans and removes empty structures", () => {
    const source = workbook({
      accounts: [account("deleted")],
      assets: [asset("stock"), asset("bond")],
      transactions: [
        transaction({ compte: "deleted", actif: "stock" }),
        transaction({ compte: "deleted", actif: "bond" }),
      ],
      dca: [
        plan("mixed", [
          { label: "Basket", assetIds: ["stock", "kept"], targetPct: 1 },
        ]),
        plan("empty", [
          { label: "Only deleted", assetIds: ["bond"], targetPct: 1 },
        ]),
      ],
    });

    const result = deleteAccount(source, "deleted", "cascade");

    expect(result.workbook.dca).toEqual([
      plan("mixed", [
        { label: "Basket", assetIds: ["kept"], targetPct: 1 },
      ]),
    ]);
  });

  it("rejects deletion when the account does not exist", () => {
    const source = workbook({ accounts: [account("existing")] });

    expect(() => deleteAccount(source, "missing", "cascade")).toThrow(
      /account/i,
    );
    expect(source.accounts).toEqual([account("existing")]);
  });
});

describe("account detachment", () => {
  it("reassigns source account references to No account", () => {
    const source = workbook({
      accounts: [account("deleted")],
      assets: [asset("stock")],
      transactions: [
        transaction({ compte: "deleted", actif: "stock" }),
      ],
    });

    const result = deleteAccount(source, "deleted", "detach");

    expect(result.workbook.transactions[0].compte).toBe(noAccountId());
  });

  it("reassigns destination account references to No account", () => {
    const source = workbook({
      accounts: [account("deleted"), account("other")],
      assets: [asset("stock")],
      transactions: [
        transaction({
          type: "TRANSFERT",
          compte: "other",
          compteDestination: "deleted",
          actif: "stock",
        }),
      ],
    });

    const result = deleteAccount(source, "deleted", "detach");

    expect(result.workbook.transactions[0].compteDestination).toBe(
      noAccountId(),
    );
  });

  it("preserves complete transfers while replacing only the deleted account reference", () => {
    const transfer = transaction({
      type: "TRANSFERT",
      compte: "deleted",
      compteDestination: "other",
      actif: "stock",
      quantite: 3,
    });
    const source = workbook({
      accounts: [account("deleted"), account("other")],
      assets: [asset("stock")],
      transactions: [transfer],
    });

    const result = deleteAccount(source, "deleted", "detach");

    expect(result.workbook.transactions).toEqual([
      { ...transfer, compte: noAccountId() },
    ]);
  });

  it("preserves asset definitions and investment plans when detaching an account", () => {
    const source = workbook({
      accounts: [account("deleted")],
      assets: [asset("stock")],
      transactions: [
        transaction({ compte: "deleted", actif: "stock" }),
      ],
      dca: [
        plan("plan", [
          { label: "Basket", assetIds: ["stock"], targetPct: 1 },
        ]),
      ],
    });

    const result = deleteAccount(source, "deleted", "detach");

    expect(result.workbook.assets).toEqual(source.assets);
    expect(result.workbook.dca).toEqual(source.dca);
    expect(result.deletedAssetIds).toEqual([]);
  });

  it("moves savings deposits withdrawals and recorded interest to unassigned cash", () => {
    const transactions = [
      transaction({
        compte: "savings",
        actif: "",
        type: "DEPOT",
        quantite: 1_000,
        prixUnitaire: 1,
      }),
      transaction({
        compte: "savings",
        actif: "",
        type: "RETRAIT",
        quantite: 200,
        prixUnitaire: 1,
      }),
      transaction({
        compte: "savings",
        actif: "INTERETS",
        type: "INTERET",
        quantite: 20,
        prixUnitaire: 1,
      }),
    ];
    const source = workbook({
      accounts: [account("savings", "LIVRET")],
      transactions,
    });

    const result = deleteAccount(source, "savings", "detach");

    expect(result.workbook.transactions).toEqual(
      transactions.map((entry) => ({
        ...entry,
        compte: noAccountId(),
        actif: unassignedCashAssetId(),
      })),
    );
  });

  it("does not create a persisted account row for No account", () => {
    const source = workbook({
      accounts: [account("deleted"), account("other")],
      assets: [asset("stock")],
      transactions: [
        transaction({ compte: "deleted", actif: "stock" }),
      ],
    });

    const result = deleteAccount(source, "deleted", "detach");

    expect(result.workbook.accounts).toEqual([account("other")]);
    expect(
      result.workbook.accounts.some((entry) => entry.id === noAccountId()),
    ).toBe(false);
  });

  it("rejects detachment when the account does not exist", () => {
    const source = workbook({ accounts: [account("existing")] });

    expect(() => deleteAccount(source, "missing", "detach")).toThrow(
      /account/i,
    );
  });
});

describe("asset cascade deletion", () => {
  it("deletes the asset definition and every referencing transaction across accounts", () => {
    const retained = transaction({ compte: "one", actif: "bond" });
    const source = workbook({
      accounts: [account("one"), account("two")],
      assets: [asset("stock"), asset("bond")],
      transactions: [
        transaction({ compte: "one", actif: "stock" }),
        transaction({ compte: "two", actif: "stock" }),
        retained,
      ],
    });

    const result = deleteAsset(source, "stock");

    expect(result.workbook.assets).toEqual([asset("bond")]);
    expect(result.workbook.transactions).toEqual([retained]);
  });

  it("deletes transfers that reference the deleted asset", () => {
    const source = workbook({
      accounts: [account("one"), account("two")],
      assets: [asset("stock")],
      transactions: [
        transaction({
          type: "TRANSFERT",
          compte: "one",
          compteDestination: "two",
          actif: "stock",
        }),
      ],
    });

    const result = deleteAsset(source, "stock");

    expect(result.workbook.transactions).toEqual([]);
  });

  it("preserves unrelated accounts assets and transactions", () => {
    const accounts = [account("one"), account("two")];
    const retainedAsset = asset("bond");
    const retainedTransaction = transaction({
      compte: "two",
      actif: "bond",
    });
    const source = workbook({
      accounts,
      assets: [asset("stock"), retainedAsset],
      transactions: [
        transaction({ compte: "one", actif: "stock" }),
        retainedTransaction,
      ],
    });

    const result = deleteAsset(source, "stock");

    expect(result.workbook.accounts).toEqual(accounts);
    expect(result.workbook.assets).toEqual([retainedAsset]);
    expect(result.workbook.transactions).toEqual([retainedTransaction]);
  });

  it("removes the asset from investment plan baskets while preserving other basket assets", () => {
    const source = workbook({
      assets: [asset("stock"), asset("bond")],
      dca: [
        plan("plan", [
          { label: "Basket", assetIds: ["stock", "bond"], targetPct: 1 },
        ]),
      ],
    });

    const result = deleteAsset(source, "stock");

    expect(result.workbook.dca).toEqual([
      plan("plan", [
        { label: "Basket", assetIds: ["bond"], targetPct: 1 },
      ]),
    ]);
  });

  it("removes empty investment plan baskets and plans", () => {
    const source = workbook({
      assets: [asset("stock")],
      dca: [
        plan("plan", [
          { label: "Basket", assetIds: ["stock"], targetPct: 1 },
        ]),
      ],
    });

    const result = deleteAsset(source, "stock");

    expect(result.workbook.dca).toEqual([]);
  });

  it("reports the deleted asset identifier for price cache cleanup", () => {
    const result = deleteAsset(
      workbook({ assets: [asset("stock")] }),
      "stock",
    );

    expect(result.deletedAssetIds).toEqual(["stock"]);
  });

  it("rejects deletion when the asset does not exist", () => {
    const source = workbook({ assets: [asset("existing")] });

    expect(() => deleteAsset(source, "missing")).toThrow(/asset/i);
    expect(source.assets).toEqual([asset("existing")]);
  });
});

describe("No account calculations", () => {
  it("groups detached asset positions under No account", () => {
    const result = deleteAccount(
      workbook({
        accounts: [account("deleted")],
        assets: [asset("stock")],
        transactions: [
          transaction({
            compte: "deleted",
            actif: "stock",
            quantite: 2,
            prixUnitaire: 50,
          }),
        ],
      }),
      "deleted",
      "detach",
    );

    const portfolio = core.buildPortfolio(
      result.workbook,
      new Map([["stock", 60]]),
    );

    expect(portfolio.accounts).toHaveLength(1);
    expect(portfolio.accounts[0].accountId).toBe(noAccountId());
    expect(portfolio.accounts[0].positions[0].assetId).toBe("stock");
  });

  it("includes unassigned asset positions in portfolio totals", () => {
    const result = deleteAccount(
      workbook({
        accounts: [account("deleted")],
        assets: [asset("stock")],
        transactions: [
          transaction({
            compte: "deleted",
            actif: "stock",
            quantite: 2,
            prixUnitaire: 50,
          }),
        ],
      }),
      "deleted",
      "detach",
    );

    const portfolio = core.buildPortfolio(
      result.workbook,
      new Map([["stock", 60]]),
    );

    expect(portfolio.totals.marketValue).toBe(120);
    expect(portfolio.totals.costBasis).toBe(100);
    expect(portfolio.totals.unrealizedPnL).toBe(20);
  });

  it("values unassigned cash from savings deposits withdrawals and recorded interest", () => {
    const result = deleteAccount(
      workbook({
        accounts: [account("savings", "LIVRET")],
        transactions: [
          transaction({
            compte: "savings",
            actif: "",
            type: "DEPOT",
            quantite: 1_000,
            prixUnitaire: 1,
          }),
          transaction({
            compte: "savings",
            actif: "",
            type: "RETRAIT",
            quantite: 200,
            prixUnitaire: 1,
          }),
          transaction({
            compte: "savings",
            actif: "INTERETS",
            type: "INTERET",
            quantite: 20,
            prixUnitaire: 1,
          }),
        ],
      }),
      "savings",
      "detach",
    );

    const portfolio = core.buildPortfolio(result.workbook, new Map());
    const unassigned = portfolio.accounts.find(
      (entry) => entry.accountId === noAccountId(),
    );

    expect(unassigned?.marketValue).toBe(820);
    expect(unassigned?.cashInterestRecorded).toBe(20);
    expect(portfolio.totals.marketValue).toBe(820);
  });

  it("does not estimate future savings interest after account detachment", () => {
    const result = deleteAccount(
      workbook({
        accounts: [account("savings", "LIVRET")],
        transactions: [
          transaction({
            compte: "savings",
            actif: "",
            type: "DEPOT",
            quantite: 1_000,
            prixUnitaire: 1,
          }),
        ],
      }),
      "savings",
      "detach",
    );

    const portfolio = core.buildPortfolio(result.workbook, new Map());
    const unassigned = portfolio.accounts.find(
      (entry) => entry.accountId === noAccountId(),
    );

    expect(unassigned?.cashInterestEstimated).toBe(0);
  });

  it("includes No account positions in portfolio history and performance", () => {
    const result = deleteAccount(
      workbook({
        accounts: [account("savings", "LIVRET")],
        transactions: [
          transaction({
            compte: "savings",
            actif: "",
            type: "DEPOT",
            quantite: 1_000,
            prixUnitaire: 1,
          }),
          transaction({
            compte: "savings",
            actif: "INTERETS",
            type: "INTERET",
            quantite: 20,
            prixUnitaire: 1,
          }),
        ],
      }),
      "savings",
      "detach",
    );

    const history = core.buildHistorySeries(result.workbook, {}, {});
    const cashSeries = history.perAsset.find(
      (entry) => entry.assetId === unassignedCashAssetId(),
    );

    expect(cashSeries?.values.at(-1)).toBe(1_020);
    expect(cashSeries?.invested.at(-1)).toBe(1_000);
  });

  it("excludes No account transactions from tax estimates", () => {
    const result = deleteAccount(
      workbook({
        accounts: [account("deleted", "PEA")],
        assets: [asset("stock")],
        transactions: [
          transaction({
            compte: "deleted",
            actif: "stock",
            type: "ACHAT",
            quantite: 2,
            prixUnitaire: 50,
          }),
          transaction({
            compte: "deleted",
            actif: "stock",
            type: "VENTE",
            quantite: 1,
            prixUnitaire: 75,
          }),
        ],
      }),
      "deleted",
      "detach",
    );

    expect(core.buildRealizedEvents(result.workbook)).toEqual([]);
  });
});
