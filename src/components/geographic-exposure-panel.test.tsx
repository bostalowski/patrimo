// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  AssetGeographicSection,
  GeographicExposurePanel,
} from "@/components/geographic-exposure-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

describe("web geographic UI", () => {
  it("renders an interactive country map and a country list instead of finance-region labels", () => {
    render(
      <GeographicExposurePanel
        title="Répartition géographique"
        regions={[
          { key: "NORTH_AMERICA", marketValue: 600, weight: 0.6 },
          { key: "EUROPE", marketValue: 400, weight: 0.4 },
        ]}
        countries={[
          { key: "US", marketValue: 600, weight: 0.6 },
          { key: "FR", marketValue: 400, weight: 0.4 },
        ]}
      />,
    );

    expect(screen.getByText("Répartition géographique")).toBeTruthy();
    expect(screen.getByTestId("geographic-world-map")).toBeTruthy();
    expect(screen.getByText(/États-Unis/i)).toBeTruthy();
    expect(screen.getByText(/France/i)).toBeTruthy();
    expect(screen.queryByText(/Amérique du Nord/i)).toBeNull();
    expect(screen.queryByText(/^Europe$/i)).toBeNull();
  });

  it("shows OTHER (and non-mappable codes) in the list only, not as a painted map country", () => {
    render(
      <GeographicExposurePanel
        title="Répartition géographique"
        regions={[]}
        countries={[
          { key: "US", marketValue: 700, weight: 0.7 },
          { key: "OTHER", marketValue: 300, weight: 0.3 },
        ]}
      />,
    );

    expect(screen.getByText(/Autre/i)).toBeTruthy();
    expect(screen.queryByTestId("geo-country-OTHER")).toBeNull();
    expect(screen.getByTestId("geo-country-US")).toBeTruthy();
  });

  it("exposes hover details with French country label, euro amount, and weight percent for a mapped country", () => {
    render(
      <GeographicExposurePanel
        title="Répartition géographique"
        regions={[]}
        countries={[{ key: "JP", marketValue: 1234, weight: 0.25 }]}
      />,
    );

    fireEvent.mouseEnter(screen.getByTestId("geo-country-JP"));
    const tooltip = screen.getByTestId("geographic-map-tooltip");
    expect(tooltip.textContent).toMatch(/Japon/i);
    expect(tooltip.textContent).toMatch(/1[\s\u00a0\u202f]?234/);
    expect(tooltip.textContent).toMatch(/25[,.]00[\s\u00a0\u202f]?%/);
  });

  it("shows the empty covered-exposure message when there are no country slices", () => {
    render(
      <GeographicExposurePanel
        title="Répartition géographique"
        regions={[{ key: "EUROPE", marketValue: 100, weight: 1 }]}
        countries={[]}
      />,
    );

    expect(
      screen.getByText(/Aucune répartition géographique pour les positions couvertes/i),
    ).toBeTruthy();
    expect(screen.queryByTestId("geographic-world-map")).toBeNull();
  });

  it("asset detail shows empty state when the asset has no allocation", () => {
    render(
      <AssetGeographicSection
        assetId="btc"
        assetLabel="Bitcoin"
        hasIsin={false}
        allocations={[]}
        regions={[]}
        countries={[]}
      />,
    );

    expect(
      screen.getByText(/Aucune répartition géographique/i),
    ).toBeTruthy();
  });

  it("accounts page shows per-account country map for covered positions", () => {
    render(
      <GeographicExposurePanel
        title="Géographie du compte"
        regions={[{ key: "ASIA_PACIFIC", marketValue: 200, weight: 1 }]}
        countries={[{ key: "JP", marketValue: 200, weight: 1 }]}
      />,
    );

    expect(screen.getByText("Géographie du compte")).toBeTruthy();
    expect(screen.getByTestId("geographic-world-map")).toBeTruthy();
    expect(screen.getByText(/Japon/i)).toBeTruthy();
    expect(screen.queryByText(/Asie-Pacifique/i)).toBeNull();
  });
});
