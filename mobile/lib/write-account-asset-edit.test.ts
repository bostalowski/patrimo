import * as XLSX from "xlsx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTIFS_HEADERS,
  COMPTES_HEADERS,
  DCA_HEADERS,
  SHEET_ACTIFS,
  SHEET_COMPTES,
  SHEET_DCA,
  SHEET_TRANSACTIONS,
  TRANSACTIONS_HEADERS,
} from "@patrimo/core/workbook-template";
import * as writeAccount from "./write-account";
import * as writeAsset from "./write-asset";

const sourceMocks = vi.hoisted(() => ({
  getActiveSource: vi.fn(),
  readSourceFile: vi.fn(),
  writeSourceFile: vi.fn(),
}));

vi.mock("./file-source", () => sourceMocks);

type PlannedAsyncFunction = (...args: unknown[]) => Promise<unknown>;

function plannedFunction(
  module: Record<string, unknown>,
  exportName: string,
): PlannedAsyncFunction {
  const candidate = module[exportName];
  expect(
    candidate,
    `Expected the planned ${exportName} export to exist`,
  ).toBeTypeOf("function");
  return candidate as PlannedAsyncFunction;
}

function workbookBuffer(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      [...TRANSACTIONS_HEADERS],
      [
        new Date("2026-01-10T00:00:00.000Z"),
        "ACHAT",
        "broker",
        null,
        "fund",
        2,
        100,
        "EUR",
        0,
        "EUR",
        null,
      ],
    ]),
    SHEET_TRANSACTIONS,
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      [...ACTIFS_HEADERS],
      ["fund", "Old fund", "FCPE", null, null, "manual", null, "EUR", 0.01],
    ]),
    SHEET_ACTIFS,
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      [...COMPTES_HEADERS],
      ["broker", "Old broker", "BROKER", "PEE", null, null, null],
    ]),
    SHEET_COMPTES,
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      [...DCA_HEADERS],
      ["plan", "Employee plan", "PEE", 200, "MENSUEL", null, "Fund", "fund", 100],
    ]),
    SHEET_DCA,
  );
  return XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    cellDates: true,
  }) as ArrayBuffer;
}

function writtenRows(sheetName: string): Record<string, unknown>[] {
  const written = sourceMocks.writeSourceFile.mock.calls[0][1] as ArrayBuffer;
  const workbook = XLSX.read(written, { type: "array", cellDates: true });
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    raw: true,
    defval: null,
  });
}

describe("mobile account and asset persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sourceMocks.getActiveSource.mockResolvedValue({
      type: "local",
      path: "/tmp/portfolio.xlsx",
    });
    sourceMocks.readSourceFile.mockResolvedValue(workbookBuffer());
    sourceMocks.writeSourceFile.mockResolvedValue(undefined);
  });

  it("updating an account replaces its workbook row and preserves transaction references", async () => {
    const updateAccount = plannedFunction(
      writeAccount as Record<string, unknown>,
      "updateAccountInSource",
    );

    await updateAccount({
      id: "broker",
      label: "Updated broker",
      type: "BROKER",
      envelope: "CTO",
      openDate: new Date("2020-03-04T00:00:00.000Z"),
      rate: 1.5,
      plafond: 150000,
    });

    expect(sourceMocks.writeSourceFile).toHaveBeenCalledOnce();
    expect(writtenRows(SHEET_COMPTES)).toEqual([
      expect.objectContaining({
        ID: "broker",
        "Libellé": "Updated broker",
        Enveloppe: "CTO",
        Taux: 1.5,
        Plafond: 150000,
      }),
    ]);
    expect(writtenRows(SHEET_TRANSACTIONS)).toEqual([
      expect.objectContaining({ Compte: "broker", Actif: "fund" }),
    ]);
  });

  it("updating an asset replaces its workbook row and preserves transaction and DCA references", async () => {
    const updateAsset = plannedFunction(
      writeAsset as Record<string, unknown>,
      "updateAssetInSource",
    );

    await updateAsset({
      id: "fund",
      label: "Updated fund",
      type: "FCPE",
      isin: "FR0000000001",
      ticker: "FUND",
      source: "manual",
      currency: "EUR",
      ter: 0.015,
    });

    expect(sourceMocks.writeSourceFile).toHaveBeenCalledOnce();
    expect(writtenRows(SHEET_ACTIFS)).toEqual([
      expect.objectContaining({
        ID: "fund",
        "Libellé": "Updated fund",
        ISIN: "FR0000000001",
        Ticker: "FUND",
        TER: 0.015,
      }),
    ]);
    expect(writtenRows(SHEET_TRANSACTIONS)).toEqual([
      expect.objectContaining({ Compte: "broker", Actif: "fund" }),
    ]);
    expect(writtenRows(SHEET_DCA)).toEqual([
      expect.objectContaining({ ID: "plan", Actifs: "fund" }),
    ]);
  });

  it("updating an unknown account is rejected without writing the workbook", async () => {
    const updateAccount = plannedFunction(
      writeAccount as Record<string, unknown>,
      "updateAccountInSource",
    );

    await expect(
      updateAccount({
        id: "missing",
        label: "Missing",
        type: "BROKER",
        envelope: "CTO",
      }),
    ).rejects.toThrow(/account.*(?:unknown|not found)|(?:unknown|not found).*account/i);
    expect(sourceMocks.writeSourceFile).not.toHaveBeenCalled();
  });

  it("updating an unknown asset is rejected without writing the workbook", async () => {
    const updateAsset = plannedFunction(
      writeAsset as Record<string, unknown>,
      "updateAssetInSource",
    );

    await expect(
      updateAsset({
        id: "missing",
        label: "Missing",
        type: "ETF",
        source: "manual",
        currency: "EUR",
      }),
    ).rejects.toThrow(/asset.*(?:unknown|not found)|(?:unknown|not found).*asset/i);
    expect(sourceMocks.writeSourceFile).not.toHaveBeenCalled();
  });
});
