// @vitest-environment jsdom

import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const workbookFixture = {
  transactions: [
    {
      date: new Date("2026-01-01T00:00:00.000Z"),
      type: "ACHAT" as const,
      compte: "pea",
      actif: "world",
      quantite: 10,
      prixUnitaire: 100,
      devise: "EUR",
      frais: 0,
      fraisDevise: "EUR",
    },
  ],
  assets: [
    {
      id: "world",
      label: "World ETF",
      type: "ETF" as const,
      source: "yahoo" as const,
      currency: "EUR",
      isin: "IE00B4L5Y983",
    },
  ],
  accounts: [
    {
      id: "pea",
      label: "PEA Boursorama",
      type: "BROKER" as const,
      envelope: "PEA" as const,
    },
  ],
  budget: [],
  properties: [],
  dca: [],
  manualPrices: [],
  geographicAllocations: [
    {
      assetId: "world",
      country: "US",
      weight: 0.7,
      source: "manual" as const,
    },
    {
      assetId: "world",
      country: "JP",
      weight: 0.3,
      source: "manual" as const,
    },
  ],
  diversificationTargets: [],
};

vi.mock("@/lib/page-guards", () => ({
  requireExcelConfigured: vi.fn(),
}));

vi.mock("@/lib/excel", () => ({
  loadWorkbook: vi.fn(() => workbookFixture),
}));

vi.mock("@/lib/store", () => ({
  readPriceMap: vi.fn(async () => new Map([["world", 100]])),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  notFound: () => {
    throw new Error("notFound");
  },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/geographic-world-map", () => ({
  GeographicWorldMap: () => <div data-testid="geographic-world-map" />,
}));

import ComptesPage from "./page";

afterEach(cleanup);

async function renderPage(page: Promise<ReactElement> | ReactElement) {
  const element = await page;
  render(element);
}

describe("web comptes account detail surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("web accounts list does not render per-account geographic exposure panels", async () => {
    await renderPage(ComptesPage());

    expect(screen.queryByText("Géographie du compte")).toBeNull();
    expect(screen.queryByTestId("geographic-world-map")).toBeNull();
  });

  it("web accounts list links each account to /comptes/[id]", async () => {
    await renderPage(ComptesPage());

    const link = screen.getByRole("link", { name: /PEA Boursorama/i });
    expect(link.getAttribute("href")).toBe("/comptes/pea");
  });

  it("web account detail shows positions and country plus region exposure for that account only", async () => {
    const { default: AccountDetailPage } = await import("./[id]/page");
    await renderPage(AccountDetailPage({ params: Promise.resolve({ id: "pea" }) }));

    expect(screen.getByText("World ETF")).toBeTruthy();
    expect(screen.getByTestId("geographic-world-map")).toBeTruthy();
    expect(screen.getByText(/États-Unis/i)).toBeTruthy();
    expect(screen.getByText(/Amérique du Nord/i)).toBeTruthy();
    expect(screen.getByText(/Asie-Pacifique/i)).toBeTruthy();
  });

  it("web account detail shows empty geo message when covered market value is zero", async () => {
    const { loadWorkbook } = await import("@/lib/excel");
    vi.mocked(loadWorkbook).mockReturnValue({
      ...workbookFixture,
      geographicAllocations: [],
      sectorAllocations: [],
      diversificationTargets: [],
    });

    vi.resetModules();
    const { default: AccountDetailPage } = await import("./[id]/page");
    await renderPage(AccountDetailPage({ params: Promise.resolve({ id: "pea" }) }));

    expect(
      screen.getByText(/Aucune répartition disponible pour les positions liquides/i),
    ).toBeTruthy();
    expect(screen.queryByTestId("geographic-world-map")).toBeNull();
  });
});
