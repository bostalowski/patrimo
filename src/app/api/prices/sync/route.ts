import { NextResponse } from "next/server";
import { loadWorkbook } from "@/lib/excel";
import { syncBenchmarks, syncPrices } from "@/lib/prices/sync";
import { shouldRunSync } from "@/lib/prices/schedule";
import { getSyncIntervalMinutes } from "@/lib/config";
import { readSyncMeta, writeSyncMeta } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const assetId = url.searchParams.get("assetId");
  const ifStale = url.searchParams.has("ifStale");
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

  const meta = await readSyncMeta();
  const willSync = shouldRunSync({
    ifStale,
    lastSync: meta.lastSync,
    now: Date.now(),
    intervalMinutes: getSyncIntervalMinutes(),
  });
  if (!willSync) {
    return NextResponse.json({
      skipped: true,
      lastSync: meta.lastSync,
    });
  }

  const [results, benchmarks] = await Promise.all([
    syncPrices(assets),
    syncBenchmarks(),
  ]);
  const syncedAt = new Date().toISOString();
  await writeSyncMeta({ lastSync: syncedAt });
  return NextResponse.json({
    durationMs: Date.now() - started,
    results,
    benchmarks,
    lastSync: syncedAt,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
