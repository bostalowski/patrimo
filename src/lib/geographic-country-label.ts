import countries from "i18n-iso-countries";
import frLocale from "i18n-iso-countries/langs/fr.json";

countries.registerLocale(frLocale);

export { isMappableCountryCode } from "@patrimo/core/geographic-exposure";

export function geographicCountryLabel(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (code === "OTHER") return "Autre";
  if (!/^[A-Z]{2}$/.test(code)) return code;
  return countries.getName(code, "fr") ?? code;
}

export function numericCountryIdToAlpha2(
  numericId: string | number,
): string | null {
  const alpha2 = countries.numericToAlpha2(String(numericId));
  return alpha2 ? alpha2.toUpperCase() : null;
}
