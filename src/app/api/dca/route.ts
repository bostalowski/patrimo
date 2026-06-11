import { NextResponse } from "next/server";
import { z } from "zod";
import { DcaConfig } from "@/lib/schema";
import { readDcaConfigs, writeDcaConfigs } from "@/lib/store";

const TARGET_SUM_TOLERANCE = 0.001;

const DeleteInput = z.object({
  id: z.string().min(1),
});

export async function GET() {
  const configs = await readDcaConfigs();
  return NextResponse.json({ configs });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = DcaConfig.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const config = parsed.data;
  const targetSum = config.lines.reduce((s, l) => s + l.targetPct, 0);
  if (Math.abs(targetSum - 1) > TARGET_SUM_TOLERANCE) {
    return NextResponse.json(
      { error: `Sum of target percentages must equal 1 (got ${targetSum.toFixed(4)}).` },
      { status: 400 },
    );
  }

  const seenAssets = new Set<string>();
  for (const line of config.lines) {
    for (const assetId of line.assetIds) {
      if (seenAssets.has(assetId)) {
        return NextResponse.json(
          { error: `Asset ${assetId} appears in multiple baskets.` },
          { status: 400 },
        );
      }
      seenAssets.add(assetId);
    }
  }

  const configs = await readDcaConfigs();
  const next = configs.filter((c) => c.id !== config.id);
  next.push(config);
  await writeDcaConfigs(next);
  return NextResponse.json({ ok: true, config });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = DeleteInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const configs = await readDcaConfigs();
  const next = configs.filter((c) => c.id !== parsed.data.id);
  await writeDcaConfigs(next);
  return NextResponse.json({ ok: true });
}
