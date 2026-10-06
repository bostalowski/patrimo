import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MINI_OK = `
brackets:
- threshold:
    2025-01-01:
      value: 0
  rate:
    2025-01-01:
      value: 0
- threshold:
    2025-01-01:
      value: 11600
  rate:
    2025-01-01:
      value: 0.11
- threshold:
    2025-01-01:
      value: 29579
  rate:
    2025-01-01:
      value: 0.3
metadata:
  x: 1
`;

describe("syncIrBareme isolation (N10, E9)", () => {
	it("N10: merges fetched barème into cache on success", async () => {
		const dir = await mkdtemp(join(tmpdir(), "ir-bareme-"));
		process.env.FINGRAPHS_DATA_DIR = dir;
		vi.resetModules();

		const { syncIrBareme } = await import("./sync");
		const fetchImpl = vi.fn(async () => new Response(MINI_OK, { status: 200 }));

		const result = await syncIrBareme({ fetchImpl });
		expect(result.status).toBe("ok");
		if (result.status !== "ok") return;

		const raw = await readFile(join(dir, "ir-bareme.json"), "utf-8");
		const cached = JSON.parse(raw) as { effectiveFrom: string; incomeYear: number }[];
		expect(cached.some((t) => t.effectiveFrom === "2025-01-01")).toBe(true);
	});

	it("E9: fetch failure preserves cache and does not throw", async () => {
		const dir = await mkdtemp(join(tmpdir(), "ir-bareme-"));
		process.env.FINGRAPHS_DATA_DIR = dir;
		const previous = [
			{
				effectiveFrom: "2025-01-01",
				incomeYear: 2025,
				brackets: [
					{ upperBound: 11_600, rate: 0 },
					{ upperBound: null, rate: 0.45 },
				],
			},
		];
		await writeFile(
			join(dir, "ir-bareme.json"),
			JSON.stringify(previous, null, 2),
			"utf-8",
		);

		vi.resetModules();
		const { syncIrBareme } = await import("./sync");
		const fetchImpl = vi.fn(async () => {
			throw new Error("network down");
		});

		const result = await syncIrBareme({ fetchImpl });
		expect(result).toEqual({ status: "error", error: "network down" });

		const raw = await readFile(join(dir, "ir-bareme.json"), "utf-8");
		expect(JSON.parse(raw)).toEqual(previous);
	});

	it("E9: empty/malformed parse preserves cache", async () => {
		const dir = await mkdtemp(join(tmpdir(), "ir-bareme-"));
		process.env.FINGRAPHS_DATA_DIR = dir;
		const previous = [
			{
				effectiveFrom: "2025-01-01",
				incomeYear: 2025,
				brackets: [
					{ upperBound: 11_600, rate: 0 },
					{ upperBound: null, rate: 0.45 },
				],
			},
		];
		await writeFile(
			join(dir, "ir-bareme.json"),
			JSON.stringify(previous, null, 2),
			"utf-8",
		);

		vi.resetModules();
		const { syncIrBareme } = await import("./sync");
		const fetchImpl = vi.fn(
			async () => new Response("garbage", { status: 200 }),
		);

		const result = await syncIrBareme({ fetchImpl });
		expect(result.status).toBe("error");

		const raw = await readFile(join(dir, "ir-bareme.json"), "utf-8");
		expect(JSON.parse(raw)).toEqual(previous);
	});
});
