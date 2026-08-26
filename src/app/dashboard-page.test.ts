import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Dashboard page monthly surfaces", () => {
	it("mounts EmergencyFundCard + DashboardExposureAlert; omits ThisMonthCard / NextEuroPlanCard", () => {
		const src = readFileSync(resolve(__dirname, "./page.tsx"), "utf8");
		expect(src).toMatch(/EmergencyFundCard/);
		expect(src).toMatch(/surplusRecommendation/);
		expect(src).toMatch(/DashboardExposureAlert/);
		expect(src).not.toMatch(/ThisMonthCard/);
		expect(src).not.toMatch(/NextEuroPlanCard/);
	});
});
