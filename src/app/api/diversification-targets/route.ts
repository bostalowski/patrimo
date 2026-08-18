import { validateDiversificationTargets } from "@patrimo/core/diversification-targets";
import { NextResponse } from "next/server";
import { z } from "zod";
import { loadWorkbook, replaceWorkbook } from "@/lib/excel";

const DiversificationTargetsBody = z.object({
	targets: z.array(
		z.object({
			key: z.string().min(1),
			minPct: z.number(),
			maxPct: z.number(),
		}),
	),
});

export async function PUT(request: Request) {
	const body = await request.json();
	const parsed = DiversificationTargetsBody.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.message }, { status: 400 });
	}

	const validation = validateDiversificationTargets(parsed.data.targets);
	if (!validation.ok) {
		return NextResponse.json({ error: validation.reason }, { status: 400 });
	}

	const workbook = loadWorkbook();
	replaceWorkbook({
		...workbook,
		diversificationTargets: parsed.data.targets,
	});

	return NextResponse.json({ ok: true });
}
