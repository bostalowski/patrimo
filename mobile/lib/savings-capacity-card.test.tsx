import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { SavingsCapacity } from "@patrimo/core/savings-capacity";
import { colors } from "./theme";

vi.mock("react-native", () => ({
	View: "View",
	Text: "Text",
	StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));

import { SavingsCapacityCard } from "./savings-capacity-card";

function capacity(
	overrides: Partial<SavingsCapacity> = {},
): SavingsCapacity {
	return {
		rawSavings: 2_000,
		monthlyEmergencyReserve: 0,
		investableSurplus: 2_000,
		plannedDcaMonthly: 500,
		gap: -1_500,
		status: "comfortable",
		...overrides,
	};
}

function render(component: React.ReactElement): ReactTestRenderer {
	let renderer: ReactTestRenderer | undefined;
	act(() => {
		renderer = create(component);
	});
	if (!renderer) throw new Error("Failed to render");
	return renderer;
}

function texts(root: ReactTestRenderer): string[] {
	const out: string[] = [];
	root.root.findAllByType("Text").forEach((node) => {
		const children = node.props.children;
		if (typeof children === "string") out.push(children);
		else if (Array.isArray(children)) {
			out.push(
				children
					.map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : ""))
					.join(""),
			);
		}
	});
	return out;
}

describe("mobile SavingsCapacityCard", () => {
	it("renders surplus and status", () => {
		const root = render(
			<SavingsCapacityCard capacity={capacity()} theme={colors.light} />,
		);
		const t = texts(root).join(" ");
		expect(t).toContain("Capacité d'épargne");
		expect(t).toContain("À l'aise");
		expect(t).toMatch(/2[\s\u00a0]?000/);
	});

	it("shows gap when over_committed", () => {
		const root = render(
			<SavingsCapacityCard
				capacity={capacity({
					investableSurplus: 1_000,
					plannedDcaMonthly: 1_500,
					gap: 500,
					status: "over_committed",
				})}
				theme={colors.light}
			/>,
		);
		const t = texts(root).join(" ");
		expect(t).toContain("Surengagé");
		expect(t).toMatch(/Écart/);
	});

	it("renders nothing when capacity is null", () => {
		const root = render(
			<SavingsCapacityCard capacity={null} theme={colors.light} />,
		);
		expect(root.toJSON()).toBeNull();
	});
});
