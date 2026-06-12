import { NextResponse } from "next/server";
import { appendTransaction, loadWorkbook } from "@/lib/excel";
import { Transaction } from "@/lib/schema";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = Transaction.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const tx = parsed.data;

  if (tx.type === "TRANSFERT" && !tx.compteDestination) {
    return NextResponse.json(
      { error: "Un transfert nécessite un compte de destination." },
      { status: 400 },
    );
  }

  const { assets, accounts } = loadWorkbook();
  if (!accounts.some((a) => a.id === tx.compte)) {
    return NextResponse.json(
      { error: `Compte inconnu : ${tx.compte}` },
      { status: 400 },
    );
  }
  if (
    tx.compteDestination &&
    !accounts.some((a) => a.id === tx.compteDestination)
  ) {
    return NextResponse.json(
      { error: `Compte de destination inconnu : ${tx.compteDestination}` },
      { status: 400 },
    );
  }
  if (!assets.some((a) => a.id === tx.actif)) {
    return NextResponse.json(
      { error: `Actif inconnu : ${tx.actif}` },
      { status: 400 },
    );
  }

  try {
    appendTransaction(tx);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
