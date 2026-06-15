import { NextResponse } from "next/server";
import { z } from "zod";
import { readConfig, resolveUserPath, writeConfig } from "@/lib/config";
import { createEmptyWorkbook, resetWorkbookCache } from "@/lib/excel";

export const dynamic = "force-dynamic";

const CreateInput = z.object({
  excelPath: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = CreateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const target = resolveUserPath(parsed.data.excelPath.trim());

  let absolute: string;
  try {
    absolute = createEmptyWorkbook(target);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const config = readConfig();
  writeConfig({ ...config, excelPath: absolute });
  resetWorkbookCache();

  return NextResponse.json({
    excelPath: absolute,
    configured: true,
    valid: true,
    inflationRate: config.inflationRate,
  });
}
