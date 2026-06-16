import { NextResponse } from "next/server";
import { RetirementProfile } from "@/lib/schema";
import { readRetirementProfile, writeRetirementProfile } from "@/lib/store";

export async function GET() {
  const profile = await readRetirementProfile();
  return NextResponse.json(profile);
}

export async function POST(request: Request) {
  const body = await request.json();
  const current = await readRetirementProfile();
  const merged = { ...current, ...body };
  const parsed = RetirementProfile.safeParse(merged);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  await writeRetirementProfile(parsed.data);
  return NextResponse.json(parsed.data);
}
