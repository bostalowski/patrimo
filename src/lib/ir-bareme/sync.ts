import {
	mergeIrBaremeSeries,
	type IrBaremeTable,
} from "@patrimo/core/ir-bareme";
import { fetchOfficialIrBareme } from "./fetch";
import { readIrBaremeCache, writeIrBaremeCache } from "./cache";

export type IrBaremeSyncResult =
	| {
			status: "ok";
			tables: number;
			added: number;
	  }
	| {
			status: "error";
			error: string;
	  };

/**
 * Fetch official IR barème and merge into the local cache.
 * Never throws — callers use this beside price sync (E9 isolation).
 * Malformed/empty parse or fetch failure preserves existing cache.
 */
export async function syncIrBareme(options?: {
	fetchImpl?: typeof fetch;
}): Promise<IrBaremeSyncResult> {
	try {
		const incoming = await fetchOfficialIrBareme(options?.fetchImpl);
		const existing = await readIrBaremeCache();
		const merged = mergeIrBaremeSeries(existing, incoming);
		const added = merged.length - existing.length;
		await writeIrBaremeCache(merged);
		return { status: "ok", tables: merged.length, added };
	} catch (err) {
		return {
			status: "error",
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

export type { IrBaremeTable };
