import { describe, expect, it } from "vitest";
import type { DcaConfig } from "@/lib/schema";
import { dcaConfigsToRows, parseDcaConfigs } from "@/lib/dca-excel";

const sampleConfig: DcaConfig = {
  id: "dca-1",
  label: "PEA mensuel",
  envelope: "PEA",
  amount: 500,
  frequency: "MENSUEL",
  paymentMonth: undefined,
  lines: [
    { label: "Monde", assetIds: ["CW8", "ESE"], targetPct: 0.6 },
    { label: "Émergents", assetIds: ["PAEEM"], targetPct: 0.4 },
  ],
};

describe("dcaConfigsToRows", () => {
  it("produces one row per basket, repeating the plan-level fields", () => {
    const rows = dcaConfigsToRows([sampleConfig]);
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row["ID"]).toBe("dca-1");
      expect(row["Libellé"]).toBe("PEA mensuel");
      expect(row["Enveloppe"]).toBe("PEA");
      expect(row["Montant"]).toBe(500);
      expect(row["Fréquence"]).toBe("MENSUEL");
    }
  });

  it("joins assetIds with a comma and stores the target as a percentage", () => {
    const rows = dcaConfigsToRows([sampleConfig]);
    expect(rows[0]["Actifs"]).toBe("CW8, ESE");
    expect(rows[0]["Cible %"]).toBe(60);
    expect(rows[1]["Actifs"]).toBe("PAEEM");
    expect(rows[1]["Cible %"]).toBe(40);
  });
});

describe("parseDcaConfigs", () => {
  it("groups rows sharing the same ID into a single plan with several baskets, in order", () => {
    const configs = parseDcaConfigs([
      {
        ID: "dca-1",
        "Libellé": "PEA mensuel",
        Enveloppe: "PEA",
        "Montant mensuel": 500,
        Panier: "Monde",
        Actifs: "CW8, ESE",
        "Cible %": 60,
      },
      {
        ID: "dca-1",
        "Libellé": "PEA mensuel",
        Enveloppe: "PEA",
        "Montant mensuel": 500,
        Panier: "Émergents",
        Actifs: "PAEEM",
        "Cible %": 40,
      },
    ]);

    expect(configs).toHaveLength(1);
    expect(configs[0].lines.map((l) => l.label)).toEqual(["Monde", "Émergents"]);
  });

  it("splits comma-separated assets into a trimmed array", () => {
    const [config] = parseDcaConfigs([
      {
        ID: "dca-1",
        "Libellé": "PEA mensuel",
        Enveloppe: "PEA",
        "Montant mensuel": 500,
        Panier: "Monde",
        Actifs: "CW8 ,  ESE",
        "Cible %": 100,
      },
    ]);
    expect(config.lines[0].assetIds).toEqual(["CW8", "ESE"]);
  });

  it("converts the percentage column back to a 0..1 target", () => {
    const [config] = parseDcaConfigs([
      {
        ID: "dca-1",
        "Libellé": "PEA mensuel",
        Enveloppe: "PEA",
        "Montant mensuel": 500,
        Panier: "Monde",
        Actifs: "CW8",
        "Cible %": 60,
      },
      {
        ID: "dca-1",
        "Libellé": "PEA mensuel",
        Enveloppe: "PEA",
        "Montant mensuel": 500,
        Panier: "Émergents",
        Actifs: "PAEEM",
        "Cible %": 40,
      },
    ]);
    expect(config.lines[0].targetPct).toBeCloseTo(0.6);
    expect(config.lines[1].targetPct).toBeCloseTo(0.4);
  });

  it("returns an empty array when there are no rows", () => {
    expect(parseDcaConfigs([])).toEqual([]);
  });

  it("leaves the basket label undefined when the Panier cell is empty", () => {
    const [config] = parseDcaConfigs([
      {
        ID: "dca-1",
        "Libellé": "PEA mensuel",
        Enveloppe: "PEA",
        "Montant mensuel": 500,
        Panier: null,
        Actifs: "CW8",
        "Cible %": 100,
      },
    ]);
    expect(config.lines[0].label).toBeUndefined();
  });

  it("falls back to the legacy 'Montant mensuel' column and defaults frequency to MENSUEL", () => {
    const [config] = parseDcaConfigs([
      {
        ID: "dca-1",
        "Libellé": "PEA legacy",
        Enveloppe: "PEA",
        "Montant mensuel": 300,
        Panier: "Monde",
        Actifs: "CW8",
        "Cible %": 100,
      },
    ]);
    expect(config.amount).toBe(300);
    expect(config.frequency).toBe("MENSUEL");
    expect(config.paymentMonth).toBeUndefined();
  });

  it("parses an annual contribution with a payment month", () => {
    const [config] = parseDcaConfigs([
      {
        ID: "pee",
        "Libellé": "Dotation PEE",
        Enveloppe: "PEE",
        Montant: 3000,
        "Fréquence": "ANNUEL",
        "Mois versement": 12,
        Panier: "FCPE",
        Actifs: "FCPE1",
        "Cible %": 100,
      },
    ]);
    expect(config.amount).toBe(3000);
    expect(config.frequency).toBe("ANNUEL");
    expect(config.paymentMonth).toBe(12);
  });
});

describe("DCA Excel round-trip", () => {
  it("recovers the original configs through rows and back", () => {
    const restored = parseDcaConfigs(dcaConfigsToRows([sampleConfig]));
    expect(restored).toEqual([sampleConfig]);
  });
});
