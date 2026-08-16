import countries from "i18n-iso-countries";
import frLocale from "i18n-iso-countries/langs/fr.json";

countries.registerLocale(frLocale);

export function geographicCountryLabel(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (code === "OTHER") return "Autre";
  return countries.getName(code, "fr") ?? code;
}

export function isMappableCountryCode(countryCode: string): boolean {
  const code = countryCode.trim().toUpperCase();
  if (code === "OTHER" || !/^[A-Z]{2}$/.test(code)) return false;
  return Boolean(countries.alpha2ToNumeric(code));
}

export function numericCountryIdToAlpha2(numericId: string | number): string | null {
  const alpha2 = countries.numericToAlpha2(String(numericId));
  return alpha2 ? alpha2.toUpperCase() : null;
}
