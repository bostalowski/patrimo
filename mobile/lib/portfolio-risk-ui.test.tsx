import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { PortfolioConcentration } from "@patrimo/core/portfolio-risk";
import { colors } from "./theme";

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));

import { ConcentrationSummary } from "./concentration-summary";
import { RiskBadges } from "./risk-badges";

function concentration(
  overrides: Partial<PortfolioConcentration> = {},
): PortfolioConcentration {
  return {
    top1Label: "CW8",
    top1Weight: 0.42,
    top3Weight: 0.71,
    status: "balanced",
    ...overrides,
  };
}

function render(component: React.ReactElement): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(component);
  });
  expect(renderer).toBeDefined();
  return renderer as ReactTestRenderer;
}

function visibleText(renderer: ReactTestRenderer): string {
  return renderer.root
    .findAll((node) => node.type === "Text")
    .flatMap((node) => node.children)
    .filter((child): child is string => typeof child === "string")
    .join(" ");
}

describe("mobile ConcentrationSummary", () => {
  it("shows concentration text block with largest line and status on the Dashboard", () => {
    const text = visibleText(
      render(
        <ConcentrationSummary
          concentration={concentration()}
          theme={colors.light}
        />,
      ),
    );

    expect(text).toContain("CW8");
    expect(text).toMatch(/42/);
    expect(text).toContain("Équilibré");
  });

  it("hides concentration when concentration is null", () => {
    const renderer = render(
      <ConcentrationSummary concentration={null} theme={colors.light} />,
    );
    expect(renderer.toJSON()).toBeNull();
  });
});

describe("mobile RiskBadges", () => {
  it("shows readable risk strip when history metrics resolve", () => {
    const text = visibleText(
      render(
        <RiskBadges
          volatility={0.12}
          sharpe={0.85}
          drawdown={-0.18}
          theme={colors.light}
        />,
      ),
    );

    expect(text).toContain("Oscillations");
    expect(text).toContain("Rendement / risque");
    expect(text).toContain("Pire chute");
    expect(text).toMatch(/normales/i);
    expect(text).toMatch(/correct/i);
    expect(text).toMatch(/marquée/i);
    expect(text).toMatch(/confortable/i);
  });

  it("shows em dash on risk strip when volatility or sharpe is null", () => {
    const text = visibleText(
      render(
        <RiskBadges
          volatility={null}
          sharpe={null}
          drawdown={-0.05}
          theme={colors.light}
        />,
      ),
    );

    expect(text).toContain("—");
    expect(text).not.toMatch(/faibles|normales|élevées/i);
    expect(text).not.toMatch(/\bbon\b|\bcorrect\b|\bfaible\b/i);
    expect(text).toMatch(/légère/i);
  });
});
