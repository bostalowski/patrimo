import { diversificationKeyLabel } from "@patrimo/core/diversification-labels";
import {
	DIVERSIFICATION_CRYPTO_KEY,
	isDiversificationKeySelectable,
} from "@patrimo/core/diversification-targets";
import {
	geographicCountryOptions,
	geographicRegionOptions,
	type GeographicKeyOption,
} from "./geographic-key-options";

export type DiversificationKeyOptionGroup = {
	label: string;
	options: GeographicKeyOption[];
};

export function diversificationKeyOptionGroups(): DiversificationKeyOptionGroup[] {
	return [
		{
			label: "Crypto",
			options: [{ value: DIVERSIFICATION_CRYPTO_KEY, label: "Crypto" }],
		},
		{
			label: "Régions",
			options: geographicRegionOptions(),
		},
		{
			label: "Pays",
			options: geographicCountryOptions(),
		},
	];
}

export function diversificationKeyOptionsForRow(params: {
	currentKey: string;
	otherKeys: readonly string[];
}): DiversificationKeyOptionGroup[] {
	const { currentKey, otherKeys } = params;
	const groups = diversificationKeyOptionGroups();
	const filtered = groups
		.map((group) => ({
			...group,
			options: group.options.filter((option) =>
				isDiversificationKeySelectable(
					option.value,
					otherKeys,
					currentKey || undefined,
				),
			),
		}))
		.filter((group) => group.options.length > 0);

	if (currentKey && !filtered.some((g) => g.options.some((o) => o.value === currentKey))) {
		return [
			{
				label: "Sélection actuelle",
				options: [
					{
						value: currentKey,
						label: diversificationKeyLabel(currentKey),
					},
				],
			},
			...filtered,
		];
	}

	return filtered;
}

export function filterCountryOptionsForQuery(
	options: GeographicKeyOption[],
	query: string,
): GeographicKeyOption[] {
	const trimmed = query.trim();
	if (!trimmed) {
		return options.filter(
			(option) =>
				option.value === "US" ||
				option.value === "FR" ||
				option.value === "OTHER",
		);
	}
	const lower = trimmed.toLowerCase();
	return options
		.filter(
			(option) =>
				option.value.toLowerCase().includes(lower) ||
				option.label.toLowerCase().includes(lower),
		)
		.slice(0, 30);
}
