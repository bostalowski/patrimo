import { DIVERSIFICATION_CRYPTO_KEY } from "@patrimo/core/diversification-targets";
import { diversificationKeyLabel } from "@patrimo/core/diversification-labels";
import { isDiversificationKeySelectable } from "@patrimo/core/diversification-targets";
import {
	geographicCountryOptions,
	geographicRegionOptions,
	type GeographicKeyOption,
} from "@/lib/geographic-key-options";

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
