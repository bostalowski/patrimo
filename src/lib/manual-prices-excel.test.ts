import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Workbook } from "@patrimo/core/schema";
import * as mobileExcel from "../../mobile/lib/excel-mobile";

const configState = vi.hoisted(() => ({ excelPath: null as string | null }));

vi.mock("@/lib/config", () => ({
  getConfiguredExcelPath: () => configState.excelPath,
  resolveUserPath: (path: string) => path,
}));

import * as webExcel from "@/lib/excel";

const MANUAL_PRICE_SHEET = "Prix manuels";
const MANUAL_PRICE_HEADERS = ["Actif", "Date", "Prix"];

type ManualPrice = {
  assetId: string;
  date: Date;
  price: number;
};

type ManualPriceWorkbook = Workbook & {
  manualPrices: ManualPrice[];
};

let temporaryDirectory: string;

beforeEach(() => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "patrimo-manual-prices-"));
  configState.excelPath = join(temporaryDirectory, "portfolio.xlsx");
  webExcel.resetWorkbookCache();
});

afterEach(() => {
  configState.excelPath = null;
  webExcel.resetWorkbookCache();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

function appendSheet(
  workbook: XLSX.WorkBook,
  name: string,
  rows: unknown[][],
): void {
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(rows, { cellDates: true }),
    name,
  );
}

function sourceBuffer(manualPriceRows?: unknown[][]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  appendSheet(workbook, "Transactions", [
    [
      "Date",
      "Type",
      "Compte",
      "Compte destination",
      "Actif",
      "Quantité",
      "Prix unitaire",
      "Devise",
      "Frais",
      "Frais devise",
      "Notes",
    ],
    [
      new Date("2026-01-01T00:00:00.000Z"),
      "ACHAT",
      "broker",
      null,
      "fund",
      2,
      50,
      "EUR",
      0,
      "EUR",
      "kept transaction",
    ],
  ]);
  appendSheet(workbook, "Actifs", [
    [
      "ID",
      "Libellé",
      "Type",
      "ISIN",
      "Ticker",
      "Source prix",
      "Param source",
      "Devise",
      "TER",
    ],
    ["fund", "Manual fund", "FCPE", null, null, "manual", null, "EUR", null],
    ["listed", "Listed fund", "ETF", null, null, "yahoo", "LISTED", "EUR", null],
  ]);
  appendSheet(workbook, "Comptes", [
    [
      "ID",
      "Libellé",
      "Type",
      "Enveloppe",
      "Date d'ouverture",
      "Taux",
      "Plafond",
    ],
    ["broker", "Broker", "BROKER", "CTO", null, null, null],
  ]);
  appendSheet(workbook, "Metadata", [
    ["Key", "Value"],
    ["preserved", "yes"],
  ]);
  if (manualPriceRows) {
    appendSheet(workbook, MANUAL_PRICE_SHEET, [
      MANUAL_PRICE_HEADERS,
      ...manualPriceRows,
    ]);
  }

  return XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    cellDates: true,
  }) as ArrayBuffer;
}

function writeWebSource(buffer: ArrayBuffer): void {
  const path = configState.excelPath;
  if (!path) throw new Error("Web Excel path is not configured");
  writeFileSync(path, Buffer.from(buffer));
}

function readWebSource(): XLSX.WorkBook {
  const path = configState.excelPath;
  if (!path) throw new Error("Web Excel path is not configured");
  return XLSX.read(readFileSync(path), {
    type: "buffer",
    cellDates: true,
  });
}

function manualPrice(assetId: string, date: string, price: number): ManualPrice {
  return {
    assetId,
    date: new Date(`${date}T00:00:00.000Z`),
    price,
  };
}

function workbook(manualPrices: ManualPrice[]): ManualPriceWorkbook {
  return {
    transactions: [
      {
        date: new Date("2026-01-01T00:00:00.000Z"),
        type: "ACHAT",
        compte: "broker",
        actif: "fund",
        quantite: 2,
        prixUnitaire: 50,
        devise: "EUR",
        frais: 0,
        fraisDevise: "EUR",
        notes: "kept transaction",
      },
    ],
    assets: [
      {
        id: "fund",
        label: "Manual fund",
        type: "FCPE",
        source: "manual",
        currency: "EUR",
      },
      {
        id: "listed",
        label: "Listed fund",
        type: "ETF",
        ticker: "LISTED",
        source: "yahoo",
        param: "LISTED",
        currency: "EUR",
      },
    ],
    accounts: [
      {
        id: "broker",
        label: "Broker",
        type: "BROKER",
        envelope: "CTO",
      },
    ],
    budget: [],
    properties: [],
    dca: [],
    manualPrices,
    geographicAllocations: [],
    sectorAllocations: [],
    diversificationTargets: [],
  };
}

function manualPricesFrom(source: Workbook): ManualPrice[] {
  return (source as ManualPriceWorkbook).manualPrices;
}

function sheetRows(
  workbook: XLSX.WorkBook,
  sheetName: string,
): unknown[][] | undefined {
  const sheet = workbook.Sheets[sheetName];
  return sheet
    ? XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        raw: true,
        defval: null,
      })
    : undefined;
}

function invalidAndDuplicateRows(): unknown[][] {
  return [
    ["fund", new Date("2026-01-15T00:00:00.000Z"), 100],
    ["fund", new Date("2026-01-15T00:00:00.000Z"), 0],
    ["missing", new Date("2026-01-15T00:00:00.000Z"), 300],
    ["listed", new Date("2026-01-15T00:00:00.000Z"), 400],
    ["fund", new Date("2999-01-01T00:00:00.000Z"), 500],
    ["fund", "not-a-date", 600],
    ["fund", new Date("2026-01-15T00:00:00.000Z"), 125],
  ];
}

describe("web and mobile manual-price Excel adapters", () => {
  it("web treats a missing Prix manuels sheet as an empty collection", () => {
    writeWebSource(sourceBuffer());

    const result = webExcel.loadWorkbook();

    expect(manualPricesFrom(result)).toEqual([]);
  });

  it("mobile treats a missing Prix manuels sheet as an empty collection", () => {
    const result = mobileExcel.parseWorkbook(sourceBuffer());

    expect(manualPricesFrom(result.workbook)).toEqual([]);
  });

  it("web parsing ignores invalid and orphan rows and keeps the last valid duplicate", () => {
    writeWebSource(sourceBuffer(invalidAndDuplicateRows()));

    const result = webExcel.loadWorkbook();

    expect(manualPricesFrom(result)).toEqual([
      manualPrice("fund", "2026-01-15", 125),
    ]);
  });

  it("mobile parsing ignores invalid and orphan rows and keeps the last valid duplicate", () => {
    const result = mobileExcel.parseWorkbook(
      sourceBuffer(invalidAndDuplicateRows()),
    );

    expect(manualPricesFrom(result.workbook)).toEqual([
      manualPrice("fund", "2026-01-15", 125),
    ]);
  });

  it("web serialization creates Prix manuels with the canonical headers", () => {
    writeWebSource(sourceBuffer());

    webExcel.replaceWorkbook(
      workbook([manualPrice("fund", "2026-01-15", 125)]),
    );

    expect(sheetRows(readWebSource(), MANUAL_PRICE_SHEET)?.[0]).toEqual(
      MANUAL_PRICE_HEADERS,
    );
  });

  it("mobile serialization creates Prix manuels with the canonical headers", () => {
    const serialized = mobileExcel.serializeWorkbook(
      sourceBuffer(),
      workbook([manualPrice("fund", "2026-01-15", 125)]),
    );
    const result = XLSX.read(serialized, { type: "array", cellDates: true });

    expect(sheetRows(result, MANUAL_PRICE_SHEET)?.[0]).toEqual(
      MANUAL_PRICE_HEADERS,
    );
  });

  it("web round-trips dated manual prices without changing other workbook data", () => {
    const expectedPrice = manualPrice("fund", "2026-01-15", 125);
    writeWebSource(sourceBuffer());
    const original = webExcel.loadWorkbook();

    webExcel.replaceWorkbook({
      ...original,
      manualPrices: [expectedPrice],
    } as ManualPriceWorkbook);
    webExcel.resetWorkbookCache();
    const parsed = webExcel.loadWorkbook();
    const persistedWorkbook = readWebSource();

    expect({
      manualPrices: manualPricesFrom(parsed),
      metadata: sheetRows(persistedWorkbook, "Metadata"),
      transactions: parsed.transactions,
    }).toEqual({
      manualPrices: [expectedPrice],
      metadata: [
        ["Key", "Value"],
        ["preserved", "yes"],
      ],
      transactions: original.transactions,
    });
  });

  it("mobile round-trips dated manual prices without changing other workbook data", () => {
    const expectedPrice = manualPrice("fund", "2026-01-15", 125);
    const source = sourceBuffer();
    const original = mobileExcel.parseWorkbook(source).workbook;
    const serialized = mobileExcel.serializeWorkbook(
      source,
      {
        ...original,
        manualPrices: [expectedPrice],
      } as ManualPriceWorkbook,
    );
    const parsed = mobileExcel.parseWorkbook(serialized);
    const persistedWorkbook = XLSX.read(serialized, {
      type: "array",
      cellDates: true,
    });

    expect({
      manualPrices: manualPricesFrom(parsed.workbook),
      metadata: sheetRows(persistedWorkbook, "Metadata"),
      transactions: parsed.workbook.transactions,
    }).toEqual({
      manualPrices: [expectedPrice],
      metadata: [
        ["Key", "Value"],
        ["preserved", "yes"],
      ],
      transactions: original.transactions,
    });
  });

  it("a newly created workbook includes an empty Prix manuels sheet", () => {
    const path = join(temporaryDirectory, "new-workbook.xlsx");

    webExcel.createEmptyWorkbook(path);

    const created = XLSX.read(readFileSync(path), {
      type: "buffer",
      cellDates: true,
    });
    expect(sheetRows(created, MANUAL_PRICE_SHEET)).toEqual([
      MANUAL_PRICE_HEADERS,
    ]);
  });
});
