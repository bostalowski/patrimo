// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MonthlyDcaTilt } from "@patrimo/core/monthly-dca-tilt";
import { DcaExecutionCalculator } from "@/app/investissements/dca-execution";
import type { Asset, DcaConfig } from "@/lib/schema";

afterEach(cleanup);

const assets: Asset[] = [
	{
		id: "EU",
		label: "Europe ETF",
		type: "ETF",
		currency: "EUR",
		source: "yahoo",
	},
];

const configs: DcaConfig[] = [
	{
		id: "dca-1",
		label: "PEA mensuel",
		envelope: "PEA",
		amount: 500,
		frequency: "MENSUEL",
		lines: [{ assetIds: ["EU"], targetPct: 1 }],
	},
];

function tilt(
	verdict: MonthlyDcaTilt["verdict"] = "tilt",
): MonthlyDcaTilt {
	return {
		verdict,
		monthlyPool: 500,
		contributions: { EU: 500 },
		catchupContributions: { EU: 200 },
		bandAssetCatchup: [{ bandKey: "EUROPE", assetId: "EU", euros: 200 }],
		baselineContributions: { EU: 500 },
		pausedAssetIds: [],
		bands: [],
		coherence: null,
	};
}

const multiConfigs: DcaConfig[] = [
	{
		id: "dca-pea",
		label: "PEA mensuel",
		envelope: "PEA",
		amount: 500,
		frequency: "MENSUEL",
		lines: [{ assetIds: ["EU"], targetPct: 1 }],
	},
	{
		id: "dca-cto",
		label: "CTO mensuel",
		envelope: "CTO",
		amount: 300,
		frequency: "MENSUEL",
		lines: [{ assetIds: ["EU"], targetPct: 1 }],
	},
	{
		id: "dca-livret",
		label: "Livret épargne",
		envelope: "LIVRET",
		amount: 200,
		frequency: "MENSUEL",
		lines: [],
	},
];

function renderExecution(
	configList: DcaConfig[] = configs,
	tilt: MonthlyDcaTilt | null = null,
) {
	return render(
		<DcaExecutionCalculator
			configs={configList}
			priceMap={{ EU: 100 }}
			portfolioByEnvelope={{ PEA: { EU: 1_000 }, CTO: { EU: 500 } }}
			assets={assets}
			monthlyTilt={tilt}
		/>,
	);
}

function enableLumpSum(total?: string) {
	fireEvent.click(
		screen.getByRole("checkbox", { name: /Activer le versement ponctuel/i }),
	);
	if (total !== undefined) {
		fireEvent.change(screen.getByLabelText(/Montant total/i), {
			target: { value: total },
		});
	}
}

describe("DcaExecutionCalculator lump-sum", () => {
	it("defaults LIVRET unchecked and investment plans checked", () => {
		renderExecution(multiConfigs);
		enableLumpSum();
		expect(
			(screen.getByRole("checkbox", {
				name: /PEA mensuel/i,
			}) as HTMLInputElement).checked,
		).toBe(true);
		expect(
			(screen.getByRole("checkbox", {
				name: /CTO mensuel/i,
			}) as HTMLInputElement).checked,
		).toBe(true);
		expect(
			(screen.getByRole("checkbox", {
				name: /Livret épargne/i,
			}) as HTMLInputElement).checked,
		).toBe(false);
	});

	it("splits pro-rata across checked plans", () => {
		renderExecution(multiConfigs);
		enableLumpSum("1600");
		const peaCard = screen.getByRole("heading", { name: "PEA mensuel" }).closest("div");
		expect(peaCard).toBeTruthy();
		expect(
			within(peaCard!.parentElement!).getByDisplayValue("1000"),
		).toBeTruthy();
		const ctoCard = screen.getByRole("heading", { name: "CTO mensuel" }).closest("div");
		expect(
			within(ctoCard!.parentElement!).getByDisplayValue("600"),
		).toBeTruthy();
	});

	it("hides unchecked plan cards when lump-sum is active", () => {
		renderExecution(multiConfigs);
		enableLumpSum("1600");
		fireEvent.click(screen.getByRole("checkbox", { name: /CTO mensuel/i }));
		expect(screen.queryByRole("heading", { name: "CTO mensuel" })).toBeNull();
		expect(screen.getByRole("heading", { name: "PEA mensuel" })).toBeTruthy();
	});

	it("shows empty state when no plan is selected", () => {
		renderExecution(multiConfigs);
		enableLumpSum("1600");
		fireEvent.click(screen.getByRole("checkbox", { name: /PEA mensuel/i }));
		fireEvent.click(screen.getByRole("checkbox", { name: /CTO mensuel/i }));
		expect(screen.getByText(/Sélectionne au moins un plan DCA/i)).toBeTruthy();
	});

	it("clears overrides when lump-sum is disabled (D9)", () => {
		renderExecution(configs);
		enableLumpSum("800");
		const peaHeading = screen.getByRole("heading", { name: "PEA mensuel" });
		const budgetInput = within(peaHeading.parentElement!).getByDisplayValue("800");
		fireEvent.change(budgetInput, { target: { value: "900" } });
		expect(within(peaHeading.parentElement!).getByDisplayValue("900")).toBeTruthy();

		fireEvent.click(
			screen.getByRole("checkbox", { name: /Activer le versement ponctuel/i }),
		);
		expect(within(peaHeading.parentElement!).getByDisplayValue("500")).toBeTruthy();
	});

	it("manual budget override wins after auto-split (D7)", () => {
		renderExecution(multiConfigs);
		enableLumpSum("1600");
		const peaHeading = screen.getByRole("heading", { name: "PEA mensuel" });
		const budgetInput = within(peaHeading.parentElement!).getByDisplayValue(
			"1000",
		);
		fireEvent.change(budgetInput, { target: { value: "1100" } });
		expect(
			within(peaHeading.parentElement!).getByDisplayValue("1100"),
		).toBeTruthy();

		const ctoHeading = screen.getByRole("heading", { name: "CTO mensuel" });
		expect(
			within(ctoHeading.parentElement!).getByDisplayValue("600"),
		).toBeTruthy();
	});

	it("warns when sole selected plan has zero monthly amount", () => {
		const zeroAmountConfig: DcaConfig[] = [
			{
				id: "dca-zero",
				label: "PEA vide",
				envelope: "PEA",
				amount: 0,
				frequency: "MENSUEL",
				lines: [{ assetIds: ["EU"], targetPct: 1 }],
			},
		];
		renderExecution(zeroAmountConfig);
		enableLumpSum("1000");
		expect(screen.getByText(/montant mensuel à 0 €/i)).toBeTruthy();
	});

	it("does not apply tilt when lump-sum mode is active (D10)", () => {
		const heavyTilt: MonthlyDcaTilt = {
			...tilt("tilt"),
			monthlyPool: 700,
			contributions: { EU: 700 },
			baselineContributions: { EU: 500 },
		};
		renderExecution(configs, heavyTilt);
		fireEvent.click(
			screen.getByRole("checkbox", { name: /Appliquer l'ajustement/i }),
		);
		expect(screen.getByText(/Budget ajusté/i)).toBeTruthy();
		expect(screen.getAllByText(/700,00/).length).toBeGreaterThan(0);

		enableLumpSum("500");
		expect(screen.queryByText(/Plan d'achat du mois/i)).toBeNull();
		const peaHeading = screen.getByRole("heading", { name: "PEA mensuel" });
		expect(
			within(peaHeading.parentElement!).getByDisplayValue("500"),
		).toBeTruthy();
	});
});

const worldEmAssets: Asset[] = [
	{ id: "W1", label: "World ETF A", type: "ETF", currency: "EUR", source: "yahoo" },
	{ id: "W2", label: "World ETF B", type: "ETF", currency: "EUR", source: "yahoo" },
	{ id: "EM1", label: "EM ETF", type: "ETF", currency: "EUR", source: "yahoo" },
];

const worldEmConfig: DcaConfig[] = [
	{
		id: "dca-world-em",
		label: "PEA World + EM",
		envelope: "PEA",
		amount: 500,
		frequency: "MENSUEL",
		lines: [
			{ label: "World", assetIds: ["W1", "W2"], targetPct: 0.75 },
			{ label: "Emerging", assetIds: ["EM1"], targetPct: 0.25 },
		],
	},
];

function renderWorldEmExecution() {
	return render(
		<DcaExecutionCalculator
			configs={worldEmConfig}
			priceMap={{ W1: 50, W2: 50, EM1: 40 }}
			portfolioByEnvelope={{
				PEA: { W1: 7_500, W2: 7_500, EM1: 5_000 },
			}}
			assets={worldEmAssets}
			monthlyTilt={null}
		/>,
	);
}

describe("DcaExecutionCalculator asset selection", () => {
	it("defaults all asset checkboxes to checked", () => {
		renderWorldEmExecution();
		expect(
			(screen.getByRole("checkbox", {
				name: /Alimenter ce mois-ci — World ETF A/i,
			}) as HTMLInputElement).checked,
		).toBe(true);
		expect(
			(screen.getByRole("checkbox", {
				name: /Alimenter ce mois-ci — World ETF B/i,
			}) as HTMLInputElement).checked,
		).toBe(true);
		expect(
			(screen.getByRole("checkbox", {
				name: /Alimenter ce mois-ci — EM ETF/i,
			}) as HTMLInputElement).checked,
		).toBe(true);
	});

	it("recalculates when unchecking an asset in a multi-asset basket", () => {
		renderWorldEmExecution();
		const w2Checkbox = screen.getByRole("checkbox", {
			name: /Alimenter ce mois-ci — World ETF B/i,
		});
		fireEvent.click(w2Checkbox);

		const card = screen.getByRole("heading", { name: "PEA World + EM" }).closest("div");
		expect(card).toBeTruthy();
		const table = within(card!.parentElement!).getByRole("table");
		expect(within(table).getByText("375,00 €")).toBeTruthy();
		expect(within(table).getByText("125,00 €")).toBeTruthy();
		expect(within(table).getAllByText("0,00 €").length).toBeGreaterThan(0);
	});

	it("shows warning when entire basket is unchecked", () => {
		renderWorldEmExecution();
		fireEvent.click(
			screen.getByRole("checkbox", { name: /Alimenter ce mois-ci — World ETF A/i }),
		);
		fireEvent.click(
			screen.getByRole("checkbox", { name: /Alimenter ce mois-ci — World ETF B/i }),
		);
		expect(screen.getByText(/Panier\(s\) sans actif coché \(World\)/i)).toBeTruthy();
	});

	it("hides asset checkboxes when monthly tilt is active", () => {
		render(
			<DcaExecutionCalculator
				configs={configs}
				priceMap={{ EU: 100 }}
				portfolioByEnvelope={{ PEA: { EU: 1_000 } }}
				assets={assets}
				monthlyTilt={tilt("tilt")}
			/>,
		);
		fireEvent.click(
			screen.getByRole("checkbox", { name: /Appliquer l'ajustement/i }),
		);
		expect(
			screen.queryByRole("checkbox", { name: /Alimenter ce mois-ci/i }),
		).toBeNull();
	});
});

describe("DcaExecutionCalculator tilt default", () => {
	it("defaults useTilt off when tilt verdict is available", () => {
		render(
			<DcaExecutionCalculator
				configs={configs}
				priceMap={{ EU: 100 }}
				portfolioByEnvelope={{ PEA: { EU: 1_000 } }}
				assets={assets}
				monthlyTilt={tilt("tilt")}
			/>,
		);
		const checkbox = screen.getByRole("checkbox", {
			name: /Appliquer l'ajustement/i,
		}) as HTMLInputElement;
		expect(checkbox.checked).toBe(false);
		expect(screen.getAllByText(/plan DCA sauvegardé/i).length).toBeGreaterThan(
			0,
		);
	});

	it("defaults useTilt off for adjust_plan verdict", () => {
		render(
			<DcaExecutionCalculator
				configs={configs}
				priceMap={{ EU: 100 }}
				portfolioByEnvelope={{ PEA: { EU: 1_000 } }}
				assets={assets}
				monthlyTilt={tilt("adjust_plan")}
			/>,
		);
		const checkbox = screen.getByRole("checkbox", {
			name: /Appliquer l'ajustement/i,
		}) as HTMLInputElement;
		expect(checkbox.checked).toBe(false);
	});

	it("does not persist useTilt across remount (D9)", () => {
		const props = {
			configs,
			priceMap: { EU: 100 },
			portfolioByEnvelope: { PEA: { EU: 1_000 } },
			assets,
			monthlyTilt: tilt("tilt"),
		};
		const { unmount } = render(<DcaExecutionCalculator {...props} />);
		const checkbox = screen.getByRole("checkbox", {
			name: /Appliquer l'ajustement/i,
		});
		fireEvent.click(checkbox);
		expect((checkbox as HTMLInputElement).checked).toBe(true);
		unmount();

		render(<DcaExecutionCalculator {...props} />);
		const again = screen.getByRole("checkbox", {
			name: /Appliquer l'ajustement/i,
		}) as HTMLInputElement;
		expect(again.checked).toBe(false);
	});
});
