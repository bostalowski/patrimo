import type { IrBaremeTable, IrBracketBand } from "@patrimo/core/ir-bareme";

type DatedValue = { date: string; value: number };

type RawBracket = {
	thresholds: DatedValue[];
	rates: DatedValue[];
};

/**
 * Parse OpenFisca-France `impot_revenu/bareme_ir_depuis_1945/bareme.yaml`.
 * Converts lower-bound thresholds into inclusive `upperBound` bands used by core.
 */
export function parseOpenFiscaIrBaremeYaml(yaml: string): IrBaremeTable[] {
	const brackets = extractBrackets(yaml);
	if (brackets.length === 0) return [];

	const dates = new Set<string>();
	for (const bracket of brackets) {
		for (const entry of bracket.thresholds) dates.add(entry.date);
		for (const entry of bracket.rates) dates.add(entry.date);
	}
	const sortedDates = [...dates].sort();
	if (sortedDates.length === 0) return [];

	const tables: IrBaremeTable[] = [];
	for (const date of sortedDates) {
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
			const upperBound = i < lowers.length - 1 ? lowers[i + 1]! : null;
			bands.push({ upperBound, rate: rates[i]! });
		}

		tables.push({
			effectiveFrom: date,
			incomeYear: Number(date.slice(0, 4)),
			brackets: bands,
		});
	}
	return tables;
}

function extractBrackets(yaml: string): RawBracket[] {
	const bracketsMatch = yaml.match(
		/^brackets:\s*\n([\s\S]*?)(?=^metadata:|\nmetadata:|\z)/m,
	);
	const block = bracketsMatch?.[1] ?? "";
	if (!block.trim()) return [];

	const chunks = block.split(/(?:^|\n)- threshold:\n/).slice(1);
	const brackets: RawBracket[] = [];
	for (const chunk of chunks) {
		const rateSplit = chunk.split(/\n  rate:\n/);
		const thresholdBlock = rateSplit[0] ?? "";
		const rateBlock = rateSplit[1] ?? "";
		const thresholds = parseDatedValues(thresholdBlock);
		const rates = parseDatedValues(rateBlock);
		if (thresholds.length === 0 && rates.length === 0) continue;
		brackets.push({ thresholds, rates });
	}
	return brackets;
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

/** Last dated value with date ≤ asOf (OpenFisca parameter inheritance). */
function resolveAt(series: DatedValue[], asOf: string): number | undefined {
	let value: number | undefined;
	for (const entry of series) {
		if (entry.date <= asOf) value = entry.value;
		else break;
	}
	return value;
}
