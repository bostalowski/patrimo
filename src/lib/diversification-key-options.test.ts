import { describe, expect, it } from "vitest";
import {
	diversificationKeyOptionGroups,
	diversificationKeyOptionsForRow,
} from "./diversification-key-options";

describe("diversificationKeyOptionsForRow", () => {
	it("excludes keys already used on other rows", () => {
		const groups = diversificationKeyOptionsForRow({
			currentKey: "",
			otherKeys: ["US"],
		});
		const values = groups.flatMap((group) =>
			group.options.map((option) => option.value),
		);
		expect(values).not.toContain("US");
	});

	it("excludes region when a overlapping country is already selected", () => {
		const groups = diversificationKeyOptionsForRow({
			currentKey: "",
			otherKeys: ["US"],
		});
		const values = groups.flatMap((group) =>
			group.options.map((option) => option.value),
		);
		expect(values).not.toContain("NORTH_AMERICA");
	});

	it("keeps the current key selectable even when it overlaps another row", () => {
		const groups = diversificationKeyOptionsForRow({
			currentKey: "US",
			otherKeys: ["NORTH_AMERICA"],
		});
		const values = groups.flatMap((group) =>
			group.options.map((option) => option.value),
		);
		expect(values).toContain("US");
	});
});

describe("diversificationKeyOptionGroups", () => {
	it("includes crypto, regions, and countries", () => {
		const labels = diversificationKeyOptionGroups().map((group) => group.label);
		expect(labels).toEqual(["Crypto", "Régions", "Pays"]);
	});
});
