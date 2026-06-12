import { NextResponse } from "next/server";
import { z } from "zod";
import {
  appendTransaction,
  deleteTransactionAt,
  loadWorkbook,
  updateTransactionAt,
} from "@/lib/excel";
import { Transaction } from "@/lib/schema";

function validateReferences(tx: Transaction): string | null {
  if (tx.type === "TRANSFERT" && !tx.compteDestination) {
    return "Un transfert nécessite un compte de destination.";
  }

  const { assets, accounts } = loadWorkbook();
  if (!accounts.some((a) => a.id === tx.compte)) {
    return `Compte inconnu : ${tx.compte}`;
  }
  if (tx.compteDestination && !accounts.some((a) => a.id === tx.compteDestination)) {
    return `Compte de destination inconnu : ${tx.compteDestination}`;
  }
  if (!assets.some((a) => a.id === tx.actif)) {
    return `Actif inconnu : ${tx.actif}`;
  }
  return null;
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = Transaction.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const tx = parsed.data;

  const referenceError = validateReferences(tx);
  if (referenceError) {
    return NextResponse.json({ error: referenceError }, { status: 400 });
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

const UpdateInput = z.object({
  row: z.number().int().nonnegative(),
  transaction: Transaction,
});

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = UpdateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { row, transaction } = parsed.data;

  const referenceError = validateReferences(transaction);
  if (referenceError) {
    return NextResponse.json({ error: referenceError }, { status: 400 });
  }

  try {
    updateTransactionAt(row, transaction);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

const DeleteInput = z.object({
  row: z.number().int().nonnegative(),
});

export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = DeleteInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    deleteTransactionAt(parsed.data.row);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
