import { NextResponse } from "next/server";
import {
  commitImport,
  ExcelNotConfiguredError,
  loadWorkbook,
} from "@/lib/excel";
import {
  buildPreview,
  existingTransactionSignatures,
} from "@/lib/importers/normalize";
import { ImportRequest } from "@/lib/importers/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = ImportRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" · ") },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.action === "preview") {
      const { csv, profile } = parsed.data;
      const workbook = loadWorkbook();
      const preview = buildPreview(csv, profile, {
        existingAssets: workbook.assets,
        existingAccounts: workbook.accounts,
        existingSignatures: existingTransactionSignatures(workbook.transactions),
      });
      return NextResponse.json(preview);
    }

    const { transactions, newAssets, newAccounts } = parsed.data;
    const workbook = loadWorkbook();

    const existingAccountIds = new Set(workbook.accounts.map((a) => a.id));
    const existingAssetIds = new Set(workbook.assets.map((a) => a.id));

    const accountsToCreate = newAccounts.filter(
      (a) => !existingAccountIds.has(a.id),
    );
    const assetsToCreate = newAssets.filter(
      (a) => !existingAssetIds.has(a.id),
    );

    const knownAccountIds = new Set([
      ...existingAccountIds,
      ...accountsToCreate.map((a) => a.id),
    ]);
    const knownAssetIds = new Set([
      ...existingAssetIds,
      ...assetsToCreate.map((a) => a.id),
    ]);

    for (const tx of transactions) {
      if (!knownAccountIds.has(tx.compte)) {
        return NextResponse.json(
          { error: `Compte inconnu : ${tx.compte}` },
          { status: 400 },
        );
      }
      if (tx.compteDestination && !knownAccountIds.has(tx.compteDestination)) {
        return NextResponse.json(
          { error: `Compte de destination inconnu : ${tx.compteDestination}` },
          { status: 400 },
        );
      }
      if (!knownAssetIds.has(tx.actif)) {
        return NextResponse.json(
          { error: `Actif inconnu : ${tx.actif}` },
          { status: 400 },
        );
      }
      if (tx.type === "TRANSFERT" && !tx.compteDestination) {
        return NextResponse.json(
          { error: "Un transfert nécessite un compte de destination." },
          { status: 400 },
        );
      }
    }

    commitImport({
      newAccounts: accountsToCreate,
      newAssets: assetsToCreate,
      transactions,
    });

    return NextResponse.json({
      ok: true,
      imported: transactions.length,
      assetsCreated: assetsToCreate.length,
      accountsCreated: accountsToCreate.length,
    });
  } catch (err) {
    if (err instanceof ExcelNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 412 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
