import {
	applyFetchedSectorAllocation,
	sectorAllocationSourceForAsset,
} from "./sector-allocation";
import { lookThroughSectorWeights, normalizeSectorKey } from "./sector-exposure";
import type { Workbook } from "./schema";

export type JustEtfSectorWeight = {
	sector: string;
	weight: number;
};

const SECTOR_NAME_TO_KEY: Record<string, string> = {
	Énergie: "ENERGY",
	Energy: "ENERGY",
	Matériaux: "MATERIALS",
	Materials: "MATERIALS",
	Industrie: "INDUSTRIALS",
	Industrials: "INDUSTRIALS",
	"Consommation discrétionnaire": "CONSUMER_DISCRETIONARY",
	"Consumer Discretionary": "CONSUMER_DISCRETIONARY",
	"Consommation de base": "CONSUMER_STAPLES",
	"Consumer Staples": "CONSUMER_STAPLES",
	"Soins de santé": "HEALTH_CARE",
	"Health Care": "HEALTH_CARE",
	Healthcare: "HEALTH_CARE",
	Finance: "FINANCIALS",
	Financials: "FINANCIALS",
	Technologie: "INFORMATION_TECHNOLOGY",
	Technology: "INFORMATION_TECHNOLOGY",
	"Information Technology": "INFORMATION_TECHNOLOGY",
	"Services de communication": "COMMUNICATION_SERVICES",
	"Communication Services": "COMMUNICATION_SERVICES",
	"Services aux collectivités": "UTILITIES",
	Utilities: "UTILITIES",
	Immobilier: "REAL_ESTATE",
	"Real Estate": "REAL_ESTATE",
	Autre: "OTHER",
	Other: "OTHER",
	Sonstige: "OTHER",
};

const SIMPLE_ROW_REGEX =
	/<t[dh][^>]*>\s*([^<]+?)\s*<\/t[dh]>\s*<t[dh][^>]*>\s*([\d\s\u00a0\u202f]+(?:[.,]\d+)?)\s*%\s*<\/t[dh]>/gi;

const JUSTETF_SECTOR_ROW_REGEX =
	/data-testid="etf-holdings_sectors_row"[^>]*>[\s\S]*?data-testid="tl_etf-holdings_sectors_value_name"[^>]*>([^<]+)<[\s\S]*?data-testid="tl_etf-holdings_sectors_value_percentage"[^>]*>\s*([\d\s\u00a0\u202f]+(?:[.,]\d+)?)\s*%/gi;

function parseFrenchPercent(raw: string): number | null {
	const cleaned = raw.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
	const value = Number(cleaned);
	if (!Number.isFinite(value)) return null;
	return value / 100;
}

function toSectorKey(name: string): string {
	const trimmed = name.trim();
	if (SECTOR_NAME_TO_KEY[trimmed]) return SECTOR_NAME_TO_KEY[trimmed];
	const normalized = normalizeSectorKey(trimmed);
	if (SECTOR_NAME_TO_KEY[normalized]) return SECTOR_NAME_TO_KEY[normalized];
	return normalized;
}

function collectWeights(
	matches: IterableIterator<RegExpMatchArray>,
): JustEtfSectorWeight[] {
	const totals = new Map<string, number>();
	for (const match of matches) {
		const label = match[1].replace(/<[^>]+>/g, "").trim();
		if (!label) continue;
		const weight = parseFrenchPercent(match[2]);
		if (weight === null || weight < 0) continue;
		const sector = toSectorKey(label);
		totals.set(sector, (totals.get(sector) ?? 0) + weight);
	}

	return [...totals.entries()].map(([sector, weight]) => ({
		sector,
		weight: Math.round(weight * 10000) / 10000,
	}));
}

export function parseJustEtfSectorWeights(html: string): JustEtfSectorWeight[] {
	const fromTestIds = collectWeights(html.matchAll(JUSTETF_SECTOR_ROW_REGEX));
	if (fromTestIds.length > 0) return fromTestIds;

	const sectorsTableIndex = html.search(
		/etf-holdings_sectors_(?:table|container)|data-testid="hl_etf-holdings_sectors_header"/i,
	);
	const secteursHeadingIndex = html.search(
		/<(?:h[1-6]|div|section)[^>]*>\s*(?:Secteurs|Sectors|Sektoren)\s*</i,
	);
	const sectionStart =
		sectorsTableIndex >= 0
			? sectorsTableIndex
			: secteursHeadingIndex >= 0
				? secteursHeadingIndex
				: -1;
	if (sectionStart < 0) return [];

	return collectWeights(
		html.slice(sectionStart, sectionStart + 12000).matchAll(SIMPLE_ROW_REGEX),
	);
}

export async function applyJustEtfSectorSync(
	workbook: Workbook,
	assetId: string,
	options: {
		fetchHtml: (isin: string) => Promise<string>;
		restore?: boolean;
	},
): Promise<{
	workbook: Workbook;
	ok: boolean;
	updated: boolean;
	skippedManual: boolean;
}> {
	const asset = workbook.assets.find((candidate) => candidate.id === assetId);
	if (!asset?.isin) {
		return { workbook, ok: false, updated: false, skippedManual: false };
	}

	try {
		const html = await options.fetchHtml(asset.isin);
		const weights = lookThroughSectorWeights(parseJustEtfSectorWeights(html));
		if (weights.length === 0) {
			return { workbook, ok: false, updated: false, skippedManual: false };
		}
		const currentSource = sectorAllocationSourceForAsset(
			workbook.sectorAllocations ?? [],
			assetId,
		);
		if (currentSource === "manual" && !options.restore) {
			return { workbook, ok: true, updated: false, skippedManual: true };
		}
		const before = workbook.sectorAllocations ?? [];
		const next = applyFetchedSectorAllocation(workbook, assetId, weights, {
			restore: options.restore,
		});
		const after = next.sectorAllocations ?? [];
		const updated = JSON.stringify(before) !== JSON.stringify(after);
		return { workbook: next, ok: true, updated, skippedManual: false };
	} catch {
		return { workbook, ok: false, updated: false, skippedManual: false };
	}
}
