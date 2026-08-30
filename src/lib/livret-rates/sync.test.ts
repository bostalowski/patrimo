import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseOpenFiscaLivretRateYaml } from "./parse-openfisca";

describe("parseOpenFiscaLivretRateYaml", () => {
	it("extracts dated paliers from the values block", () => {
		const yaml = `
description: Taux d'intérêt annuel du livret A
values:
  2025-02-01:
    value: 0.024
  2025-08-01:
    value: 0.017
  2026-08-01:
    value: 0.017
metadata:
  unit: /1
`;
		expect(parseOpenFiscaLivretRateYaml(yaml)).toEqual([
			{ effectiveFrom: "2025-02-01", annualRate: 0.024 },
			{ effectiveFrom: "2025-08-01", annualRate: 0.017 },
			{ effectiveFrom: "2026-08-01", annualRate: 0.017 },
		]);
	});
});

describe("syncLivretRates isolation (D9)", () => {
	it("merges fetched rates into the cache on success", async () => {
		const dir = await mkdtemp(join(tmpdir(), "livret-rates-"));
		process.env.FINGRAPHS_DATA_DIR = dir;

		const { syncLivretRates } = await import("./sync");
		const fetchImpl = vi.fn(async () =>
			new Response(
				`
values:
  2025-02-01:
    value: 0.024
  2099-01-01:
    value: 0.05
`,
				{ status: 200 },
			),
		);

		const result = await syncLivretRates({ fetchImpl });
		expect(result.status).toBe("ok");
		if (result.status !== "ok") return;

		const raw = await readFile(join(dir, "livret-rates.json"), "utf-8");
		const cached = JSON.parse(raw) as { effectiveFrom: string; annualRate: number }[];
		expect(cached.some((s) => s.effectiveFrom === "2099-01-01" && s.annualRate === 0.05)).toBe(
			true,
		);
	});

	it("keeps the previous cache and reports error when fetch fails", async () => {
		const dir = await mkdtemp(join(tmpdir(), "livret-rates-"));
		process.env.FINGRAPHS_DATA_DIR = dir;
		const previous = [
			{ effectiveFrom: "2025-02-01", annualRate: 0.024 },
		];
		await writeFile(
			join(dir, "livret-rates.json"),
			JSON.stringify(previous, null, 2),
			"utf-8",
		);

		vi.resetModules();
		const { syncLivretRates } = await import("./sync");
		const fetchImpl = vi.fn(async () => {
			throw new Error("network down");
		});

		const result = await syncLivretRates({ fetchImpl });
		expect(result).toEqual({
			status: "error",
			error: "network down",
		});

		const raw = await readFile(join(dir, "livret-rates.json"), "utf-8");
		expect(JSON.parse(raw)).toEqual(previous);
	});
});
