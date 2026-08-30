import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	effectiveLivretRateSeries,
	mergeLivretRateSeries,
	type LivretRateStep,
} from "@patrimo/core/livret-rates";

const LIVRET_RATES_KEY = "patrimo:livret-rates";

/** Same OpenFisca source as web (ADR). */
export const OPENFISCA_LIVRET_A_TAUX_URL =
	"https://raw.githubusercontent.com/openfisca/openfisca-france/master/openfisca_france/parameters/taxation_capital/epargne/livret_a/taux.yaml";

export type LivretRateSyncResult =
	| { status: "ok"; steps: number; added: number }
	| { status: "error"; error: string };

function parseOpenFiscaYaml(yaml: string): LivretRateStep[] {
	const valuesMatch = yaml.match(/^values:\s*\n([\s\S]*?)(?=^metadata:|\z)/m);
	const block = valuesMatch?.[1] ?? yaml;
	const steps: LivretRateStep[] = [];
	const pair =
		/(?:^|\n)\s*(\d{4}-\d{2}-\d{2}):\s*\n\s+value:\s*([0-9]+(?:\.[0-9]+)?)/g;
	for (const match of block.matchAll(pair)) {
		const annualRate = Number(match[2]);
		if (!Number.isFinite(annualRate)) continue;
		steps.push({ effectiveFrom: match[1], annualRate });
	}
	return steps.sort((a, b) =>
		a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0,
	);
}

export async function loadLivretRatesCache(): Promise<LivretRateStep[]> {
	const raw = await AsyncStorage.getItem(LIVRET_RATES_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(step): step is LivretRateStep =>
				!!step &&
				typeof step === "object" &&
				typeof (step as LivretRateStep).effectiveFrom === "string" &&
				Number.isFinite((step as LivretRateStep).annualRate),
		);
	} catch {
		return [];
	}
}

export async function saveLivretRatesCache(
	steps: LivretRateStep[],
): Promise<void> {
	await AsyncStorage.setItem(LIVRET_RATES_KEY, JSON.stringify(steps));
}

export async function loadEffectiveLivretRateSeries(): Promise<LivretRateStep[]> {
	return effectiveLivretRateSeries(await loadLivretRatesCache());
}

/**
 * Fetch/merge official rates. Never throws (D9 — must not fail price sync).
 */
export async function syncLivretRates(options?: {
	fetchImpl?: typeof fetch;
}): Promise<LivretRateSyncResult> {
	try {
		const fetchImpl = options?.fetchImpl ?? fetch;
		const response = await fetchImpl(OPENFISCA_LIVRET_A_TAUX_URL, {
			headers: { Accept: "text/yaml, text/plain, */*" },
		});
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} ${response.statusText}`);
		}
		const yaml = await response.text();
		const incoming = parseOpenFiscaYaml(yaml);
		if (incoming.length === 0) {
			throw new Error("no parsable paliers");
		}
		const existing = await loadLivretRatesCache();
		const merged = mergeLivretRateSeries(existing, incoming);
		await saveLivretRatesCache(merged);
		return {
			status: "ok",
			steps: merged.length,
			added: merged.length - existing.length,
		};
	} catch (err) {
		return {
			status: "error",
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
