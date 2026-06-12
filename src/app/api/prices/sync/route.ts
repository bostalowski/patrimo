import { NextResponse } from "next/server";
import { loadWorkbook } from "@/lib/excel";
import { syncBenchmarks, syncPrices } from "@/lib/prices/sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const assetId = new URL(request.url).searchParams.get("assetId");
  const { assets } = loadWorkbook();
  const started = Date.now();

  if (assetId) {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) {
      return NextResponse.json(
        { error: `Actif inconnu : ${assetId}` },
        { status: 404 },
      );
    }
    const results = await syncPrices([asset]);
    return NextResponse.json({
      durationMs: Date.now() - started,
      results,
      benchmarks: [],
    });
  }

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

export async function GET(request: Request) {
  return POST(request);
}
