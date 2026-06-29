import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getConfiguredExcelPath,
  readConfig,
  resolveUserPath,
  writeConfig,
} from "@/lib/config";
import { clampInflationRate, MAX_INFLATION_RATE } from "@/lib/inflation";
import { clampSyncIntervalMinutes } from "@/lib/prices/schedule";
import { resetWorkbookCache, validateExcelFile } from "@/lib/excel";

export const dynamic = "force-dynamic";

const SetInput = z.object({
  excelPath: z.string().min(1).optional(),
  inflationRate: z.number().min(0).max(MAX_INFLATION_RATE).optional(),
  syncIntervalMinutes: z.number().optional(),
});

export async function GET() {
  const config = readConfig();
  const path = getConfiguredExcelPath();
  if (!path) {
    return NextResponse.json({
      excelPath: null,
      configured: false,
      valid: false,
      inflationRate: config.inflationRate,
      syncIntervalMinutes: config.syncIntervalMinutes,
    });
  }
  const status = validateExcelFile(path);
  return NextResponse.json({
    excelPath: path,
    configured: true,
    valid: status.valid,
    reason: status.valid ? undefined : status.reason,
    detail: status.valid ? undefined : status.detail,
    inflationRate: config.inflationRate,
    syncIntervalMinutes: config.syncIntervalMinutes,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = SetInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const config = readConfig();
  const nextConfig = { ...config };

  if (parsed.data.inflationRate !== undefined) {
    nextConfig.inflationRate = clampInflationRate(parsed.data.inflationRate);
  }

  if (parsed.data.syncIntervalMinutes !== undefined) {
    nextConfig.syncIntervalMinutes = clampSyncIntervalMinutes(
      parsed.data.syncIntervalMinutes,
    );
  }

  if (parsed.data.excelPath !== undefined) {
    const absolute = resolveUserPath(parsed.data.excelPath.trim());
    const status = validateExcelFile(absolute);
    if (!status.valid) {
      const message =
        status.reason === "not_found"
          ? `Fichier introuvable : ${absolute}`
          : status.reason === "missing_sheets"
            ? `Onglets manquants dans le classeur : ${status.detail}`
            : `Impossible de lire le fichier : ${status.detail ?? ""}`;
      return NextResponse.json({ error: message }, { status: 400 });
    }
    nextConfig.excelPath = absolute;
  }

  writeConfig(nextConfig);
  resetWorkbookCache();

  const finalPath = getConfiguredExcelPath();
  return NextResponse.json({
    excelPath: finalPath,
    configured: Boolean(finalPath),
    valid: finalPath ? validateExcelFile(finalPath).valid : false,
    inflationRate: nextConfig.inflationRate,
    syncIntervalMinutes: nextConfig.syncIntervalMinutes,
  });
}
