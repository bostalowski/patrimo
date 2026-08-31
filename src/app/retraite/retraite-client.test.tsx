// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/components/retirement-profile-form", () => ({
	RetirementProfileForm: () => <div>Profil form</div>,
}));

import { RetraiteClient } from "@/app/retraite/retraite-client";

afterEach(cleanup);

describe("RetraiteClient — no invented horizon", () => {
	it("without active scenario: incomplete copy, no fixed N-year fallback", () => {
		render(
			<RetraiteClient
				initialProfile={{}}
				horizon={null}
				scenarios={[]}
				monthlyRealEstateNet={0}
				timeline={[]}
				inflationRate={0.02}
			/>,
		);

		expect(
			screen.getByText(/aucun horizon de projection n.est inventé/i),
		).toBeTruthy();
		expect(screen.queryByText(/horizon fixe/i)).toBeNull();
		expect(screen.queryByText(/10 ans/i)).toBeNull();
	});
});
