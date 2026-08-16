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

const GEO_SHEET = "Exposition geo";
const GEO_HEADERS = ["Actif", "Pays", "Poids %", "Source"];

type GeographicAllocation = {
  assetId: string;
  country: string;
  weight: number;
  source: "justetf" | "manual";
};

type GeographicWorkbook = Workbook & {
  geographicAllocations: GeographicAllocation[];
};

let temporaryDirectory: string;

beforeEach(() => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "patrimo-geo-"));
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

function sourceBuffer(geoRows?: unknown[][]): ArrayBuffer {
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
      "world",
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
    [
      "world",
      "World ETF",
      "ETF",
      "IE00B4L5Y983",
      "CW8",
      "yahoo",
      "CW8.PA",
      "EUR",
      null,
    ],
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
  if (geoRows) {
    appendSheet(workbook, GEO_SHEET, [GEO_HEADERS, ...geoRows]);
  }
  return XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    cellDates: true,
  }) as ArrayBuffer;
}

function writeWebSource(buffer: ArrayBuffer): void {
  writeFileSync(configState.excelPath!, Buffer.from(buffer));
}

function readWebSource(): XLSX.WorkBook {
  return XLSX.read(readFileSync(configState.excelPath!), {
    type: "buffer",
    cellDates: true,
  });
}

function sheetRows(
  workbook: XLSX.WorkBook,
  name: string,
): unknown[][] | undefined {
  const sheet = workbook.Sheets[name];
  if (!sheet) return undefined;
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];
}

function geographicAllocationsFrom(
  workbook: Workbook,
): GeographicAllocation[] {
  return (workbook as GeographicWorkbook).geographicAllocations ?? [];
}

function allocation(
  assetId: string,
  country: string,
  weight: number,
  source: GeographicAllocation["source"] = "manual",
): GeographicAllocation {
  return { assetId, country, weight, source };
}

describe("web and mobile geographic-allocation Excel adapters", () => {
  it("missing Exposition geo sheet reads as an empty collection", () => {
    writeWebSource(sourceBuffer());

    const webResult = webExcel.loadWorkbook();
    const mobileResult = mobileExcel.parseWorkbook(sourceBuffer());

    expect(geographicAllocationsFrom(webResult)).toEqual([]);
    expect(geographicAllocationsFrom(mobileResult.workbook)).toEqual([]);
  });

  it("web Excel round-trips Exposition geo without changing other sheets", () => {
    const expected = [
      allocation("world", "US", 0.7, "justetf"),
      allocation("world", "JP", 0.3, "justetf"),
    ];
    writeWebSource(sourceBuffer());
    const original = webExcel.loadWorkbook();

    webExcel.replaceWorkbook({
      ...original,
      geographicAllocations: expected,
    } as GeographicWorkbook);
    webExcel.resetWorkbookCache();
    const parsed = webExcel.loadWorkbook();
    const persistedWorkbook = readWebSource();

    expect({
      geographicAllocations: geographicAllocationsFrom(parsed),
      metadata: sheetRows(persistedWorkbook, "Metadata"),
      transactions: parsed.transactions,
      headers: sheetRows(persistedWorkbook, GEO_SHEET)?.[0],
    }).toEqual({
      geographicAllocations: expected,
      metadata: [
        ["Key", "Value"],
        ["preserved", "yes"],
      ],
      transactions: original.transactions,
      headers: GEO_HEADERS,
    });
  });

  it("mobile Excel round-trips Exposition geo without changing other sheets", () => {
    const expected = [
      allocation("world", "US", 0.7, "manual"),
      allocation("world", "OTHER", 0.3, "manual"),
    ];
    const source = sourceBuffer();
    const original = mobileExcel.parseWorkbook(source).workbook;
    const serialized = mobileExcel.serializeWorkbook(source, {
      ...original,
      geographicAllocations: expected,
    } as GeographicWorkbook);
    const parsed = mobileExcel.parseWorkbook(serialized);
    const persistedWorkbook = XLSX.read(serialized, {
      type: "array",
      cellDates: true,
    });

    expect({
      geographicAllocations: geographicAllocationsFrom(parsed.workbook),
      metadata: sheetRows(persistedWorkbook, "Metadata"),
      transactions: parsed.workbook.transactions,
      headers: sheetRows(persistedWorkbook, GEO_SHEET)?.[0],
    }).toEqual({
      geographicAllocations: expected,
      metadata: [
        ["Key", "Value"],
        ["preserved", "yes"],
      ],
      transactions: original.transactions,
      headers: GEO_HEADERS,
    });
  });
});
