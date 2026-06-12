import { NextResponse } from "next/server";
import { loadWorkbook, upsertAccount } from "@/lib/excel";
import { Account } from "@/lib/schema";
import { uniqueId } from "@/lib/utils";

const AccountInput = Account.omit({ id: true });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = AccountInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { accounts } = loadWorkbook();
  const id = uniqueId(
    parsed.data.label,
    accounts.map((a) => a.id),
  );
  const account = { ...parsed.data, id };

  try {
    upsertAccount(account);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = Account.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const account = parsed.data;

  const { accounts } = loadWorkbook();
  if (!accounts.some((a) => a.id === account.id)) {
    return NextResponse.json(
      { error: `Compte inconnu : ${account.id}` },
      { status: 404 },
    );
  }

  try {
    upsertAccount(account);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
