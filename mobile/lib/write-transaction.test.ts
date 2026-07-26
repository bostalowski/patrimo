import * as XLSX from "xlsx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Transaction } from "@patrimo/core/schema";
import {
  ACTIFS_HEADERS,
  COMPTES_HEADERS,
  SHEET_ACTIFS,
  SHEET_COMPTES,
  SHEET_TRANSACTIONS,
  TRANSACTIONS_HEADERS,
} from "@patrimo/core/workbook-template";

const readSourceFile = vi.fn();
const writeSourceFile = vi.fn();
const getActiveSource = vi.fn();

vi.mock("./file-source", () => ({
  getActiveSource: () => getActiveSource(),
  readSourceFile: (...args: unknown[]) => readSourceFile(...args),
  writeSourceFile: (...args: unknown[]) => writeSourceFile(...args),
}));

import {
  deleteTransactionByKey,
  updateTransactionByKey,
} from "./write-transaction";
import { parseWorkbook } from "./excel-mobile";

function workbookBuffer(transactions: Transaction[]): ArrayBuffer {
  const sheetRows = [
    [...TRANSACTIONS_HEADERS],
    ...transactions.map((tx) =>
      TRANSACTIONS_HEADERS.map((header) => {
        const mapping: Record<string, unknown> = {
          Date: tx.date,
          Type: tx.type,
          Compte: tx.compte,
          "Compte destination": tx.compteDestination ?? null,
          Actif: tx.actif || null,
          "Quantité": tx.quantite,
          "Prix unitaire": tx.prixUnitaire,
          Devise: tx.devise,
          Frais: tx.frais,
          "Frais devise": tx.fraisDevise,
          Notes: tx.notes ?? null,
        };
        return mapping[header] ?? null;
      }),
    ),
  ];
  const assets = [
    [...ACTIFS_HEADERS],
    ["BTC", "Bitcoin", "CRYPTO", null, "BTC", "manual", null, "EUR", null],
  ];
  const accounts = [
    [...COMPTES_HEADERS],
    ["CTO", "Compte titres", "BROKER", "CTO", null, null, null],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(sheetRows, { cellDates: true }),
    SHEET_TRANSACTIONS,
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(assets),
    SHEET_ACTIFS,
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(accounts),
    SHEET_COMPTES,
  );
  return XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
    cellDates: true,
  }) as ArrayBuffer;
}

describe("mobile transaction update/delete", () => {
  const source = { type: "local" as const, path: "/tmp/test.xlsx" };

  beforeEach(() => {
    getActiveSource.mockReset();
    readSourceFile.mockReset();
    writeSourceFile.mockReset();
    getActiveSource.mockResolvedValue(source);
    writeSourceFile.mockResolvedValue(undefined);
  });

  it("updates a transaction identified by its parse key", async () => {
    const initial = workbookBuffer([
      {
        date: new Date("2024-01-01"),
        type: "ACHAT",
        compte: "CTO",
        actif: "BTC",
        quantite: 1,
        prixUnitaire: 100,
        devise: "EUR",
        frais: 0,
        fraisDevise: "EUR",
      },
      {
        date: new Date("2024-02-01"),
        type: "ACHAT",
        compte: "CTO",
        actif: "BTC",
        quantite: 2,
        prixUnitaire: 200,
        devise: "EUR",
        frais: 1,
        fraisDevise: "EUR",
      },
    ]);
    readSourceFile.mockResolvedValue(initial);
    const { transactionKeys } = parseWorkbook(initial);

    await updateTransactionByKey(transactionKeys[0], {
      date: new Date("2024-01-01"),
      type: "ACHAT",
      compte: "CTO",
      actif: "BTC",
      quantite: 3,
      prixUnitaire: 150,
      devise: "EUR",
      frais: 0,
      fraisDevise: "EUR",
    });

    expect(writeSourceFile).toHaveBeenCalledOnce();
    const written = writeSourceFile.mock.calls[0][1] as ArrayBuffer;
    const parsed = parseWorkbook(written);
    expect(parsed.workbook.transactions[0].quantite).toBe(3);
    expect(parsed.workbook.transactions[0].prixUnitaire).toBe(150);
    expect(parsed.workbook.transactions).toHaveLength(2);
  });

  it("deletes a transaction identified by its parse key", async () => {
    const initial = workbookBuffer([
      {
        date: new Date("2024-01-01"),
        type: "ACHAT",
        compte: "CTO",
        actif: "BTC",
        quantite: 1,
        prixUnitaire: 100,
        devise: "EUR",
        frais: 0,
        fraisDevise: "EUR",
      },
      {
        date: new Date("2024-06-01"),
        type: "VENTE",
        compte: "CTO",
        actif: "BTC",
        quantite: 1,
        prixUnitaire: 120,
        devise: "EUR",
        frais: 0,
        fraisDevise: "EUR",
      },
    ]);
    readSourceFile.mockResolvedValue(initial);
    const { transactionKeys } = parseWorkbook(initial);

    await deleteTransactionByKey(transactionKeys[1]);

    const written = writeSourceFile.mock.calls[0][1] as ArrayBuffer;
    const parsed = parseWorkbook(written);
    expect(parsed.workbook.transactions).toHaveLength(1);
    expect(parsed.workbook.transactions[0].type).toBe("ACHAT");
  });
});
