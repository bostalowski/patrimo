// @vitest-environment jsdom

import type { Asset, TargetAllocationCategory } from "@patrimo/core/schema";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn() }),
}));

import { AllocationPlanEditor } from "@/app/investissements/allocation-plan-editor";

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

const assets: Asset[] = [
	{ id: "WPEA", label: "WPEA", type: "ETF", source: "yahoo", currency: "EUR" },
	{ id: "BTC", label: "BTC", type: "CRYPTO", source: "yahoo", currency: "EUR" },
];

const suggestion: TargetAllocationCategory[] = [
	{ category: "Mondes", targetPct: 0.7, assetIds: ["WPEA"] },
	{ category: "Crypto", targetPct: 0.3, assetIds: ["BTC"] },
];

describe("AllocationPlanEditor", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ ok: true }),
			}),
		);
	});

	it("shows bootstrap suggestion when saved targets are empty and DCA suggestion exists", () => {
		render(
			<AllocationPlanEditor
				initialTargets={[]}
				suggestion={suggestion}
				assets={assets}
			/>,
		);

		expect(screen.getByText(/Proposer depuis DCA/i)).toBeTruthy();
		expect(screen.getByText(/Mondes/i)).toBeTruthy();
	});

	it("saving edited categories calls the API persistence path", async () => {
		render(
			<AllocationPlanEditor
				initialTargets={suggestion}
				suggestion={[]}
				assets={assets}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				"/api/target-allocation",
				expect.objectContaining({ method: "PUT" }),
			);
		});
	});

	it("save with invalid sum shows an error and does not persist", async () => {
		render(
			<AllocationPlanEditor
				initialTargets={[
					{ category: "Monde", targetPct: 0.5, assetIds: ["WPEA"] },
				]}
				suggestion={[]}
				assets={assets}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));

		await waitFor(() => {
			expect(screen.getByText(/100/i)).toBeTruthy();
		});
		expect(fetch).not.toHaveBeenCalled();
	});
});
