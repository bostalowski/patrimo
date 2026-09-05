// @vitest-environment jsdom

import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const livretWorkbook = {
  transactions: [
    {
      date: new Date("2025-01-10T00:00:00.000Z"),
      type: "DEPOT" as const,
      compte: "livret-a",
      actif: "",
      quantite: 10_000,
      prixUnitaire: 1,
      devise: "EUR",
      frais: 0,
      fraisDevise: "EUR",
    },
    {
      date: new Date("2025-09-15T00:00:00.000Z"),
      type: "RETRAIT" as const,
      compte: "livret-a",
      actif: "",
      quantite: 500,
      prixUnitaire: 1,
      devise: "EUR",
      frais: 0,
      fraisDevise: "EUR",
    },
  ],
  assets: [],
  accounts: [
    {
      id: "livret-a",
      label: "Livret A",
      type: "BANQUE" as const,
      envelope: "LIVRET" as const,
      rate: 0.02,
    },
  ],
  budget: [],
  properties: [],
  dca: [],
  manualPrices: [],
  geographicAllocations: [],
  sectorAllocations: [],
  diversificationTargets: [],
  financialGoals: [],
  propertyTaxes: [],
};

vi.mock("@/lib/page-guards", () => ({
  requireExcelConfigured: vi.fn(),
}));

vi.mock("@/lib/excel", () => ({
  loadWorkbook: vi.fn(() => livretWorkbook),
}));

vi.mock("@/lib/store", () => ({
  readPriceMap: vi.fn(async () => new Map()),
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

afterEach(cleanup);

async function renderPage(page: Promise<ReactElement> | ReactElement) {
  render(await page);
}

describe("web livret account detail — official rate + history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows current regulated rate and palier history on the livret account page", async () => {
    vi.resetModules();
    const { default: AccountDetailPage } = await import("./[id]/page");
    await renderPage(
      AccountDetailPage({ params: Promise.resolve({ id: "livret-a" }) }),
    );

    expect(screen.getByRole("heading", { name: "Livret A" })).toBeTruthy();
    expect(screen.getByText(/Taux réglementé \(Livret A \/ LDDS\)/i)).toBeTruthy();
    expect(screen.getByText(/Historique des paliers et mouvements/i)).toBeTruthy();
    // Header still shows today's regulated rate (seed 2026-08 → 1.70 %)
    expect(screen.getAllByText(/1,70\s*%/).length).toBeGreaterThan(0);
    // Only paliers with movements: Jan 2025 dépôt → 3 %; Sep 2025 retrait → 1.70 %
    expect(screen.getByText(/3,00\s*%/)).toBeTruthy();
    expect(screen.queryByText(/2,40\s*%/)).toBeNull();
    expect(screen.getByText(/Dépôt/i)).toBeTruthy();
    expect(screen.getByText(/Retrait/i)).toBeTruthy();
    expect(screen.queryByText(/Géographie du compte/i)).toBeNull();
  });
});
