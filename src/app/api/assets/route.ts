import { NextResponse } from "next/server";
import { z } from "zod";
import {
  loadWorkbook,
  replaceWorkbook,
  upsertAsset,
} from "@/lib/excel";
import { Asset } from "@/lib/schema";
import { uniqueId } from "@/lib/utils";
import { deleteAsset } from "@patrimo/core/deletion";
import { removeAssetsFromPriceCaches } from "@/lib/store";

const AssetInput = Asset.omit({ id: true });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = AssetInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { assets } = loadWorkbook();
  const id = uniqueId(
    parsed.data.label,
    assets.map((a) => a.id),
  );
  const asset = { ...parsed.data, id };

  try {
    upsertAsset(asset);
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
  const parsed = Asset.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const asset = parsed.data;

  const { assets } = loadWorkbook();
  if (!assets.some((a) => a.id === asset.id)) {
    return NextResponse.json(
      { error: `Actif inconnu : ${asset.id}` },
      { status: 404 },
    );
  }

  try {
    upsertAsset(asset);
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
});

export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = DeleteInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const workbook = loadWorkbook();
  if (!workbook.assets.some((asset) => asset.id === parsed.data.id)) {
    return NextResponse.json(
      { error: `Actif inconnu : ${parsed.data.id}` },
      { status: 404 },
    );
  }

  let deletedAssetIds: string[];
  try {
    const result = deleteAsset(workbook, parsed.data.id);
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
