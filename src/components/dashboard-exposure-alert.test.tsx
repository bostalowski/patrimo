// @vitest-environment jsdom

import type { DiversificationCoherenceResult } from "@patrimo/core/diversification-coherence";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardExposureAlert } from "@/components/dashboard-exposure-alert";

afterEach(cleanup);

function coherence(
	overrides: Partial<DiversificationCoherenceResult> = {},
): DiversificationCoherenceResult {
	return {
		bands: [],
		findings: [],
		status: "aligned",
		liquidInvested: 10_000,
		annualDcaTotal: 6_000,
		...overrides,
	};
}

describe("DashboardExposureAlert", () => {
	it("renders nothing when coherence is null", () => {
		const { container } = render(<DashboardExposureAlert coherence={null} />);
		expect(container.firstChild).toBeNull();
	});

	it("shows exposure alert only for stock band_drift breaches (D8)", () => {
		render(
			<DashboardExposureAlert
				coherence={coherence({
					status: "misaligned",
					bands: [
						{
							key: "US",
							minPct: 0.4,
							maxPct: 0.6,
							stockPct: 0.61,
							flowPct: 0.5,
						},
						{
							key: "EUROPE",
							minPct: 0.2,
							maxPct: 0.3,
							stockPct: 0.05,
							flowPct: 0.25,
						},
					],
					findings: [
						{ kind: "band_drift", key: "US", tone: "watch" },
						{ kind: "flow_misalign", key: "US", tone: "breach" },
						{ kind: "band_drift", key: "EUROPE", tone: "breach" },
					],
				})}
			/>,
		);
		expect(screen.getByText(/Exposition hors bande/i)).toBeTruthy();
		expect(screen.getByText(/Europe/i)).toBeTruthy();
		expect(
			screen.getByRole("link", { name: /Voir Diversification/i }),
		).toBeTruthy();
	});

	it("hides exposure alert when no stock breach", () => {
		const { container } = render(
			<DashboardExposureAlert
				coherence={coherence({
					status: "watch",
					bands: [
						{
							key: "US",
							minPct: 0.4,
							maxPct: 0.6,
							stockPct: 0.61,
							flowPct: null,
						},
					],
					findings: [{ kind: "band_drift", key: "US", tone: "watch" }],
				})}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});
});
