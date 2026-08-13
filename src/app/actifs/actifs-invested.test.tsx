// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatEuro } from "@/lib/utils";
import { ActifsTable, type ActifRow } from "./actifs-table";
import { AssetPositionKpis } from "./asset-position-kpis";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("./asset-form", () => ({
  AssetForm: () => null,
}));

afterEach(cleanup);

function openPositionRow(overrides: Partial<ActifRow> = {}): ActifRow {
  return {
    assetId: "etf-monde",
    label: "ETF Monde",
    type: "ETF",
    quantity: 6,
    pru: 100,
    costBasis: 600,
    currentPrice: 120,
    marketValue: 720,
    unrealizedPnL: 120,
    unrealizedPnLPct: 0.2,
    asset: {
      id: "etf-monde",
      label: "ETF Monde",
      type: "ETF",
      source: "manual",
      currency: "EUR",
    },
    ...overrides,
  };
}

describe("web asset invested display", () => {
  it("renders Investi column with cost basis for an open position", () => {
    render(
      <ActifsTable
        rows={[openPositionRow()]}
        assetTypes={["ETF"]}
        priceSources={["manual"]}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: /Investi/i }),
    ).toBeTruthy();

    const row = screen.getByText("ETF Monde").closest("tr");
    expect(row).toBeTruthy();
    const cells = within(row as HTMLElement).getAllByRole("cell");
    const headers = screen.getAllByRole("columnheader");
    const investedIndex = headers.findIndex((h) =>
      h.textContent?.includes("Investi"),
    );
    expect(cells[investedIndex]?.textContent).toBe(formatEuro(600));
  });

  it("renders Investi as 0 € when quantity is zero", () => {
    render(
      <ActifsTable
        rows={[
          openPositionRow({
            quantity: 0,
            pru: 0,
            costBasis: 0,
            marketValue: 0,
            unrealizedPnL: 0,
            unrealizedPnLPct: null,
          }),
        ]}
        assetTypes={["ETF"]}
        priceSources={["manual"]}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: /Investi/i }),
    ).toBeTruthy();

    const row = screen.getByText("ETF Monde").closest("tr");
    expect(row).toBeTruthy();
    const cells = within(row as HTMLElement).getAllByRole("cell");
    const headers = screen.getAllByRole("columnheader");
    const investedIndex = headers.findIndex((h) =>
      h.textContent?.includes("Investi"),
    );
    expect(cells[investedIndex]?.textContent).toBe(formatEuro(0));
  });

  it("renders Investi KPI on asset detail with cost basis", () => {
    render(
      <AssetPositionKpis
        quantity={6}
        pru={100}
        costBasis={600}
        currentPrice={120}
        marketValue={720}
        unrealizedPnL={120}
        ter={null}
      />,
    );

    expect(screen.getByText("Investi")).toBeTruthy();
    const investedHeader = screen.getByText("Investi").parentElement;
    expect(investedHeader?.textContent?.replace(/\s/g, " ")).toContain(
      formatEuro(600).replace(/\s/g, " "),
    );
  });

  it("renders Investi KPI as 0 € on asset detail when quantity is zero", () => {
    render(
      <AssetPositionKpis
        quantity={0}
        pru={0}
        costBasis={0}
        currentPrice={null}
        marketValue={0}
        unrealizedPnL={0}
        ter={null}
      />,
    );

    expect(screen.getByText("Investi")).toBeTruthy();
    const investedHeader = screen.getByText("Investi").parentElement;
    expect(investedHeader?.textContent?.replace(/\s/g, " ")).toContain(
      formatEuro(0).replace(/\s/g, " "),
    );
  });
});
