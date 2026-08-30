import {
	buildPortfolio as buildPortfolioCore,
	type PriceMap,
	type Portfolio,
} from "@patrimo/core/portfolio";
import {
	currentLivretRate,
	effectiveLivretRateSeries,
} from "@patrimo/core/livret-rates";
import type { Workbook } from "@patrimo/core/schema";
import { readLivretRatesCacheSync } from "@/lib/livret-rates/cache";

export * from "@patrimo/core/portfolio";

/** App portfolio: injects seed∪cache livret rates (account.rate ignored in math). */
export function buildPortfolio(
	workbook: Workbook,
	prices: PriceMap,
): Portfolio {
	const cache = readLivretRatesCacheSync();
	return buildPortfolioCore(workbook, prices, {
		livretRateSeries: effectiveLivretRateSeries(cache),
	});
}

export function currentOfficialLivretRate(asOf: Date = new Date()): number {
	const cache = readLivretRatesCacheSync();
	return currentLivretRate(effectiveLivretRateSeries(cache), asOf);
}

/** Seed ∪ cache series used for LIVRET math and UI (newest last). */
export function loadOfficialLivretRateSeries() {
	return effectiveLivretRateSeries(readLivretRatesCacheSync());
}
