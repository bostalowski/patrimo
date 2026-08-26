import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Diversification page monthly surfaces", () => {
	it("does not mount NextEuroPlanCard (D1)", () => {
		const src = readFileSync(
			resolve(__dirname, "./page.tsx"),
			"utf8",
		);
		expect(src).not.toMatch(/NextEuroPlanCard/);
		expect(src).toMatch(/AllocationCoherenceCard/);
	});
});
