import { validateTargetAllocations } from "@patrimo/core/target-allocation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { loadWorkbook, replaceWorkbook } from "@/lib/excel";

const TargetAllocationBody = z.object({
	categories: z
		.array(
			z.object({
				category: z.string().min(1),
				targetPct: z.number().positive().max(1),
				assetIds: z.array(z.string().min(1)).min(1),
			}),
		)
		.min(1),
});

export async function PUT(request: Request) {
	const body = await request.json();
	const parsed = TargetAllocationBody.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.message }, { status: 400 });
	}

	const workbook = loadWorkbook();
	const validation = validateTargetAllocations(
		parsed.data.categories,
		workbook.assets,
	);
	if (!validation.ok) {
		return NextResponse.json({ error: validation.reason }, { status: 400 });
	}

	replaceWorkbook({
		...workbook,
		targetAllocations: parsed.data.categories,
	});

	return NextResponse.json({ ok: true });
}
