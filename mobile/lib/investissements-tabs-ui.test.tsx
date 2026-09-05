import type React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { Workbook } from "@patrimo/core/schema";

vi.mock("react-native", () => ({
	View: "View",
	Text: "Text",
	TextInput: "TextInput",
	ScrollView: "ScrollView",
	TouchableOpacity: "TouchableOpacity",
	useColorScheme: () => "light",
	Alert: { alert: vi.fn() },
	StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
	default: {
		getItem: vi.fn().mockResolvedValue(null),
		setItem: vi.fn().mockResolvedValue(undefined),
	},
}));

const emptyWorkbook: Workbook = {
	transactions: [],
	assets: [],
	accounts: [],
	budget: [],
	properties: [],
	dca: [],
	manualPrices: [],
	geographicAllocations: [],
	sectorAllocations: [],
	diversificationTargets: [],
		financialGoals: [],
};

vi.mock("./use-workbook", () => ({
	useWorkbook: () => ({
		workbook: emptyWorkbook,
		prices: new Map(),
		loading: false,
		error: null,
		refresh: vi.fn(),
	}),
}));

vi.mock("./write-dca", () => ({
	saveDcaConfigs: vi.fn(),
}));

import InvestissementsScreen from "../app/investissements";

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

describe("mobile InvestissementsScreen", () => {
	it("does not show an Allocation tab", () => {
		const text = visibleText(render(<InvestissementsScreen />));
		expect(text).not.toMatch(/\bAllocation\b/);
		expect(text).toContain("DCA");
	});
});
