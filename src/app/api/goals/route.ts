import { validateFinancialGoals } from "@patrimo/core/financial-goals";
import { FinancialGoal } from "@patrimo/core/schema";
import { NextResponse } from "next/server";
import { z } from "zod";
import { loadWorkbook, replaceWorkbook } from "@/lib/excel";

const GoalsBody = z.object({
	goals: z.array(FinancialGoal),
});

export async function PUT(request: Request) {
	const body = await request.json();
	const parsed = GoalsBody.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.message }, { status: 400 });
	}

	const validation = validateFinancialGoals(parsed.data.goals);
	if (!validation.ok) {
		return NextResponse.json({ error: validation.reason }, { status: 400 });
	}

	const workbook = loadWorkbook();
	replaceWorkbook({
		...workbook,
		financialGoals: parsed.data.goals,
	});

	return NextResponse.json({ ok: true });
}
