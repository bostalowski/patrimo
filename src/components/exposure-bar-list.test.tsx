// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ExposureBarList } from "@/components/exposure-bar-list";

afterEach(() => {
	cleanup();
});

describe("ExposureBarList", () => {
	it("renders labels, percentages, and euro amounts", () => {
		render(
			<ExposureBarList
				items={[
					{
						key: "INFORMATION_TECHNOLOGY",
						label: "Technologie",
						weight: 0.291,
						marketValue: 2910,
					},
					{
						key: "FINANCIALS",
						label: "Finance",
						weight: 0.1689,
						marketValue: 1689,
					},
				]}
			/>,
		);

		expect(screen.getByText("Technologie")).toBeTruthy();
		expect(screen.getByText("Finance")).toBeTruthy();
		expect(screen.getByText(/29[,.]10[\s\u00a0\u202f]?%/)).toBeTruthy();
		expect(screen.getByText(/16[,.]89[\s\u00a0\u202f]?%/)).toBeTruthy();
	});

	it("clamps bar width to the 0–100 % track via inline style", () => {
		const { container } = render(
			<ExposureBarList
				items={[{ key: "US", label: "États-Unis", weight: 0.7194 }]}
			/>,
		);

		const fill = container.querySelector("[aria-hidden] > div") as HTMLElement;
		expect(fill.style.width).toBe("71.94%");
	});
});
