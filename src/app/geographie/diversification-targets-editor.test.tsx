// @vitest-environment jsdom

import type { DiversificationTarget } from "@patrimo/core/schema";
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

import { DiversificationTargetsEditor } from "@/app/geographie/diversification-targets-editor";

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

const initial: DiversificationTarget[] = [
	{ key: "US", minPct: 0.6, maxPct: 0.7 },
];

describe("DiversificationTargetsEditor", () => {
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

	it("editor save with valid bands calls PUT /api/diversification-targets", async () => {
		render(<DiversificationTargetsEditor initialTargets={initial} />);

		expect(screen.getByRole("combobox", { name: /Dimension 1/i })).toBeTruthy();
		expect(screen.getByRole("button", { name: /Ajouter une règle/i })).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				"/api/diversification-targets",
				expect.objectContaining({ method: "PUT" }),
			);
		});
		const body = JSON.parse(
			(vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
		);
		expect(body.targets).toEqual(initial);
	});

	it("editor save with overlapping keys shows an error and does not persist", async () => {
		render(
			<DiversificationTargetsEditor
				initialTargets={[
					{ key: "US", minPct: 0.6, maxPct: 0.7 },
					{ key: "NORTH_AMERICA", minPct: 0.1, maxPct: 0.2 },
				]}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));

		expect(await screen.findByText(/chevauch/i)).toBeTruthy();
		expect(fetch).not.toHaveBeenCalled();
	});
});
