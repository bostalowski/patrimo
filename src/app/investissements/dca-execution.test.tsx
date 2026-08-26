// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
