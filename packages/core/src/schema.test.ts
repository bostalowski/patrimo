import { describe, expect, it } from "vitest";
import { PropertyTax } from "./schema";

describe("PropertyTax schema", () => {
	it("parses a valid property tax entry", () => {
		const result = PropertyTax.safeParse({
			propertyId: "lyon",
			year: 2025,
			amount: 950,
		});
		expect(result.success).toBe(true);
	});

	it("rejects a missing propertyId", () => {
		const result = PropertyTax.safeParse({ year: 2025, amount: 950 });
		expect(result.success).toBe(false);
	});

	it("rejects a non-integer year", () => {
		const result = PropertyTax.safeParse({
			propertyId: "lyon",
			year: 2025.5,
			amount: 950,
		});
		expect(result.success).toBe(false);
	});

	it("rejects a negative amount", () => {
		const result = PropertyTax.safeParse({
			propertyId: "lyon",
			year: 2025,
			amount: -1,
		});
		expect(result.success).toBe(false);
	});

	it("accepts a future year (D9: unlike ManualPrice, no future-date rejection)", () => {
		const result = PropertyTax.safeParse({
			propertyId: "lyon",
			year: 2999,
			amount: 950,
		});
		expect(result.success).toBe(true);
	});
});
