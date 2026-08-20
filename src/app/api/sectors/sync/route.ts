import { NextResponse } from "next/server";
import { z } from "zod";
import { loadWorkbook, replaceWorkbook } from "@/lib/excel";
import {
	applyJustEtfSectorSync,
	fetchJustEtfProfileHtml,
} from "@/lib/prices/justetf-sectors";

const SyncInput = z.object({
	assetId: z.string().min(1),
	restore: z.boolean().optional(),
});

export async function POST(request: Request) {
	const body = await request.json();
	const parsed = SyncInput.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.message }, { status: 400 });
	}

	const workbook = loadWorkbook();
	const result = await applyJustEtfSectorSync(workbook, parsed.data.assetId, {
		fetchHtml: fetchJustEtfProfileHtml,
		restore: parsed.data.restore,
	});

	if (!result.ok) {
		return NextResponse.json(
			{ error: "JustETF sector sync failed" },
			{ status: 502 },
		);
	}

	if (result.updated) {
		replaceWorkbook(result.workbook);
	}

	const allocations = (result.workbook.sectorAllocations ?? []).filter(
		(row) => row.assetId === parsed.data.assetId,
	);

	return NextResponse.json({
		ok: true,
		assetId: parsed.data.assetId,
		updated: result.updated,
		skippedManual: result.skippedManual,
		allocations,
	});
}
