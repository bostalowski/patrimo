import type { DiversificationCoherenceResult } from "@patrimo/core/diversification-coherence";
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

	it("renders Cohérence diversification, Aligné, and band rows", () => {
		const text = visibleText(
			render(
				<AllocationCoherenceCard
					coherence={coherence()}
					theme={colors.light}
				/>,
			),
		);

		expect(text).toMatch(/Cohérence diversification/i);
		expect(text).toContain("Aligné");
		expect(text).toContain("États-Unis");
		expect(text).toContain("Crypto");
	});

	it("shows Décalé and Stock hors bande when band_drift", () => {
		const text = visibleText(
			render(
				<AllocationCoherenceCard
					coherence={coherence({
						status: "misaligned",
						findings: [{ kind: "band_drift", key: "US", tone: "breach" }],
					})}
					theme={colors.light}
				/>,
			),
		);

		expect(text).toContain("Décalé");
		expect(text).toMatch(/Stock hors bande/i);
	});

	it("shows À surveiller and signed delta when watch", () => {
		const text = visibleText(
			render(
				<AllocationCoherenceCard
					coherence={coherence({
						status: "watch",
						findings: [{ kind: "band_drift", key: "CRYPTO", tone: "watch" }],
						bands: [
							{
								key: "CRYPTO",
								minPct: 0.15,
								maxPct: 0.15,
								stockPct: 0.165,
								flowPct: null,
							},
						],
					})}
					theme={colors.light}
				/>,
			),
		);

		expect(text).toContain("À surveiller");
		expect(text).toMatch(/Stock à surveiller/i);
		expect(text).toMatch(/16,5\s*%/);
		expect(text).toMatch(/\+1,5\s*pp/);
	});

	it("shows DCA hors bande when flow_misalign", () => {
		const text = visibleText(
			render(
				<AllocationCoherenceCard
					coherence={coherence({
						status: "misaligned",
						findings: [{ kind: "flow_misalign", key: "US", tone: "breach" }],
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
					theme={colors.light}
				/>,
			),
		);

		expect(text).toMatch(/DCA hors bande/i);
	});
});
