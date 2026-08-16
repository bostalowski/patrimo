// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
  it("global geography page renders region slices from aggregated exposure", () => {
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
    expect(screen.getAllByText(/Amérique du Nord/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Europe/i).length).toBeGreaterThan(0);
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

  it("accounts page shows per-account geographic slices for covered positions", () => {
    render(
      <GeographicExposurePanel
        title="Géographie du compte"
        regions={[
          { key: "ASIA_PACIFIC", marketValue: 200, weight: 1 },
        ]}
        countries={[{ key: "JP", marketValue: 200, weight: 1 }]}
      />,
    );

    expect(screen.getByText("Géographie du compte")).toBeTruthy();
    expect(screen.getAllByText(/Asie-Pacifique/i).length).toBeGreaterThan(0);
  });
});
