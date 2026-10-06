import {
	effectiveIrBaremeSeries,
	resolveLatestIrBareme,
	type IrBaremeTable,
} from "@patrimo/core/ir-bareme";
import { observeTaxBracket, type TaxBracketObservation } from "@patrimo/core/tax-bracket";
import type { Workbook } from "@patrimo/core/schema";

export function observeWorkbookTaxBracket(
	workbook: Workbook,
	cache?: IrBaremeTable[],
): TaxBracketObservation {
	const config = workbook.foyerFiscalConfig;
	if (!config) {
		return { status: "incomplete", reason: "not_configured" };
	}
	return observeTaxBracket({
		config,
		budget: workbook.budget,
		baremeSeries: effectiveIrBaremeSeries(cache),
	});
}

export function resolvedBareme(cache?: IrBaremeTable[]) {
	return resolveLatestIrBareme(effectiveIrBaremeSeries(cache));
}
