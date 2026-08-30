import { readFileSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { LivretRateStep } from "@patrimo/core/livret-rates";

const DATA_DIR = process.env.FINGRAPHS_DATA_DIR
	? resolve(process.env.FINGRAPHS_DATA_DIR)
	: resolve(process.cwd(), "data");

export const LIVRET_RATES_FILE = resolve(DATA_DIR, "livret-rates.json");

function isStep(value: unknown): value is LivretRateStep {
	if (!value || typeof value !== "object") return false;
	const step = value as LivretRateStep;
	return (
		typeof step.effectiveFrom === "string" &&
		Number.isFinite(step.annualRate)
	);
}

function normalize(raw: unknown): LivretRateStep[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter(isStep);
}

export async function readLivretRatesCache(): Promise<LivretRateStep[]> {
	try {
		const raw = await readFile(LIVRET_RATES_FILE, "utf-8");
		return normalize(JSON.parse(raw));
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw err;
	}
}

/** Sync read for portfolio assembly (seed used when missing/empty). */
export function readLivretRatesCacheSync(): LivretRateStep[] {
	try {
		const raw = readFileSync(LIVRET_RATES_FILE, "utf-8");
		return normalize(JSON.parse(raw));
	} catch {
		return [];
	}
}

export async function writeLivretRatesCache(
	steps: LivretRateStep[],
): Promise<void> {
	await mkdir(dirname(LIVRET_RATES_FILE), { recursive: true });
	await writeFile(
		LIVRET_RATES_FILE,
		JSON.stringify(steps, null, 2) + "\n",
		"utf-8",
	);
}
