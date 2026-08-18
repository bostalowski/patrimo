import type { DiversificationTarget } from "@patrimo/core/schema";
import { parseWorkbook, serializeWorkbook } from "./excel-mobile";
import {
	getActiveSource,
	readSourceFile,
	writeSourceFile,
} from "./file-source";

export async function saveDiversificationTargets(
	targets: DiversificationTarget[],
): Promise<void> {
	const source = await getActiveSource();
	if (!source) throw new Error("No file source configured");

	const buffer = await readSourceFile(source);
	const workbook = parseWorkbook(buffer);
	await writeSourceFile(
		source,
		serializeWorkbook(buffer, {
			...workbook.workbook,
			diversificationTargets: targets,
		}),
	);
}
