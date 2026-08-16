import {
  geographicCountryLabel,
  PRODUCT_GEOGRAPHIC_REGIONS,
  GEOGRAPHIC_REGION_LABELS,
  type GeographicRegion,
} from "@patrimo/core/geographic-exposure";

export type GeographicKeyOption = {
  value: string;
  label: string;
};

let cachedCountryOptions: GeographicKeyOption[] | null = null;

export function geographicRegionOptions(): GeographicKeyOption[] {
  return PRODUCT_GEOGRAPHIC_REGIONS.map((value) => ({
    value,
    label: GEOGRAPHIC_REGION_LABELS[value as GeographicRegion],
  }));
}

export function geographicCountryOptions(): GeographicKeyOption[] {
  if (cachedCountryOptions) return cachedCountryOptions;

  const options: GeographicKeyOption[] = [];
  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const code = String.fromCharCode(first, second);
      const label = geographicCountryLabel(code);
      if (label !== code) {
        options.push({ value: code, label: `${label} (${code})` });
      }
    }
  }
  options.push({ value: "OTHER", label: "Autre (OTHER)" });
  options.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  cachedCountryOptions = options;
  return options;
}
