import type { IrBaremeTable } from "@patrimo/core/ir-bareme";
import { parseOpenFiscaIrBaremeYaml } from "./parse-openfisca";

/** OpenFisca-France IR barème parameter file (art. 197 CGI mirror). */
export const OPENFISCA_IR_BAREME_URL =
	"https://raw.githubusercontent.com/openfisca/openfisca-france/master/openfisca_france/parameters/impot_revenu/bareme_ir_depuis_1945/bareme.yaml";

export async function fetchOfficialIrBareme(
	fetchImpl: typeof fetch = fetch,
): Promise<IrBaremeTable[]> {
	const response = await fetchImpl(OPENFISCA_IR_BAREME_URL, {
		headers: { Accept: "text/yaml, text/plain, */*" },
		cache: "no-store",
	});
	if (!response.ok) {
		throw new Error(
			`IR barème fetch failed: HTTP ${response.status} ${response.statusText}`,
		);
	}
	const yaml = await response.text();
	const tables = parseOpenFiscaIrBaremeYaml(yaml);
	if (tables.length === 0) {
		throw new Error("IR barème fetch returned no parsable tables");
	}
	return tables;
}
