import { FoyerFiscalConfigSchema } from "@patrimo/core/schema";
import { NextResponse } from "next/server";
import { loadWorkbook, replaceWorkbook } from "@/lib/excel";

export const dynamic = "force-dynamic";

export async function GET() {
	const workbook = loadWorkbook();
	return NextResponse.json({
		foyerFiscalConfig: workbook.foyerFiscalConfig ?? null,
	});
}

export async function PUT(request: Request) {
	const body = await request.json();
	const parsed = FoyerFiscalConfigSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.message }, { status: 400 });
	}

	const workbook = loadWorkbook();
	replaceWorkbook({
		...workbook,
		foyerFiscalConfig: parsed.data,
	});

	return NextResponse.json({
		ok: true,
		foyerFiscalConfig: parsed.data,
	});
}
