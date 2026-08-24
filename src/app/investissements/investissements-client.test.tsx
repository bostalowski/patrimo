// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}));

import { InvestissementsClient } from "@/app/investissements/investissements-client";

afterEach(cleanup);

describe("InvestissementsClient", () => {
	it("does not show an Allocation cible tab", () => {
		render(
			<InvestissementsClient
				configs={[]}
				portfolioByEnvelope={{}}
				assets={[]}
				seedConfig={null}
				priceMap={{}}
				monthlyTilt={null}
				initialProfile={{ targetRetirementAge: 65 }}
				properties={[]}
			/>,
		);

		expect(screen.queryByText("Allocation cible")).toBeNull();
		expect(screen.getByText("Plans DCA")).toBeTruthy();
	});
});
