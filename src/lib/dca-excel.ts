import type { z } from "zod";
import { DcaConfig, DcaFrequency } from "@/lib/schema";

export { DCA_HEADERS } from "@patrimo/core/workbook-template";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toCleanString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str.length === 0 ? undefined : str;
}

function toFrequency(value: unknown): DcaFrequency {
  const parsed = DcaFrequency.safeParse(toCleanString(value)?.toUpperCase());
  return parsed.success ? parsed.data : "MENSUEL";
}

function toPaymentMonth(value: unknown): number | undefined {
  const str = toCleanString(value);
  if (str === undefined) return undefined;
  const month = Math.round(Number(str.replace(",", ".")));
  return month >= 1 && month <= 12 ? month : undefined;
}

export function dcaConfigsToRows(
  configs: DcaConfig[],
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const config of configs) {
    for (const line of config.lines) {
      rows.push({
        ID: config.id,
        "Libellé": config.label,
        Enveloppe: config.envelope,
        Montant: config.amount,
        "Fréquence": config.frequency,
        "Mois versement": config.paymentMonth ?? null,
        Panier: line.label ?? null,
        Actifs: line.assetIds.join(", "),
        "Cible %": Math.round(line.targetPct * 1000) / 10,
      });
    }
  }
  return rows;
}

export function parseDcaConfigs(
  rows: Record<string, unknown>[],
): DcaConfig[] {
  const byId = new Map<string, z.input<typeof DcaConfig>>();
  const order: string[] = [];

  for (const row of rows) {
    const id = toCleanString(row["ID"]);
    if (!id) continue;

    const assetIds = String(row["Actifs"] ?? "")
      .split(",")
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
    if (assetIds.length === 0) continue;

    const line = {
      label: toCleanString(row["Panier"]),
      assetIds,
      targetPct: toNumber(row["Cible %"]) / 100,
    };

    const existing = byId.get(id);
    if (existing) {
      existing.lines.push(line);
      continue;
    }

    byId.set(id, {
      id,
      label: toCleanString(row["Libellé"]) ?? id,
      envelope: row["Enveloppe"] as DcaConfig["envelope"],
      amount: toNumber(row["Montant"] ?? row["Montant mensuel"]),
      frequency: toFrequency(row["Fréquence"]),
      paymentMonth: toPaymentMonth(row["Mois versement"]),
      lines: [line],
    });
    order.push(id);
  }

  return order.map((id) => DcaConfig.parse(byId.get(id)));
}
