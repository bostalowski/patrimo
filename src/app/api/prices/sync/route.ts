import { NextResponse } from "next/server";
import { loadWorkbook } from "@/lib/excel";
import { syncPrices } from "@/lib/prices/sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const { assets } = loadWorkbook();
  const started = Date.now();
  const results = await syncPrices(assets);
  return NextResponse.json({
    durationMs: Date.now() - started,
    results,
  });
}

export async function GET() {
  return POST();
}
