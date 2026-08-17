import countries from "i18n-iso-countries";
import frLocale from "i18n-iso-countries/langs/fr.json";
import {
  PRODUCT_GEOGRAPHIC_REGIONS,
  GEOGRAPHIC_REGION_LABELS,
  type GeographicRegion,
} from "@patrimo/core/geographic-exposure";
import { geographicCountryLabel } from "@/lib/geographic-country-label";

countries.registerLocale(frLocale);

export type GeographicKeyOption = {
  value: string;
  label: string;
};

let cachedCountryOptions: GeographicKeyOption[] | null = null;

function compareLabels(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function geographicRegionOptions(): GeographicKeyOption[] {
  return PRODUCT_GEOGRAPHIC_REGIONS.map((value) => ({
    value,
    label: GEOGRAPHIC_REGION_LABELS[value as GeographicRegion],
  }));
}

export function geographicCountryOptions(): GeographicKeyOption[] {
  if (cachedCountryOptions) return cachedCountryOptions;

  const names = countries.getNames("fr");
  const options: GeographicKeyOption[] = Object.keys(names).map((code) => {
    const value = code.toUpperCase();
    return {
      value,
      label: `${geographicCountryLabel(value)} (${value})`,
    };
  });
  options.push({ value: "OTHER", label: "Autre (OTHER)" });
  options.sort(
    (a, b) => compareLabels(a.label, b.label) || a.value.localeCompare(b.value),
  );
  cachedCountryOptions = options;
  return options;
}
