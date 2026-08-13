// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatEuro } from "@/lib/utils";
import type { AccountAssetPosition } from "@/lib/portfolio";
import {
  ActiveAccountPositionsTable,
  ClosedAccountPositions,
} from "./account-positions-tables";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

afterEach(cleanup);

function activePosition(
  overrides: Partial<AccountAssetPosition> = {},
): AccountAssetPosition {
  return {
    accountId: "broker",
    assetId: "etf-monde",
    asset: {
      id: "etf-monde",
      label: "ETF Monde",
      type: "ETF",
      source: "manual",
      currency: "EUR",
    },
    quantity: 6,
    costBasis: 600,
    pru: 100,
    realizedIncome: 0,
    realizedPnL: 0,
    fees: 0,
    currentPrice: 120,
    marketValue: 720,
    unrealizedPnL: 120,
    totalReturn: 120,
    totalReturnPct: 0.2,
    ...overrides,
  };
}

describe("web comptes invested display", () => {
  it("renders Investi column with cost basis on an active account position", () => {
    render(<ActiveAccountPositionsTable positions={[activePosition()]} />);

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

  it("does not render Investi on the closed positions table", () => {
    render(
      <ClosedAccountPositions
        positions={[
          activePosition({
            quantity: 0,
            costBasis: 0,
            marketValue: 0,
            unrealizedPnL: 0,
            realizedPnL: 50,
            currentPrice: null,
          }),
        ]}
      />,
    );

    expect(
      screen.queryByRole("columnheader", { name: /Investi/i }),
    ).toBeNull();
  });
});
