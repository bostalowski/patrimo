import { NextResponse } from "next/server";
import {
  deleteProperty,
  loadWorkbook,
  upsertProperty,
} from "@/lib/excel";
import { Property } from "@/lib/schema";
import { uniqueId } from "@/lib/utils";

const PropertyInput = Property.omit({ id: true });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = PropertyInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { properties } = loadWorkbook();
  const id = uniqueId(
    parsed.data.label,
    properties.map((p) => p.id),
  );
  const property = { ...parsed.data, id };

  try {
    upsertProperty(property);
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
  const parsed = Property.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const property = parsed.data;

  const { properties } = loadWorkbook();
  if (!properties.some((p) => p.id === property.id)) {
    return NextResponse.json(
      { error: `Bien inconnu : ${property.id}` },
      { status: 404 },
    );
  }

  try {
    upsertProperty(property);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const id = body && typeof body.id === "string" ? body.id : null;
  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  try {
    deleteProperty(id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
