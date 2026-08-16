import countries from "i18n-iso-countries";

export {
  geographicCountryLabel,
  isMappableCountryCode,
} from "@patrimo/core/geographic-exposure";

export function numericCountryIdToAlpha2(
  numericId: string | number,
): string | null {
  const alpha2 = countries.numericToAlpha2(String(numericId));
  return alpha2 ? alpha2.toUpperCase() : null;
}
