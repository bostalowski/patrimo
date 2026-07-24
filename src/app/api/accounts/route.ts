import { NextResponse } from "next/server";
import { z } from "zod";
import {
  loadWorkbook,
  replaceWorkbook,
  upsertAccount,
} from "@/lib/excel";
import { Account } from "@/lib/schema";
import { uniqueId } from "@/lib/utils";
import { deleteAccount } from "@patrimo/core/deletion";
import { removeAssetsFromPriceCaches } from "@/lib/store";

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

const DeleteInput = z.object({
  id: z.string().min(1),
  mode: z.enum(["cascade", "detach"]),
});

export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = DeleteInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const workbook = loadWorkbook();
  if (!workbook.accounts.some((account) => account.id === parsed.data.id)) {
    return NextResponse.json(
      { error: `Compte inconnu : ${parsed.data.id}` },
      { status: 404 },
    );
  }

  let deletedAssetIds: string[];
  try {
    const result = deleteAccount(
      workbook,
      parsed.data.id,
      parsed.data.mode,
    );
    replaceWorkbook(result.workbook);
    deletedAssetIds = result.deletedAssetIds;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }

  let cacheCleanupPending = false;
  try {
    await removeAssetsFromPriceCaches(deletedAssetIds);
  } catch {
    cacheCleanupPending = true;
  }

  return NextResponse.json({
    ok: true,
    deletedAssetIds,
    ...(cacheCleanupPending ? { cacheCleanupPending: true } : {}),
  });
}
