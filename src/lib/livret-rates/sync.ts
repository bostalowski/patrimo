import {
	mergeLivretRateSeries,
	type LivretRateStep,
} from "@patrimo/core/livret-rates";
import { fetchOfficialLivretRates } from "./fetch";
import { readLivretRatesCache, writeLivretRatesCache } from "./cache";

export type LivretRateSyncResult =
	| {
			status: "ok";
			steps: number;
			added: number;
	  }
	| {
			status: "error";
			error: string;
	  };

/**
 * Fetch official rates and merge into the local cache.
 * Never throws — callers use this beside price sync (D9 isolation).
 */
export async function syncLivretRates(options?: {
	fetchImpl?: typeof fetch;
}): Promise<LivretRateSyncResult> {
	try {
		const incoming = await fetchOfficialLivretRates(options?.fetchImpl);
		const existing = await readLivretRatesCache();
		const merged = mergeLivretRateSeries(existing, incoming);
		const added = merged.length - existing.length;
		await writeLivretRatesCache(merged);
		return { status: "ok", steps: merged.length, added };
	} catch (err) {
		return {
			status: "error",
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

export type { LivretRateStep };
