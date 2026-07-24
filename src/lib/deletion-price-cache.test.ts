import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const originalDataDir = process.env.FINGRAPHS_DATA_DIR;
let testDataDir: string | null = null;

afterEach(async () => {
  process.env.FINGRAPHS_DATA_DIR = originalDataDir;
  vi.resetModules();
  if (testDataDir) await rm(testDataDir, { recursive: true, force: true });
  testDataDir = null;
});

describe("web price cache cleanup", () => {
  it("removes deleted asset entries from automatic and manual price caches", async () => {
    testDataDir = await mkdtemp(join(tmpdir(), "patrimo-price-cache-"));
    process.env.FINGRAPHS_DATA_DIR = testDataDir;
    vi.resetModules();

    const store = await import("@/lib/store");
    const api = store as typeof store & {
      removeAssetsFromPriceCaches?: (assetIds: string[]) => Promise<void>;
    };

    await store.writePrices({
      deleted: { "2025-01-01": 10 },
      retained: { "2025-01-01": 20 },
    });
    await store.writeManualPrices({
      deleted: { "2025-01-01": 11 },
      retained: { "2025-01-01": 21 },
    });

    expect(
      api.removeAssetsFromPriceCaches,
      "Web price cache cleanup is not implemented",
    ).toBeTypeOf("function");
    await api.removeAssetsFromPriceCaches!(["deleted"]);

    expect(
      JSON.parse(
        await readFile(join(testDataDir, "prices.json"), "utf-8"),
      ),
    ).toEqual({ retained: { "2025-01-01": 20 } });
    expect(
      JSON.parse(
        await readFile(join(testDataDir, "manual-prices.json"), "utf-8"),
      ),
    ).toEqual({ retained: { "2025-01-01": 21 } });
  });
});
