import { NextResponse } from "next/server";
import { z } from "zod";
import {
	deletePropertyTax,
	upsertPropertyTax,
} from "@patrimo/core/property-taxes";
import { loadWorkbook, replaceWorkbook } from "@/lib/excel";

const PropertyTaxInput = z.object({
	propertyId: z.string().min(1),
	year: z.number().int(),
	amount: z.number().nonnegative(),
});

const DeleteInput = z.object({
	propertyId: z.string().min(1),
	year: z.number().int(),
});

export async function POST(request: Request) {
	const body = await request.json();
	const parsed = PropertyTaxInput.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.message }, { status: 400 });
	}
	const { propertyId, year, amount } = parsed.data;
	const workbook = loadWorkbook();

	try {
		const nextWorkbook = upsertPropertyTax(workbook, {
			propertyId,
			year,
			amount,
		});
		replaceWorkbook(nextWorkbook);
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Invalid property tax",
			},
			{ status: 400 },
		);
	}

	return NextResponse.json({ ok: true, propertyId, year, amount });
}

export async function DELETE(request: Request) {
	const body = await request.json();
	const parsed = DeleteInput.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.message }, { status: 400 });
	}
	const { propertyId, year } = parsed.data;
	const workbook = loadWorkbook();
	replaceWorkbook(deletePropertyTax(workbook, propertyId, year));
	return NextResponse.json({ ok: true });
}
