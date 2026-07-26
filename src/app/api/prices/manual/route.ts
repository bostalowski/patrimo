import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteManualPrice,
  upsertManualPrice,
} from "@patrimo/core/manual-prices";
import { loadWorkbook, replaceWorkbook } from "@/lib/excel";
import { manualPricesToPriceStore } from "@/lib/store";

const ManualPriceInput = z.object({
  assetId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  price: z.number().positive(),
});

const DeleteInput = z.object({
  assetId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function toUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export async function GET() {
  const workbook = loadWorkbook();
  return NextResponse.json(manualPricesToPriceStore(workbook.manualPrices));
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ManualPriceInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { assetId, date, price } = parsed.data;
  const workbook = loadWorkbook();

  try {
    const nextWorkbook = upsertManualPrice(workbook, {
      assetId,
      date: toUtcDate(date),
      price,
    });
    replaceWorkbook(nextWorkbook);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid manual price" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, assetId, date, price });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = DeleteInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { assetId, date } = parsed.data;
  const workbook = loadWorkbook();
  replaceWorkbook(deleteManualPrice(workbook, assetId, toUtcDate(date)));
  return NextResponse.json({ ok: true });
}
