import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workbook } from "@patrimo/core/schema";

vi.mock("../../mobile/lib/file-source", () => ({
  getActiveSource: vi.fn(),
  readSourceFile: vi.fn(),
  writeSourceFile: vi.fn(),
}));

vi.mock("../../mobile/lib/excel-mobile", () => ({
  parseWorkbook: vi.fn(),
  serializeWorkbook: vi.fn(),
}));

vi.mock("../../mobile/lib/price-sync", () => ({
  removeAssetsFromPriceCache: vi.fn(),
}));

import * as fileSource from "../../mobile/lib/file-source";
import * as mobileExcel from "../../mobile/lib/excel-mobile";
import * as priceSync from "../../mobile/lib/price-sync";
import * as accountWriter from "../../mobile/lib/write-account";
import * as assetWriter from "../../mobile/lib/write-asset";

type MobileAccountDeletion = typeof accountWriter & {
  deleteAccountFromSource?: (
    accountId: string,
    mode: "cascade" | "detach",
  ) => Promise<void>;
};
type MobileAssetDeletion = typeof assetWriter & {
  deleteAssetFromSource?: (assetId: string) => Promise<void>;
};
type MobileExcel = typeof mobileExcel & {
  serializeWorkbook?: (source: ArrayBuffer, workbook: Workbook) => ArrayBuffer;
};
type MobilePriceSync = typeof priceSync & {
  removeAssetsFromPriceCache?: (assetIds: string[]) => Promise<void>;
};

const mobileAccount = accountWriter as MobileAccountDeletion;
const mobileAsset = assetWriter as MobileAssetDeletion;
const excelApi = mobileExcel as MobileExcel;
const priceApi = priceSync as MobilePriceSync;

const localSource = {
  type: "local",
  uri: "file:///portfolio.xlsx",
  name: "portfolio.xlsx",
} as const;
const driveSource = {
  type: "drive",
  token: "token",
  fileId: "file",
} as const;
const sourceBuffer = new ArrayBuffer(8);
const serializedBuffer = new ArrayBuffer(16);

function workbook(): Workbook {
  return {
    accounts: [
      {
        id: "broker",
        label: "Broker",
        type: "BROKER",
        envelope: "CTO",
      },
      {
        id: "other",
        label: "Other",
        type: "BROKER",
        envelope: "PEA",
      },
    ],
    assets: [
      {
        id: "stock",
        label: "Stock",
        type: "ETF",
        source: "manual",
        currency: "EUR",
      },
      {
        id: "bond",
        label: "Bond",
        type: "ETF",
        source: "manual",
        currency: "EUR",
      },
    ],
    transactions: [
      {
        date: new Date("2025-01-01T00:00:00.000Z"),
        type: "ACHAT",
        compte: "broker",
        actif: "stock",
        quantite: 1,
        prixUnitaire: 100,
        devise: "EUR",
        frais: 0,
        fraisDevise: "EUR",
      },
      {
        date: new Date("2025-01-02T00:00:00.000Z"),
        type: "ACHAT",
        compte: "other",
        actif: "bond",
        quantite: 1,
        prixUnitaire: 100,
        devise: "EUR",
        frais: 0,
        fraisDevise: "EUR",
      },
    ],
    dca: [],
    budget: [],
    properties: [],
  };
}

function requireAccountDeletion() {
  expect(
    mobileAccount.deleteAccountFromSource,
    "Mobile account deletion is not implemented",
  ).toBeTypeOf("function");
  return mobileAccount.deleteAccountFromSource!;
}

function requireAssetDeletion() {
  expect(
    mobileAsset.deleteAssetFromSource,
    "Mobile asset deletion is not implemented",
  ).toBeTypeOf("function");
  return mobileAsset.deleteAssetFromSource!;
}

describe("mobile deletion persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fileSource.getActiveSource).mockResolvedValue(localSource);
    vi.mocked(fileSource.readSourceFile).mockResolvedValue(sourceBuffer);
    vi.mocked(fileSource.writeSourceFile).mockResolvedValue(undefined);
    vi.mocked(mobileExcel.parseWorkbook).mockReturnValue({
      workbook: workbook(),
      transactionKeys: [],
    });
    excelApi.serializeWorkbook &&
      vi.mocked(excelApi.serializeWorkbook).mockReturnValue(serializedBuffer);
    priceApi.removeAssetsFromPriceCache &&
      vi.mocked(priceApi.removeAssetsFromPriceCache).mockResolvedValue(
        undefined,
      );
  });

  it("applies the shared account deletion transformation to the active workbook source", async () => {
    await requireAccountDeletion()("broker", "cascade");

    expect(excelApi.serializeWorkbook).toHaveBeenCalledWith(
      sourceBuffer,
      expect.objectContaining({
        accounts: [workbook().accounts[1]],
        assets: [workbook().assets[1]],
        transactions: [workbook().transactions[1]],
      }),
    );
  });

  it("applies the shared asset deletion transformation to the active workbook source", async () => {
    await requireAssetDeletion()("stock");

    expect(excelApi.serializeWorkbook).toHaveBeenCalledWith(
      sourceBuffer,
      expect.objectContaining({
        accounts: workbook().accounts,
        assets: [workbook().assets[1]],
        transactions: [workbook().transactions[1]],
      }),
    );
  });

  it("replaces a local workbook with one write after a successful transformation", async () => {
    await requireAssetDeletion()("stock");

    expect(fileSource.writeSourceFile).toHaveBeenCalledOnce();
    expect(fileSource.writeSourceFile).toHaveBeenCalledWith(
      localSource,
      serializedBuffer,
    );
  });

  it("uploads a Google Drive workbook once after a successful transformation", async () => {
    vi.mocked(fileSource.getActiveSource).mockResolvedValue(driveSource);

    await requireAssetDeletion()("stock");

    expect(fileSource.writeSourceFile).toHaveBeenCalledOnce();
    expect(fileSource.writeSourceFile).toHaveBeenCalledWith(
      driveSource,
      serializedBuffer,
    );
  });

  it("does not clean the device price cache when workbook persistence fails", async () => {
    vi.mocked(fileSource.writeSourceFile).mockRejectedValue(
      new Error("upload failed"),
    );

    await expect(requireAssetDeletion()("stock")).rejects.toThrow(
      "upload failed",
    );
    expect(priceApi.removeAssetsFromPriceCache).not.toHaveBeenCalled();
  });

  it("removes deleted assets from the device price cache after persistence succeeds", async () => {
    await requireAssetDeletion()("stock");

    expect(priceApi.removeAssetsFromPriceCache).toHaveBeenCalledWith([
      "stock",
    ]);
  });

  it("rejects deletion when no workbook source is configured", async () => {
    vi.mocked(fileSource.getActiveSource).mockResolvedValue(null);

    await expect(
      requireAccountDeletion()("broker", "cascade"),
    ).rejects.toThrow("No file source configured");
    expect(fileSource.readSourceFile).not.toHaveBeenCalled();
    expect(fileSource.writeSourceFile).not.toHaveBeenCalled();
  });
});
