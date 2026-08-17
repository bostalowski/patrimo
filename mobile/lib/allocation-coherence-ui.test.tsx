import type { AllocationCoherenceResult } from "@patrimo/core/allocation-coherence";
import type React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { colors } from "./theme";

vi.mock("react-native", () => ({
	View: "View",
	Text: "Text",
	Pressable: "Pressable",
	StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));

vi.mock("expo-router", () => ({
	router: { push: vi.fn() },
}));

import { AllocationCoherenceCard } from "./allocation-coherence-card";

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

function render(component: React.ReactElement): ReactTestRenderer {
	let renderer: ReactTestRenderer | undefined;
	act(() => {
		renderer = create(component);
	});
	expect(renderer).toBeDefined();
	return renderer as ReactTestRenderer;
}

function visibleText(renderer: ReactTestRenderer): string {
	return renderer.root
		.findAll((node) => node.type === "Text")
		.flatMap((node) => node.children)
		.filter((child): child is string => typeof child === "string")
		.join(" ");
}

describe("mobile AllocationCoherenceCard", () => {
	it("renders nothing when coherence is null", () => {
		const renderer = render(
			<AllocationCoherenceCard coherence={null} theme={colors.light} />,
		);
		expect(renderer.toJSON()).toBeNull();
	});

	it("renders title, status, and category names", () => {
		const text = visibleText(
			render(
				<AllocationCoherenceCard
					coherence={coherence()}
					theme={colors.light}
				/>,
			),
		);

		expect(text).toMatch(/cohérence d'allocation/i);
		expect(text).toContain("Aligné");
		expect(text).toContain("Monde");
		expect(text).toContain("Crypto");
	});

	it("shows Décalé when status is misaligned", () => {
		const text = visibleText(
			render(
				<AllocationCoherenceCard
					coherence={coherence({
						status: "misaligned",
						findings: [{ kind: "category_drift", categoryLabel: "Monde" }],
					})}
					theme={colors.light}
				/>,
			),
		);

		expect(text).toContain("Décalé");
		expect(text).toMatch(/Stock décalé/i);
	});

	it("shows À surveiller and finding chips", () => {
		const text = visibleText(
			render(
				<AllocationCoherenceCard
					coherence={coherence({
						status: "watch",
						findings: [{ kind: "geo_coverage_gap" }],
					})}
					theme={colors.light}
				/>,
			),
		);

		expect(text).toContain("À surveiller");
		expect(text).toMatch(/Géo incomplète/i);
	});

	it("never shows Double ligne overlapping chip and still shows status", () => {
		const text = visibleText(
			render(
				<AllocationCoherenceCard
					coherence={coherence({
						status: "aligned",
						findings: [],
					})}
					theme={colors.light}
				/>,
			),
		);

		expect(text).toContain("Aligné");
		expect(text).toContain("Modifier");
		expect(text).not.toMatch(/Double ligne/i);
	});

	it("shows DCA column header when annualDcaTotal > 0", () => {
		const text = visibleText(
			render(
				<AllocationCoherenceCard
					coherence={coherence({
						annualDcaTotal: 4800,
						categories: [
							{
								category: "Monde",
								targetPct: 0.7,
								stockPct: 0.7,
								flowPct: 0.7,
							},
						],
					})}
					theme={colors.light}
				/>,
			),
		);

		expect(text).toContain("DCA");
	});
});
