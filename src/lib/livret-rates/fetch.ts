import type { LivretRateStep } from "@patrimo/core/livret-rates";
import { parseOpenFiscaLivretRateYaml } from "./parse-openfisca";

/** OpenFisca-France parameter file (official arrêtés mirrored). */
export const OPENFISCA_LIVRET_A_TAUX_URL =
	"https://raw.githubusercontent.com/openfisca/openfisca-france/master/openfisca_france/parameters/taxation_capital/epargne/livret_a/taux.yaml";

export async function fetchOfficialLivretRates(
	fetchImpl: typeof fetch = fetch,
): Promise<LivretRateStep[]> {
	const response = await fetchImpl(OPENFISCA_LIVRET_A_TAUX_URL, {
		headers: { Accept: "text/yaml, text/plain, */*" },
		cache: "no-store",
	});
	if (!response.ok) {
		throw new Error(
			`Livret rate fetch failed: HTTP ${response.status} ${response.statusText}`,
		);
	}
	const yaml = await response.text();
	const steps = parseOpenFiscaLivretRateYaml(yaml);
	if (steps.length === 0) {
		throw new Error("Livret rate fetch returned no parsable paliers");
	}
	return steps;
}
