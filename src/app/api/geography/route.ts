import { NextResponse } from "next/server";
import { z } from "zod";
import { replaceGeographicAllocation } from "@patrimo/core/geographic-allocation";
import { loadWorkbook, replaceWorkbook } from "@/lib/excel";

const ManualAllocationInput = z.object({
  assetId: z.string().min(1),
  source: z.literal("manual"),
  weights: z
    .array(
      z.object({
        country: z.string().min(1),
        weight: z.number().min(0).max(1),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ManualAllocationInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { assetId, weights } = parsed.data;
  const workbook = loadWorkbook();

  try {
    const nextWorkbook = replaceGeographicAllocation(
      workbook,
      assetId,
      weights,
      "manual",
    );
    replaceWorkbook(nextWorkbook);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid geographic allocation",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, assetId });
}
