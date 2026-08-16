import { describe, expect, it } from "vitest";
import {
  regionForCountry,
  PRODUCT_GEOGRAPHIC_REGIONS,
  GEOGRAPHIC_REGION_LABELS,
} from "@patrimo/core/geographic-exposure";

describe("geographic product regions", () => {
  it("uses map-friendly continental regions instead of emerging-markets bucket", () => {
    expect(PRODUCT_GEOGRAPHIC_REGIONS).toEqual([
      "NORTH_AMERICA",
      "LATIN_AMERICA",
      "EUROPE",
      "ASIA_PACIFIC",
      "AFRICA_MIDDLE_EAST",
      "OTHER",
    ]);
    expect(GEOGRAPHIC_REGION_LABELS.AFRICA_MIDDLE_EAST).toBe(
      "Afrique & Moyen-Orient",
    );
    expect(GEOGRAPHIC_REGION_LABELS).not.toHaveProperty("EMERGING");

    expect(regionForCountry("BR")).toBe("LATIN_AMERICA");
    expect(regionForCountry("CN")).toBe("ASIA_PACIFIC");
    expect(regionForCountry("IN")).toBe("ASIA_PACIFIC");
    expect(regionForCountry("PL")).toBe("EUROPE");
    expect(regionForCountry("ZA")).toBe("AFRICA_MIDDLE_EAST");
    expect(regionForCountry("TR")).toBe("AFRICA_MIDDLE_EAST");
  });
});
