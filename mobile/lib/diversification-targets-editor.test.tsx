import type { DiversificationTarget } from "@patrimo/core/schema";
import type React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { colors } from "./theme";

const mocks = vi.hoisted(() => ({
	saveDiversificationTargets: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("react-native", () => ({
	View: "View",
	Text: "Text",
	TextInput: "TextInput",
	Pressable: "Pressable",
	ActivityIndicator: "ActivityIndicator",
	Alert: { alert: vi.fn() },
	StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));

vi.mock("./write-diversification-targets", () => ({
	saveDiversificationTargets: mocks.saveDiversificationTargets,
}));

import { DiversificationTargetsEditor } from "./diversification-targets-editor";

const initial: DiversificationTarget[] = [
	{ key: "US", minPct: 0.6, maxPct: 0.7 },
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

describe("mobile DiversificationTargetsEditor", () => {
	beforeEach(() => {
		mocks.saveDiversificationTargets.mockClear();
	});

	it("editor save with valid bands persists diversification targets", async () => {
		const renderer = render(
			<DiversificationTargetsEditor
				initialTargets={initial}
				theme={colors.light}
				onSaved={async () => {}}
			/>,
		);

		const saveButton = renderer.root.find(
			(node) => node.props.accessibilityLabel === "Enregistrer",
		);

		await act(async () => {
			await saveButton.props.onPress();
		});

		expect(mocks.saveDiversificationTargets).toHaveBeenCalledWith(initial);
	});

	it("editor save with overlapping keys shows an error and does not persist", async () => {
		const renderer = render(
			<DiversificationTargetsEditor
				initialTargets={[
					{ key: "US", minPct: 0.6, maxPct: 0.7 },
					{ key: "NORTH_AMERICA", minPct: 0.1, maxPct: 0.2 },
				]}
				theme={colors.light}
				onSaved={async () => {}}
			/>,
		);

		const saveButton = renderer.root.find(
			(node) => node.props.accessibilityLabel === "Enregistrer",
		);

		await act(async () => {
			await saveButton.props.onPress();
		});

		expect(visibleText(renderer)).toMatch(/chevauch/i);
		expect(mocks.saveDiversificationTargets).not.toHaveBeenCalled();
	});
});
