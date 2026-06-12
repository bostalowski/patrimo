import { NextResponse } from "next/server";
import { z } from "zod";
import { BudgetLine } from "@/lib/schema";
import { readBudget, writeBudget } from "@/lib/store";

const DeleteInput = z.object({
  id: z.string().min(1),
});

export async function GET() {
  const lines = await readBudget();
  return NextResponse.json({ lines });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = BudgetLine.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const line = parsed.data;
  const lines = await readBudget();
  const next = lines.filter((l) => l.id !== line.id);
  next.push(line);
  await writeBudget(next);
  return NextResponse.json({ ok: true, line });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = DeleteInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const lines = await readBudget();
  const next = lines.filter((l) => l.id !== parsed.data.id);
  await writeBudget(next);
  return NextResponse.json({ ok: true });
}
