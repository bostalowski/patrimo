import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getConfiguredExcelPath,
  readConfig,
  resolveUserPath,
  writeConfig,
} from "@/lib/config";
import { resetWorkbookCache, validateExcelFile } from "@/lib/excel";

export const dynamic = "force-dynamic";

const SetInput = z.object({
  excelPath: z.string().min(1),
});

export async function GET() {
  const path = getConfiguredExcelPath();
  if (!path) {
    return NextResponse.json({
      excelPath: null,
      configured: false,
      valid: false,
    });
  }
  const status = validateExcelFile(path);
  return NextResponse.json({
    excelPath: path,
    configured: true,
    valid: status.valid,
    reason: status.valid ? undefined : status.reason,
    detail: status.valid ? undefined : status.detail,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = SetInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

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

  const config = readConfig();
  writeConfig({ ...config, excelPath: absolute });
  resetWorkbookCache();

  return NextResponse.json({ excelPath: absolute, configured: true, valid: true });
}
