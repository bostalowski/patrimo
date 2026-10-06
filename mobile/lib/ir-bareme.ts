import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	effectiveIrBaremeSeries,
	mergeIrBaremeSeries,
	type IrBaremeTable,
	type IrBracketBand,
} from "@patrimo/core/ir-bareme";

const IR_BAREME_KEY = "patrimo:ir-bareme";

/** Same OpenFisca source as web (ADR 0031). */
export const OPENFISCA_IR_BAREME_URL =
	"https://raw.githubusercontent.com/openfisca/openfisca-france/master/openfisca_france/parameters/impot_revenu/bareme_ir_depuis_1945/bareme.yaml";

export type IrBaremeSyncResult =
	| { status: "ok"; tables: number; added: number }
	| { status: "error"; error: string };

type DatedValue = { date: string; value: number };

function parseOpenFiscaIrBaremeYaml(yaml: string): IrBaremeTable[] {
	const bracketsMatch = yaml.match(
		/^brackets:\s*\n([\s\S]*?)(?=^metadata:|\nmetadata:|\z)/m,
	);
	const block = bracketsMatch?.[1] ?? "";
	if (!block.trim()) return [];

	const chunks = block.split(/(?:^|\n)- threshold:\n/).slice(1);
	const brackets: { thresholds: DatedValue[]; rates: DatedValue[] }[] = [];
	for (const chunk of chunks) {
		const rateSplit = chunk.split(/\n  rate:\n/);
		const thresholds = parseDatedValues(rateSplit[0] ?? "");
		const rates = parseDatedValues(rateSplit[1] ?? "");
		if (thresholds.length === 0 && rates.length === 0) continue;
		brackets.push({ thresholds, rates });
	}
	if (brackets.length === 0) return [];

	const dates = new Set<string>();
	for (const bracket of brackets) {
		for (const entry of bracket.thresholds) dates.add(entry.date);
		for (const entry of bracket.rates) dates.add(entry.date);
	}
	const tables: IrBaremeTable[] = [];
	for (const date of [...dates].sort()) {
		const lowers: number[] = [];
		const rates: number[] = [];
		for (const bracket of brackets) {
			const threshold = resolveAt(bracket.thresholds, date);
			const rate = resolveAt(bracket.rates, date);
			if (threshold === undefined || rate === undefined) continue;
			lowers.push(threshold);
			rates.push(rate);
		}
		if (lowers.length < 2) continue;
		const bands: IrBracketBand[] = [];
		for (let i = 0; i < lowers.length; i++) {
			bands.push({
				upperBound: i < lowers.length - 1 ? lowers[i + 1]! : null,
				rate: rates[i]!,
			});
		}
		tables.push({
			effectiveFrom: date,
			incomeYear: Number(date.slice(0, 4)),
			brackets: bands,
		});
	}
	return tables;
}

function parseDatedValues(block: string): DatedValue[] {
	const values: DatedValue[] = [];
	const pair =
		/(?:^|\n)\s*(\d{4}-\d{2}-\d{2}):\s*\n\s+value:\s*([0-9]+(?:\.[0-9]+)?)/g;
	for (const match of block.matchAll(pair)) {
		const value = Number(match[2]);
		if (!Number.isFinite(value)) continue;
		values.push({ date: match[1]!, value });
	}
	return values.sort((a, b) =>
		a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
	);
}

function resolveAt(series: DatedValue[], asOf: string): number | undefined {
	let value: number | undefined;
	for (const entry of series) {
		if (entry.date <= asOf) value = entry.value;
		else break;
	}
	return value;
}

function isTable(value: unknown): value is IrBaremeTable {
	if (!value || typeof value !== "object") return false;
	const table = value as IrBaremeTable;
	return (
		typeof table.effectiveFrom === "string" &&
		typeof table.incomeYear === "number" &&
		Array.isArray(table.brackets) &&
		table.brackets.length > 0
	);
}

export async function loadIrBaremeCache(): Promise<IrBaremeTable[]> {
	const raw = await AsyncStorage.getItem(IR_BAREME_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isTable);
	} catch {
		return [];
	}
}

export async function saveIrBaremeCache(
	tables: IrBaremeTable[],
): Promise<void> {
	await AsyncStorage.setItem(IR_BAREME_KEY, JSON.stringify(tables));
}

export async function loadEffectiveIrBaremeSeries(): Promise<IrBaremeTable[]> {
	return effectiveIrBaremeSeries(await loadIrBaremeCache());
}

/**
 * Fetch/merge official IR barème. Never throws (E9 — must not fail price sync).
 */
export async function syncIrBareme(options?: {
	fetchImpl?: typeof fetch;
}): Promise<IrBaremeSyncResult> {
	try {
		const fetchImpl = options?.fetchImpl ?? fetch;
		const response = await fetchImpl(OPENFISCA_IR_BAREME_URL, {
			headers: { Accept: "text/yaml, text/plain, */*" },
		});
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} ${response.statusText}`);
		}
		const yaml = await response.text();
		const incoming = parseOpenFiscaIrBaremeYaml(yaml);
		if (incoming.length === 0) {
			throw new Error("no parsable tables");
		}
		const existing = await loadIrBaremeCache();
		const merged = mergeIrBaremeSeries(existing, incoming);
		await saveIrBaremeCache(merged);
		return {
			status: "ok",
			tables: merged.length,
			added: merged.length - existing.length,
		};
	} catch (err) {
		return {
			status: "error",
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
