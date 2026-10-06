import { describe, expect, it } from "vitest";
import { parseOpenFiscaIrBaremeYaml } from "./parse-openfisca";

const MINI_YAML = `
description: Barème IR test
brackets:
- threshold:
    1945-01-01:
      value: 0
  rate:
    1945-01-01:
      value: 0
- threshold:
    2024-01-01:
      value: 11497
    2025-01-01:
      value: 11600
  rate:
    2014-01-01:
      value: 0.11
- threshold:
    2024-01-01:
      value: 29315
    2025-01-01:
      value: 29579
  rate:
    2014-01-01:
      value: 0.3
- threshold:
    2025-01-01:
      value: 84577
  rate:
    2014-01-01:
      value: 0.41
- threshold:
    2025-01-01:
      value: 181917
  rate:
    2014-01-01:
      value: 0.45
metadata:
  rate_unit: /1
`;

describe("parseOpenFiscaIrBaremeYaml", () => {
	it("builds dated tables with inclusive upperBound = next OpenFisca threshold", () => {
		const tables = parseOpenFiscaIrBaremeYaml(MINI_YAML);
		expect(tables.length).toBeGreaterThanOrEqual(1);
		const y2025 = tables.find((t) => t.effectiveFrom === "2025-01-01");
		expect(y2025).toBeDefined();
		expect(y2025!.incomeYear).toBe(2025);
		expect(y2025!.brackets.map((b) => b.upperBound)).toEqual([
			11_600,
			29_579,
			84_577,
			181_917,
			null,
		]);
		expect(y2025!.brackets.map((b) => b.rate)).toEqual([
			0, 0.11, 0.3, 0.41, 0.45,
		]);
	});

	it("returns empty for malformed / empty YAML (E9 parse guard)", () => {
		expect(parseOpenFiscaIrBaremeYaml("")).toEqual([]);
		expect(parseOpenFiscaIrBaremeYaml("not yaml")).toEqual([]);
		expect(parseOpenFiscaIrBaremeYaml("brackets:\n")).toEqual([]);
	});
});
