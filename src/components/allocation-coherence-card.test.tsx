// @vitest-environment jsdom

import type { AllocationCoherenceResult } from "@patrimo/core/allocation-coherence";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AllocationCoherenceCard } from "@/components/allocation-coherence-card";

afterEach(cleanup);

function coherence(
	overrides: Partial<AllocationCoherenceResult> = {},
): AllocationCoherenceResult {
	return {
		status: "aligned",
		categories: [
			{ category: "Monde", targetPct: 0.7, stockPct: 0.7, flowPct: null },
			{ category: "Crypto", targetPct: 0.3, stockPct: 0.3, flowPct: null },
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

	it("renders title, status badge, and category rows", () => {
		render(<AllocationCoherenceCard coherence={coherence()} />);

		expect(screen.getByText(/cohérence d'allocation/i)).toBeTruthy();
		expect(screen.getByText("Aligné")).toBeTruthy();
		expect(screen.getByText("Monde")).toBeTruthy();
		expect(screen.getByText("Crypto")).toBeTruthy();
		expect(screen.getAllByText("70 %").length).toBeGreaterThanOrEqual(1);
	});

	it("shows Décalé badge when status is misaligned", () => {
		render(
			<AllocationCoherenceCard
				coherence={coherence({
					status: "misaligned",
					findings: [{ kind: "category_drift", categoryLabel: "Monde" }],
				})}
			/>,
		);

		expect(screen.getByText("Décalé")).toBeTruthy();
		expect(screen.getByText(/Stock décalé/i)).toBeTruthy();
	});

	it("shows À surveiller badge and finding chips when status is watch", () => {
		render(
			<AllocationCoherenceCard
				coherence={coherence({
					status: "watch",
					findings: [{ kind: "geo_coverage_gap" }],
				})}
			/>,
		);

		expect(screen.getByText("À surveiller")).toBeTruthy();
		expect(screen.getByText(/Géo incomplète/i)).toBeTruthy();
	});

	it("shows DCA column and link when annualDcaTotal > 0", () => {
		render(
			<AllocationCoherenceCard
				coherence={coherence({
					annualDcaTotal: 4800,
					categories: [
						{ category: "Monde", targetPct: 0.7, stockPct: 0.7, flowPct: 0.7 },
						{ category: "Crypto", targetPct: 0.3, stockPct: 0.3, flowPct: 0.3 },
					],
				})}
			/>,
		);

		expect(screen.getByText("DCA")).toBeTruthy();
	});

	it("shows géographie link when geo_coverage_gap finding exists", () => {
		render(
			<AllocationCoherenceCard
				coherence={coherence({
					status: "watch",
					findings: [{ kind: "geo_coverage_gap" }],
				})}
			/>,
		);

		expect(screen.getByText(/Compléter la géographie/i)).toBeTruthy();
	});

	it("shows DCA link when flow_misalign finding exists", () => {
		render(
			<AllocationCoherenceCard
				coherence={coherence({
					status: "misaligned",
					findings: [{ kind: "flow_misalign", categoryLabel: "Monde" }],
					annualDcaTotal: 4800,
					categories: [
						{ category: "Monde", targetPct: 0.7, stockPct: 0.7, flowPct: 0.5 },
						{ category: "Crypto", targetPct: 0.3, stockPct: 0.3, flowPct: 0.5 },
					],
				})}
			/>,
		);

		expect(screen.getByText(/Gérer les plans DCA/i)).toBeTruthy();
	});
});
