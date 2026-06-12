import { NextResponse } from "next/server";
import { loadWorkbook, upsertAsset } from "@/lib/excel";
import { Asset } from "@/lib/schema";
import { uniqueId } from "@/lib/utils";

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
