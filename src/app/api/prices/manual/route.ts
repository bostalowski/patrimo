import { NextResponse } from "next/server";
import { z } from "zod";
import { readManualPrices, writeManualPrices } from "@/lib/store";

const ManualPriceInput = z.object({
  assetId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  price: z.number().positive(),
});

const DeleteInput = z.object({
  assetId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET() {
  const store = await readManualPrices();
  return NextResponse.json(store);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ManualPriceInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { assetId, date, price } = parsed.data;
  const store = await readManualPrices();
  store[assetId] = { ...(store[assetId] ?? {}), [date]: price };
  await writeManualPrices(store);
  return NextResponse.json({ ok: true, assetId, date, price });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = DeleteInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { assetId, date } = parsed.data;
  const store = await readManualPrices();
  if (store[assetId]) {
    delete store[assetId][date];
    if (Object.keys(store[assetId]).length === 0) {
      delete store[assetId];
    }
  }
  await writeManualPrices(store);
  return NextResponse.json({ ok: true });
}
