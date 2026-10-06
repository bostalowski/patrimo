import { readFileSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { IrBaremeTable } from "@patrimo/core/ir-bareme";

const DATA_DIR = process.env.FINGRAPHS_DATA_DIR
	? resolve(process.env.FINGRAPHS_DATA_DIR)
	: resolve(process.cwd(), "data");

export const IR_BAREME_FILE = resolve(DATA_DIR, "ir-bareme.json");

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

function normalize(raw: unknown): IrBaremeTable[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter(isTable);
}

export async function readIrBaremeCache(): Promise<IrBaremeTable[]> {
	try {
		const raw = await readFile(IR_BAREME_FILE, "utf-8");
		return normalize(JSON.parse(raw));
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw err;
	}
}

export function readIrBaremeCacheSync(): IrBaremeTable[] {
	try {
		const raw = readFileSync(IR_BAREME_FILE, "utf-8");
		return normalize(JSON.parse(raw));
	} catch {
		return [];
	}
}

export async function writeIrBaremeCache(
	tables: IrBaremeTable[],
): Promise<void> {
	await mkdir(dirname(IR_BAREME_FILE), { recursive: true });
	await writeFile(
		IR_BAREME_FILE,
		JSON.stringify(tables, null, 2) + "\n",
		"utf-8",
	);
}
