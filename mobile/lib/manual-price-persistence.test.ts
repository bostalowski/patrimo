import * as XLSX from "xlsx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTIFS_HEADERS,
  COMPTES_HEADERS,
  SHEET_ACTIFS,
  SHEET_COMPTES,
  SHEET_TRANSACTIONS,
  TRANSACTIONS_HEADERS,
} from "@patrimo/core/workbook-template";
import * as writeAsset from "./write-asset";

const sourceMocks = vi.hoisted(() => ({
  getActiveSource: vi.fn(),
  readSourceFile: vi.fn(),
  writeSourceFile: vi.fn(),
}));

vi.mock("./file-source", () => sourceMocks);

const MANUAL_PRICE_SHEET = "Prix manuels";
const MANUAL_PRICE_HEADERS = ["Actif", "Date", "Prix"];

type PlannedAsyncFunction = (...args: unknown[]) => Promise<unknown>;

function plannedFunction(exportName: string): PlannedAsyncFunction {
  const candidate = (writeAsset as Record<string, unknown>)[exportName];
  expect(
    candidate,
    `Expected the planned ${exportName} export to exist`,
  ).toBeTypeOf("function");
  return candidate as PlannedAsyncFunction;
}

function workbookBuffer(
  manualPrices: Array<[string, Date, number]> = [],
): ArrayBuffer {
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
      ["fund", "Employee fund", "FCPE", null, null, "manual", null, "EUR", null],
      ["etf", "Automatic ETF", "ETF", null, "CW8", "yahoo", "CW8.PA", "EUR", null],
    ]),
    SHEET_ACTIFS,
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      [...COMPTES_HEADERS],
      ["broker", "Broker", "BROKER", "CTO", null, null, null],
    ]),
    SHEET_COMPTES,
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      MANUAL_PRICE_HEADERS,
      ...manualPrices,
    ], { cellDates: true }),
    MANUAL_PRICE_SHEET,
  );
  return XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    cellDates: true,
  }) as ArrayBuffer;
}

function writtenManualPrices(): Record<string, unknown>[] {
  const written = sourceMocks.writeSourceFile.mock.calls[0][1] as ArrayBuffer;
  const workbook = XLSX.read(written, { type: "array", cellDates: true });
  return XLSX.utils.sheet_to_json(workbook.Sheets[MANUAL_PRICE_SHEET], {
    raw: true,
    defval: null,
  });
}

describe("mobile manual price persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sourceMocks.getActiveSource.mockResolvedValue({
      type: "drive",
      fileId: "drive-file",
    });
    sourceMocks.readSourceFile.mockResolvedValue(workbookBuffer());
    sourceMocks.writeSourceFile.mockResolvedValue(undefined);
  });

  it("adding a manual price persists it through the active workbook source", async () => {
    const upsertManualPrice = plannedFunction("upsertManualPriceInSource");
    const date = new Date("2026-07-20T00:00:00.000Z");

    await upsertManualPrice({ assetId: "fund", date, price: 123.45 });

    expect(sourceMocks.writeSourceFile).toHaveBeenCalledWith(
      expect.objectContaining({ type: "drive", fileId: "drive-file" }),
      expect.anything(),
    );
    expect(writtenManualPrices()).toEqual([
      expect.objectContaining({
        Actif: "fund",
        Date: expect.any(Date),
        Prix: 123.45,
      }),
    ]);
  });

  it("adding a price for an existing date replaces the displayed entry", async () => {
    const date = new Date("2026-07-20T00:00:00.000Z");
    sourceMocks.readSourceFile.mockResolvedValue(
      workbookBuffer([["fund", date, 100]]),
    );
    const upsertManualPrice = plannedFunction("upsertManualPriceInSource");

    await upsertManualPrice({ assetId: "fund", date, price: 125 });

    expect(writtenManualPrices()).toEqual([
      expect.objectContaining({ Actif: "fund", Prix: 125 }),
    ]);
  });

  it("deleting a manual price removes it through the active workbook source", async () => {
    const deletedDate = new Date("2026-07-20T00:00:00.000Z");
    const retainedDate = new Date("2026-07-21T00:00:00.000Z");
    sourceMocks.readSourceFile.mockResolvedValue(
      workbookBuffer([
        ["fund", deletedDate, 100],
        ["fund", retainedDate, 110],
      ]),
    );
    const deleteManualPrice = plannedFunction("deleteManualPriceFromSource");

    await deleteManualPrice("fund", deletedDate);

    expect(sourceMocks.writeSourceFile).toHaveBeenCalledOnce();
    expect(writtenManualPrices()).toEqual([
      expect.objectContaining({
        Actif: "fund",
        Date: expect.any(Date),
        Prix: 110,
      }),
    ]);
  });

  it("invalid, non-positive, and future-dated prices are rejected before writing", async () => {
    const upsertManualPrice = plannedFunction("upsertManualPriceInSource");
    const invalidEntries = [
      {
        assetId: "fund",
        date: new Date(Number.NaN),
        price: 100,
      },
      {
        assetId: "fund",
        date: new Date("2026-07-20T00:00:00.000Z"),
        price: 0,
      },
      {
        assetId: "fund",
        date: new Date("2026-07-20T00:00:00.000Z"),
        price: -1,
      },
      {
        assetId: "fund",
        date: new Date("2026-07-20T00:00:00.000Z"),
        price: Number.POSITIVE_INFINITY,
      },
      {
        assetId: "fund",
        date: new Date("2999-01-01T00:00:00.000Z"),
        price: 100,
      },
    ];

    for (const entry of invalidEntries) {
      await expect(upsertManualPrice(entry)).rejects.toThrow();
    }
    expect(sourceMocks.writeSourceFile).not.toHaveBeenCalled();
  });
});
