import { normalizeEmergencyFundConfig } from "@patrimo/core/emergency-fund-config";
import { NextResponse } from "next/server";
import { z } from "zod";
import { loadWorkbook, replaceWorkbook } from "@/lib/excel";

export const dynamic = "force-dynamic";

const EmergencyFundConfigBody = z.object({
	targetMonths: z.number().positive(),
	catchUpHorizonMonths: z.number().int().min(1),
	targetAmountOverride: z.number().positive().nullable().optional(),
});

export async function PUT(request: Request) {
	const body = await request.json();
	const parsed = EmergencyFundConfigBody.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.message }, { status: 400 });
	}

	const workbook = loadWorkbook();
	const normalized = normalizeEmergencyFundConfig({
		targetMonths: parsed.data.targetMonths,
		catchUpHorizonMonths: parsed.data.catchUpHorizonMonths,
		targetAmountOverride: parsed.data.targetAmountOverride ?? undefined,
	});

	replaceWorkbook({
		...workbook,
		emergencyFundConfig: normalized,
	});

	return NextResponse.json({
		ok: true,
		emergencyFundConfig: normalized,
	});
}
