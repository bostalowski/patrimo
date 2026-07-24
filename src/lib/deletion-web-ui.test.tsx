// @vitest-environment jsdom

import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NO_ACCOUNT_ID } from "@patrimo/core/deletion";
import { AccountForm } from "@/app/comptes/account-form";
import { AssetForm } from "@/app/actifs/asset-form";
import {
  emptyTxValue,
  TransactionFields,
} from "@/app/transactions/transaction-form";

const refresh = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push }),
}));

const AccountFormWithDeletion = AccountForm as ComponentType<any>;
const AssetFormWithDeletion = AssetForm as ComponentType<any>;

afterEach(cleanup);

const account = {
  id: "broker",
  label: "Broker",
  type: "BROKER",
  envelope: "CTO",
} as const;

const asset = {
  id: "stock",
  label: "Stock",
  type: "ETF",
  source: "manual",
  currency: "EUR",
} as const;

const relatedData = {
  transactionCount: 3,
  assetCount: 2,
  priceCount: 2,
  investmentPlanCount: 1,
};

function renderAccountForm(deletionImpact = relatedData) {
  render(
    <AccountFormWithDeletion
      accountTypes={["BROKER"]}
      envelopes={["CTO"]}
      account={account}
      trigger="icon"
      deletionImpact={deletionImpact}
    />,
  );
}

function renderAssetForm() {
  render(
    <AssetFormWithDeletion
      assetTypes={["ETF"]}
      priceSources={["manual"]}
      asset={asset}
      trigger="icon"
      deletionImpact={relatedData}
    />,
  );
}

describe("web deletion interface", () => {
  beforeEach(() => {
    refresh.mockReset();
    push.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      }),
    );
  });

  it("shows a simple irreversible confirmation for an empty account", async () => {
    const user = userEvent.setup();
    renderAccountForm({
      transactionCount: 0,
      assetCount: 0,
      priceCount: 0,
      investmentPlanCount: 0,
    });

    await user.click(
      screen.getByRole("button", { name: "Supprimer le compte" }),
    );

    expect(
      screen.getByRole("heading", { name: "Supprimer Broker ?" }),
    ).toBeTruthy();
    expect(screen.getByText(/action est irréversible/i)).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("offers cascade and detach modes when an account has related data", async () => {
    const user = userEvent.setup();
    renderAccountForm();

    await user.click(
      screen.getByRole("button", { name: "Supprimer le compte" }),
    );

    expect(
      screen.getByRole("radio", { name: /supprimer les données liées/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: /rattacher à aucun compte/i }),
    ).toBeTruthy();
  });

  it("describes affected transactions assets prices and investment plans before account deletion", async () => {
    const user = userEvent.setup();
    renderAccountForm();

    await user.click(
      screen.getByRole("button", { name: "Supprimer le compte" }),
    );

    expect(screen.getByText(/3 transactions/i)).toBeTruthy();
    expect(screen.getByText(/2 actifs/i)).toBeTruthy();
    expect(screen.getByText(/2 historiques de prix/i)).toBeTruthy();
    expect(screen.getByText(/1 plan d’investissement/i)).toBeTruthy();
  });

  it("shows an irreversible confirmation with affected data before asset deletion", async () => {
    const user = userEvent.setup();
    renderAssetForm();

    await user.click(
      screen.getByRole("button", { name: "Supprimer l'actif" }),
    );

    expect(
      screen.getByRole("heading", { name: "Supprimer Stock ?" }),
    ).toBeTruthy();
    expect(screen.getByText(/3 transactions/i)).toBeTruthy();
    expect(screen.getByText(/action est irréversible/i)).toBeTruthy();
  });

  it("submits the selected deletion mode and refreshes the current page", async () => {
    const user = userEvent.setup();
    renderAccountForm();

    await user.click(
      screen.getByRole("button", { name: "Supprimer le compte" }),
    );
    await user.click(
      screen.getByRole("radio", { name: /rattacher à aucun compte/i }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmer la suppression" }),
    );

    expect(fetch).toHaveBeenCalledWith("/api/accounts", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "broker", mode: "detach" }),
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps the confirmation open and displays the error when deletion fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Workbook is locked" }),
    } as Response);
    const user = userEvent.setup();
    renderAssetForm();

    await user.click(
      screen.getByRole("button", { name: "Supprimer l'actif" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmer la suppression" }),
    );

    expect(screen.getByText("Workbook is locked")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Supprimer Stock ?" }),
    ).toBeTruthy();
  });

  it("excludes No account from transaction creation options", () => {
    const accounts = [
      { id: NO_ACCOUNT_ID, label: "Aucun compte", envelope: "CTO" },
      { id: "broker", label: "Broker", envelope: "CTO" },
    ];
    const assets = [{ id: "stock", label: "Stock" }];
    const value = emptyTxValue(accounts, assets);

    render(
      <TransactionFields
        value={value}
        onChange={() => {}}
        accounts={accounts}
        assets={assets}
      />,
    );

    expect(
      screen.queryByRole("option", { name: "Aucun compte" }),
    ).toBeNull();
    expect(value.compte).toBe("broker");
  });
});
