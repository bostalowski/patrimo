import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workbook } from "@patrimo/core/schema";

vi.mock("@/lib/excel", () => ({
  loadWorkbook: vi.fn(),
  replaceWorkbook: vi.fn(),
  upsertAccount: vi.fn(),
  upsertAsset: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  removeAssetsFromPriceCaches: vi.fn(),
}));

import * as excel from "@/lib/excel";
import * as store from "@/lib/store";
import * as accountsRoute from "@/app/api/accounts/route";
import * as assetsRoute from "@/app/api/assets/route";

type DeleteHandler = (request: Request) => Promise<Response>;
type WebExcelApi = typeof excel & {
  replaceWorkbook?: (workbook: Workbook) => void;
};
type WebStoreApi = typeof store & {
  removeAssetsFromPriceCaches?: (assetIds: string[]) => Promise<void>;
};

const webExcel = excel as WebExcelApi;
const webStore = store as WebStoreApi;

function sourceWorkbook(): Workbook {
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
    dca: [
      {
        id: "plan",
        label: "Plan",
        envelope: "CTO",
        amount: 100,
        frequency: "MENSUEL",
        lines: [{ assetIds: ["stock"], targetPct: 1 }],
      },
    ],
    budget: [],
    properties: [],
  };
}

function deleteRequest(body: unknown): Request {
  return new Request("http://localhost/api/delete", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function requireDeleteHandler(
  route: { DELETE?: DeleteHandler },
  entity: string,
): DeleteHandler {
  expect(
    route.DELETE,
    `The ${entity} DELETE route is not implemented`,
  ).toBeTypeOf("function");
  return route.DELETE!;
}

describe("web deletion persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(excel.loadWorkbook).mockReturnValue(sourceWorkbook());
    webExcel.replaceWorkbook &&
      vi.mocked(webExcel.replaceWorkbook).mockReturnValue(undefined);
    webStore.removeAssetsFromPriceCaches &&
      vi.mocked(webStore.removeAssetsFromPriceCaches).mockResolvedValue(
        undefined,
      );
  });

  it("persists every affected workbook sheet with one replacement write", async () => {
    const response = await requireDeleteHandler(
      accountsRoute,
      "account",
    )(deleteRequest({ id: "broker", mode: "cascade" }));

    expect(response.status).toBe(200);
    expect(webExcel.replaceWorkbook).toHaveBeenCalledTimes(1);
    expect(webExcel.replaceWorkbook).toHaveBeenCalledWith({
      ...sourceWorkbook(),
      accounts: [sourceWorkbook().accounts[1]],
      assets: [sourceWorkbook().assets[1]],
      transactions: [sourceWorkbook().transactions[1]],
      dca: [],
    });
  });

  it("deletes an account through the API with a validated deletion mode", async () => {
    const deleteHandler = requireDeleteHandler(accountsRoute, "account");

    const invalidResponse = await deleteHandler(
      deleteRequest({ id: "broker", mode: "unsupported" }),
    );
    const validResponse = await deleteHandler(
      deleteRequest({ id: "broker", mode: "detach" }),
    );

    expect(invalidResponse.status).toBe(400);
    expect(validResponse.status).toBe(200);
    expect(webExcel.replaceWorkbook).toHaveBeenCalledTimes(1);
  });

  it("deletes an asset through the API with a validated identifier", async () => {
    const response = await requireDeleteHandler(
      assetsRoute,
      "asset",
    )(deleteRequest({ id: "stock" }));

    expect(response.status).toBe(200);
    expect(webExcel.replaceWorkbook).toHaveBeenCalledWith(
      expect.objectContaining({
        assets: [sourceWorkbook().assets[1]],
        transactions: [sourceWorkbook().transactions[1]],
        dca: [],
      }),
    );
  });

  it("returns not found without writing when the requested entity does not exist", async () => {
    const response = await requireDeleteHandler(
      accountsRoute,
      "account",
    )(deleteRequest({ id: "missing", mode: "cascade" }));

    expect(response.status).toBe(404);
    expect(webExcel.replaceWorkbook).not.toHaveBeenCalled();
    expect(webStore.removeAssetsFromPriceCaches).not.toHaveBeenCalled();
  });

  it("leaves price caches untouched when workbook persistence fails", async () => {
    expect(webExcel.replaceWorkbook).toBeTypeOf("function");
    vi.mocked(webExcel.replaceWorkbook!).mockImplementation(() => {
      throw new Error("disk full");
    });

    const response = await requireDeleteHandler(
      accountsRoute,
      "account",
    )(deleteRequest({ id: "broker", mode: "cascade" }));

    expect(response.status).toBe(500);
    expect(webStore.removeAssetsFromPriceCaches).not.toHaveBeenCalled();
  });

  it("keeps the deletion successful when derived price cache cleanup must be retried", async () => {
    expect(webStore.removeAssetsFromPriceCaches).toBeTypeOf("function");
    vi.mocked(webStore.removeAssetsFromPriceCaches!).mockRejectedValue(
      new Error("cache unavailable"),
    );

    const response = await requireDeleteHandler(
      assetsRoute,
      "asset",
    )(deleteRequest({ id: "stock" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      deletedAssetIds: ["stock"],
      cacheCleanupPending: true,
    });
  });
});
