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
    expect(screen.getByText(/Amérique du Nord/i)).toBeTruthy();
    expect(screen.getByText(/^Europe$/i)).toBeTruthy();
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

    expect(screen.queryByTestId("geographic-world-map")).toBeNull();
    expect(screen.getByText(/^Europe$/i)).toBeTruthy();
    expect(
      screen.queryByText(/Aucune répartition géographique pour les positions couvertes/i),
    ).toBeNull();
  });

  it("asset detail shows empty state when the asset has no allocation", () => {
    render(
      <AssetGeographicSection
        assetId="btc"
        assetLabel="Bitcoin"
        allocations={[]}
        regions={[]}
        countries={[]}
      />,
    );

    expect(
      screen.getByText(/Aucune répartition géographique/i),
    ).toBeTruthy();
  });

  it("web geo surfaces render both country and region breakdowns", () => {
    render(
      <GeographicExposurePanel
        title="Répartition géographique"
        regions={[
          { key: "NORTH_AMERICA", marketValue: 700, weight: 0.7 },
          { key: "EUROPE", marketValue: 300, weight: 0.3 },
        ]}
        countries={[
          { key: "US", marketValue: 700, weight: 0.7 },
          { key: "FR", marketValue: 300, weight: 0.3 },
        ]}
      />,
    );

    expect(screen.getByTestId("geographic-world-map")).toBeTruthy();
    expect(screen.getByText(/États-Unis/i)).toBeTruthy();
    expect(screen.getByText(/Amérique du Nord/i)).toBeTruthy();
    expect(screen.getByText(/^Europe$/i)).toBeTruthy();
  });

  it("web manual entry offers countries|regions mode with closed region list and searchable country picker (no free-typed keys)", () => {
    render(
      <AssetGeographicSection
        assetId="world"
        assetLabel="World"
        allocations={[]}
        regions={[]}
        countries={[]}
      />,
    );

    expect(screen.getByRole("button", { name: /Pays/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Régions/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Régions/i }));
    expect(screen.getByLabelText(/Clé géographique 1/i)).toBeTruthy();
    const regionSelect = screen.getByLabelText(/Clé géographique 1/i);
    expect(regionSelect.tagName).toBe("SELECT");
    expect(
      Array.from((regionSelect as HTMLSelectElement).options).map(
        (option) => option.value,
      ),
    ).toEqual(
      expect.arrayContaining([
        "NORTH_AMERICA",
        "LATIN_AMERICA",
        "EUROPE",
        "ASIA_PACIFIC",
        "AFRICA_MIDDLE_EAST",
        "OTHER",
      ]),
    );
    expect(
      Array.from((regionSelect as HTMLSelectElement).options).map(
        (option) => option.value,
      ),
    ).not.toContain("EMERGING");

    fireEvent.click(screen.getByRole("button", { name: /Pays/i }));
    const countrySelect = screen.getByLabelText(/Clé géographique 1/i);
    expect(countrySelect.tagName).toBe("SELECT");
    expect(screen.queryByPlaceholderText("US")).toBeNull();
  });

  it("web manual entry keeps country draft percentages when toggling to regions and back", () => {
    render(
      <AssetGeographicSection
        assetId="world"
        assetLabel="World"
        allocations={[
          {
            assetId: "world",
            country: "US",
            weight: 0.7,
            source: "manual",
          },
          {
            assetId: "world",
            country: "JP",
            weight: 0.3,
            source: "manual",
          },
        ]}
        regions={[]}
        countries={[]}
      />,
    );

    const weightInputs = screen.getAllByPlaceholderText(
      "70",
    ) as HTMLInputElement[];
    expect(weightInputs[0].value).toBe("70");
    expect(weightInputs[1].value).toBe("30");

    fireEvent.click(screen.getByRole("button", { name: /Régions/i }));
    fireEvent.click(screen.getByRole("button", { name: /Pays/i }));

    const restoredInputs = screen.getAllByPlaceholderText(
      "70",
    ) as HTMLInputElement[];
    expect(restoredInputs[0].value).toBe("70");
    expect(restoredInputs[1].value).toBe("30");
    expect(
      (screen.getByLabelText(/Clé géographique 1/i) as HTMLSelectElement).value,
    ).toBe("US");
    expect(
      (screen.getByLabelText(/Clé géographique 2/i) as HTMLSelectElement).value,
    ).toBe("JP");
  });

  it("shows a non-blocking current-sum indicator when draft weights sum to less than 100%", () => {
    render(
      <AssetGeographicSection
        assetId="world"
        assetLabel="World"
        allocations={[
          {
            assetId: "world",
            country: "US",
            weight: 0.7,
            source: "manual",
          },
          {
            assetId: "world",
            country: "JP",
            weight: 0.1,
            source: "manual",
          },
        ]}
        marketValue={1000}
        regions={[]}
        countries={[]}
      />,
    );

    expect(screen.getByText(/80\s*%\s*renseignés/i)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: /Enregistrer/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("updates the region breakdown live when country draft weights change", () => {
    render(
      <AssetGeographicSection
        assetId="world"
        assetLabel="World"
        allocations={[]}
        marketValue={1000}
        regions={[]}
        countries={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Clé géographique 1/i), {
      target: { value: "US" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("70")[0], {
      target: { value: "70" },
    });

    expect(screen.getByTestId("geographic-world-map")).toBeTruthy();
    expect(screen.getByText(/Amérique du Nord/i)).toBeTruthy();
  });
});
