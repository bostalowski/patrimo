import { sectorLabel, PRODUCT_SECTOR_KEYS } from "@patrimo/core/sector-exposure";

export type SectorKeyOption = {
	value: string;
	label: string;
};

export function sectorOptions(): SectorKeyOption[] {
	return PRODUCT_SECTOR_KEYS.filter((key) => key !== "OTHER").map((key) => ({
		value: key,
		label: sectorLabel(key),
	}));
}
