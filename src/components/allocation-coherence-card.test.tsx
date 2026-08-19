// @vitest-environment jsdom

import type { DiversificationCoherenceResult } from "@patrimo/core/diversification-coherence";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AllocationCoherenceCard } from "@/components/allocation-coherence-card";

afterEach(cleanup);

function coherence(
	overrides: Partial<DiversificationCoherenceResult> = {},
): DiversificationCoherenceResult {
	return {
		status: "aligned",
		bands: [
			{
				key: "US",
				minPct: 0.6,
				maxPct: 0.7,
				stockPct: 0.65,
				flowPct: null,
			},
			{
				key: "CRYPTO",
				minPct: 0,
				maxPct: 0.05,
				stockPct: 0.03,
				flowPct: null,
			},
		],
		findings: [],
		liquidInvested: 10_000,
		annualDcaTotal: 0,
		...overrides,
	};
}

describe("AllocationCoherenceCard", () => {
	it("renders nothing when coherence is null", () => {
		const { container } = render(<AllocationCoherenceCard coherence={null} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders Cohérence diversification, Aligné, and band rows", () => {
		render(<AllocationCoherenceCard coherence={coherence()} />);

		expect(screen.getByText(/Cohérence diversification/i)).toBeTruthy();
		expect(screen.getByText("Aligné")).toBeTruthy();
		expect(screen.getByText("États-Unis")).toBeTruthy();
		expect(screen.getByText("Crypto")).toBeTruthy();
	});

	it("shows Décalé and Stock hors bande when band_drift", () => {
		render(
			<AllocationCoherenceCard
				coherence={coherence({
					status: "misaligned",
					findings: [{ kind: "band_drift", key: "US" }],
				})}
			/>,
		);

		expect(screen.getByText("Décalé")).toBeTruthy();
		expect(screen.getByText(/Stock hors bande/i)).toBeTruthy();
	});

	it("shows DCA hors bande when flow_misalign", () => {
		render(
			<AllocationCoherenceCard
				coherence={coherence({
					status: "misaligned",
					findings: [{ kind: "flow_misalign", key: "US" }],
					annualDcaTotal: 4800,
					bands: [
						{
							key: "US",
							minPct: 0.6,
							maxPct: 0.7,
							stockPct: 0.65,
							flowPct: 0.9,
						},
					],
				})}
			/>,
		);

		expect(screen.getByText(/DCA hors bande/i)).toBeTruthy();
	});
});
