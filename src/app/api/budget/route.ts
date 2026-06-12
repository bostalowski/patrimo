import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteBudgetLine, getBudget, upsertBudgetLine } from "@/lib/excel";
import { BudgetLine } from "@/lib/schema";

const DeleteInput = z.object({
  id: z.string().min(1),
});

export async function GET() {
  const lines = getBudget();
  return NextResponse.json({ lines });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = BudgetLine.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    upsertBudgetLine(parsed.data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, line: parsed.data });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = DeleteInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    deleteBudgetLine(parsed.data.id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
