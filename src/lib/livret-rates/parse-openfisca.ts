import type { LivretRateStep } from "@patrimo/core/livret-rates";

/**
 * Parse OpenFisca-France `livret_a/taux.yaml` values into rate steps.
 * Only the `values:` block is required; metadata is ignored.
 */
export function parseOpenFiscaLivretRateYaml(yaml: string): LivretRateStep[] {
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
