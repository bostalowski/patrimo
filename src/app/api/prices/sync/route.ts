import { NextResponse } from "next/server";
import { loadWorkbook } from "@/lib/excel";
import { syncBenchmarks, syncPrices } from "@/lib/prices/sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const { assets } = loadWorkbook();
  const started = Date.now();
  const [results, benchmarks] = await Promise.all([
    syncPrices(assets),
    syncBenchmarks(),
  ]);
  return NextResponse.json({
    durationMs: Date.now() - started,
    results,
    benchmarks,
  });
}

export async function GET() {
  return POST();
}
