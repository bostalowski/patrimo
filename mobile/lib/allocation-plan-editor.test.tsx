import type { Asset, TargetAllocationCategory } from "@patrimo/core/schema";
import type React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { colors } from "./theme";

vi.mock("react-native", () => ({
	View: "View",
	Text: "Text",
	TextInput: "TextInput",
	Pressable: "Pressable",
	ActivityIndicator: "ActivityIndicator",
	Alert: { alert: vi.fn() },
	StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));

vi.mock("./write-target-allocation", () => ({
	saveTargetAllocations: vi.fn().mockResolvedValue(undefined),
}));

import { AllocationPlanEditor } from "./allocation-plan-editor";

const assets: Asset[] = [
	{ id: "WPEA", label: "WPEA", type: "ETF", source: "yahoo", currency: "EUR" },
	{ id: "BTC", label: "BTC", type: "CRYPTO", source: "yahoo", currency: "EUR" },
];

const suggestion: TargetAllocationCategory[] = [
	{ category: "Mondes", targetPct: 0.7, assetIds: ["WPEA"] },
	{ category: "Crypto", targetPct: 0.3, assetIds: ["BTC"] },
];

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

describe("mobile AllocationPlanEditor", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows bootstrap when targets are empty and DCA suggestion exists", () => {
		const text = visibleText(
			render(
				<AllocationPlanEditor
					initialTargets={[]}
					suggestion={suggestion}
					assets={assets}
					theme={colors.light}
					onSaved={async () => {}}
				/>,
			),
		);

		expect(text).toMatch(/Proposer depuis DCA/i);
		expect(text).toContain("Mondes");
	});

	it("does not show bootstrap when saved targets already exist", () => {
		const text = visibleText(
			render(
				<AllocationPlanEditor
					initialTargets={suggestion}
					suggestion={suggestion}
					assets={assets}
					theme={colors.light}
					onSaved={async () => {}}
				/>,
			),
		);

		expect(text).not.toMatch(/Proposer depuis DCA/i);
	});
});
