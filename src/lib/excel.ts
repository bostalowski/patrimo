import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import {
	normalizeGeographicAllocations,
	weightFromExcelPercentCell,
} from "@patrimo/core/geographic-allocation";
import { normalizeSectorAllocations } from "@patrimo/core/sector-allocation";
import { normalizeManualPrices } from "@patrimo/core/manual-prices";
import { normalizePropertyTaxes } from "@patrimo/core/property-taxes";
import {
	filterPaliersForProperty,
	normalizeLoanInsurancePaliers,
} from "@patrimo/core/realestate/insurance";
import type {
	DiversificationTarget,
	EmergencyFundConfig,
	FinancialGoal,
	GeographicAllocation,
	LoanInsurancePalier,
	SectorAllocation,
} from "@patrimo/core/schema";
import { ModeAssurance } from "@patrimo/core/schema";
import { diversificationPctFromExcel, normalizeDiversificationTargets } from "@patrimo/core/diversification-targets";
import {
	DEFAULT_EMERGENCY_FUND_CATCH_UP_HORIZON_MONTHS,
	DEFAULT_EMERGENCY_FUND_TARGET_MONTHS,
} from "@patrimo/core/emergency-fund-config";
import { normalizeFinancialGoals } from "@patrimo/core/financial-goals";
import {
	ALL_SHEETS,
	ASSURANCE_EMPRUNT_HEADERS,
	CIBLES_DIVERSIFICATION_HEADERS,
	OBJECTIFS_HEADERS,
	BUDGET_HEADERS,
	DCA_HEADERS,
	EXPOSITION_GEO_HEADERS,
	EXPOSITION_SECTEUR_HEADERS,
	FONDS_URGENCE_HEADERS,
	IMMOBILIER_HEADERS,
	PRIX_MANUELS_HEADERS,
	SHEET_ACTIFS,
	SHEET_ALLOCATION_CIBLE,
	SHEET_ASSURANCE_EMPRUNT,
	SHEET_BUDGET,
	SHEET_CIBLES_DIVERSIFICATION,
	SHEET_COMPTES,
	SHEET_DCA,
	SHEET_EXPOSITION_GEO,
	SHEET_EXPOSITION_SECTEUR,
	SHEET_FONDS_URGENCE,
	SHEET_IMMOBILIER,
	SHEET_OBJECTIFS,
	SHEET_PRIX_MANUELS,
	SHEET_TAXE_FONCIERE,
	SHEET_TRANSACTIONS,
	TAXE_FONCIERE_HEADERS,
} from "@patrimo/core/workbook-template";
import * as XLSX from "xlsx";
import type { ZodError } from "zod";
import { getConfiguredExcelPath, resolveUserPath } from "@/lib/config";
import { dcaConfigsToRows, parseDcaConfigs } from "@/lib/dca-excel";
import {
	Account,
	Asset,
	BudgetLine,
	type DcaConfig,
	type ManualPrice,
	Property,
	type PropertyTax,
	Transaction,
	type Workbook,
} from "@/lib/schema";

const REQUIRED_SHEETS = [SHEET_TRANSACTIONS, SHEET_ACTIFS, SHEET_COMPTES];

export class ExcelNotConfiguredError extends Error {
	constructor() {
		super(
			"Aucun fichier Excel n'est configuré. Va dans Réglages pour en choisir un ou en créer un.",
		);
		this.name = "ExcelNotConfiguredError";
	}
}

function getExcelPath(): string {
	const configured = getConfiguredExcelPath();
	if (!configured) throw new ExcelNotConfiguredError();
	return configured;
}

export function isExcelConfigured(): boolean {
	return getConfiguredExcelPath() !== null;
}

export type ExcelFileStatus =
	| { valid: true }
	| {
			valid: false;
			reason: "not_found" | "missing_sheets" | "read_error" | "parse_error";
			detail?: string;
	  };

export function validateExcelFile(path: string): ExcelFileStatus {
	if (!existsSync(path)) return { valid: false, reason: "not_found" };

	let wb: XLSX.WorkBook;
	try {
		const fileBuffer = readFileSync(path);
		wb = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
	} catch (err) {
		return {
			valid: false,
			reason: "read_error",
			detail: err instanceof Error ? err.message : String(err),
		};
	}

	const missing = REQUIRED_SHEETS.filter((name) => !wb.Sheets[name]);
	if (missing.length > 0) {
		return {
			valid: false,
			reason: "missing_sheets",
			detail: missing.join(", "),
		};
	}

	try {
		buildWorkbookFromXlsx(wb);
	} catch (err) {
		return {
			valid: false,
			reason: "parse_error",
			detail: err instanceof Error ? err.message : String(err),
		};
	}

	return { valid: true };
}

export function createEmptyWorkbook(rawPath: string): string {
	const absolute = resolveUserPath(rawPath);
	if (existsSync(absolute)) {
		throw new Error(`Un fichier existe déjà à ${absolute}.`);
	}
	mkdirSync(dirname(absolute), { recursive: true });

	const wb = XLSX.utils.book_new();
	for (const sheet of ALL_SHEETS) {
		XLSX.utils.book_append_sheet(
			wb,
			XLSX.utils.aoa_to_sheet([[...sheet.headers]]),
			sheet.name,
		);
	}

	const out = XLSX.write(wb, {
		type: "buffer",
		bookType: "xlsx",
		cellDates: true,
	}) as Buffer;
	writeFileSync(absolute, out);
	return absolute;
}

export function resetWorkbookCache(): void {
	cache = null;
}

function readSheet(
	workbook: XLSX.WorkBook,
	sheetName: string,
): Record<string, unknown>[] {
	const sheet = workbook.Sheets[sheetName];
	if (!sheet) {
		throw new Error(`Missing sheet "${sheetName}" in workbook.`);
	}
	return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
		raw: true,
		defval: null,
	});
}

function readSheetOptional(
	workbook: XLSX.WorkBook,
	sheetName: string,
): Record<string, unknown>[] {
	const sheet = workbook.Sheets[sheetName];
	if (!sheet) return [];
	return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
		raw: true,
		defval: null,
	});
}

export type LoadedTransaction = { transaction: Transaction; row: number };

function aoaRowToObject(
	headers: string[],
	row: unknown[],
): Record<string, unknown> {
	const obj: Record<string, unknown> = {};
	headers.forEach((header, i) => {
		obj[header] = row[i] ?? null;
	});
	return obj;
}

function readTransactionRowsFromSheet(workbook: XLSX.WorkBook): {
	headers: string[];
	dataRows: unknown[][];
} {
	const sheet = workbook.Sheets[SHEET_TRANSACTIONS];
	if (!sheet) {
		throw new Error(`Missing sheet "${SHEET_TRANSACTIONS}" in workbook.`);
	}
	const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
		header: 1,
		defval: null,
		blankrows: false,
	});
	const headers = (aoa[0] ?? []) as string[];
	if (headers.length === 0) {
		throw new Error(`Sheet "${SHEET_TRANSACTIONS}" has no header row.`);
	}
	return { headers, dataRows: aoa.slice(1) as unknown[][] };
}

function describeZodError(error: ZodError): string {
	return error.issues
		.map((issue) => {
			const field = issue.path.join(" → ") || "valeur";
			return `champ « ${field} » : ${issue.message}`;
		})
		.join(" ; ");
}

function rowError(sheet: string, rowNumber: number, err: unknown): Error {
	const base = err instanceof Error ? err.message : String(err);
	return new Error(`Onglet « ${sheet} », ligne ${rowNumber} : ${base}`);
}

function parseTransactions(rows: Record<string, unknown>[]): Transaction[] {
	return rows.map((row, i) => {
		try {
			const parsed = Transaction.safeParse({
				date: coerceDate(row["Date"]),
				type: row["Type"],
				compte: row["Compte"],
				compteDestination: emptyToUndefined(row["Compte destination"]),
				actif: emptyToUndefined(row["Actif"]) ?? "",
				quantite: toNumber(row["Quantité"]) ?? 0,
				prixUnitaire: toNumber(row["Prix unitaire"]),
				devise: (row["Devise"] as string) ?? "EUR",
				frais: toNumber(row["Frais"]) ?? 0,
				fraisDevise: (row["Frais devise"] as string) ?? "EUR",
				notes: emptyToUndefined(row["Notes"]),
			});
			if (!parsed.success) throw new Error(describeZodError(parsed.error));
			return parsed.data;
		} catch (err) {
			throw rowError(SHEET_TRANSACTIONS, i + 2, err);
		}
	});
}

function parseAssets(rows: Record<string, unknown>[]): Asset[] {
	return rows.map((row, i) => {
		try {
			const parsed = Asset.safeParse({
				id: row["ID"],
				label: row["Libellé"],
				type: row["Type"],
				isin: emptyToUndefined(row["ISIN"]),
				ticker: emptyToUndefined(row["Ticker"]),
				source: row["Source prix"],
				param: emptyToUndefined(row["Param source"]),
				currency: (row["Devise"] as string) ?? "EUR",
				ter: toNumber(row["TER"]) ?? undefined,
			});
			if (!parsed.success) throw new Error(describeZodError(parsed.error));
			return parsed.data;
		} catch (err) {
			throw rowError(SHEET_ACTIFS, i + 2, err);
		}
	});
}

function parseAccounts(rows: Record<string, unknown>[]): Account[] {
	return rows.map((row, i) => {
		try {
			const rawOpenDate = row["Date d'ouverture"];
			const parsed = Account.safeParse({
				id: row["ID"],
				label: row["Libellé"],
				type: row["Type"],
				envelope: row["Enveloppe"],
				openDate:
					rawOpenDate === null ||
					rawOpenDate === undefined ||
					rawOpenDate === ""
						? undefined
						: coerceDate(rawOpenDate),
				rate: toNumber(row["Taux"]) ?? undefined,
				plafond: toNumber(row["Plafond"]) ?? undefined,
			});
			if (!parsed.success) throw new Error(describeZodError(parsed.error));
			return parsed.data;
		} catch (err) {
			throw rowError(SHEET_COMPTES, i + 2, err);
		}
	});
}

function parseBudget(rows: Record<string, unknown>[]): BudgetLine[] {
	return rows
		.filter((row) => emptyToUndefined(row["ID"]) !== undefined)
		.map((row, i) => {
			try {
				const parsed = BudgetLine.safeParse({
					id: row["ID"],
					label: row["Libellé"],
					kind: row["Type"],
					amount: toNumber(row["Montant"]) ?? 0,
					frequency: row["Fréquence"],
					category: row["Catégorie"],
					notes: emptyToUndefined(row["Notes"]),
				});
				if (!parsed.success) throw new Error(describeZodError(parsed.error));
				return parsed.data;
			} catch (err) {
				throw rowError(SHEET_BUDGET, i + 2, err);
			}
		});
}

function parseModeAssurance(value: unknown): string {
	const raw = emptyToUndefined(value);
	if (!raw) return "CRD";
	const parsed = ModeAssurance.safeParse(String(raw).trim());
	return parsed.success ? parsed.data : "CRD";
}

function parseLoanInsurancePaliers(
	rows: Record<string, unknown>[],
): LoanInsurancePalier[] {
	const raw: LoanInsurancePalier[] = [];
	for (const row of rows) {
		const propertyId = emptyToUndefined(row["Bien"]);
		if (!propertyId) continue;
		raw.push({
			propertyId: String(propertyId),
			anneeDebut: toNumber(row["Année début"]) ?? Number.NaN,
			assuranceMensuelle: toNumber(row["Assurance mensuelle (€)"]) ?? Number.NaN,
		});
	}
	return normalizeLoanInsurancePaliers(raw);
}

function hydratePropertyPaliers(
	properties: Property[],
	paliers: LoanInsurancePalier[],
): Property[] {
	return properties.map((property) => ({
		...property,
		assurancePaliers: filterPaliersForProperty(paliers, property.id),
	}));
}

function parsePropertyTaxes(
	rows: Record<string, unknown>[],
	properties: Property[],
): PropertyTax[] {
	const raw: PropertyTax[] = [];
	for (const row of rows) {
		const propertyId = emptyToUndefined(row["Bien"]);
		if (!propertyId) continue;
		raw.push({
			propertyId,
			year: toNumber(row["Année"]) ?? Number.NaN,
			amount: toNumber(row["Montant"]) ?? Number.NaN,
		});
	}
	return normalizePropertyTaxes(raw, properties);
}

function parseProperties(rows: Record<string, unknown>[]): Property[] {
	return rows
		.filter((row) => emptyToUndefined(row["ID"]) !== undefined)
		.map((row, i) => {
			try {
				const rawAcquisition = row["Date acquisition"];
				const rawDebutCredit = row["Date début crédit"];
				const parsed = Property.safeParse({
					id: row["ID"],
					label: row["Libellé"],
					detention: emptyToUndefined(row["Détention"]) ?? "SCI",
					regime: row["Régime"],
					partDetenue: toNumber(row["Part détenue"]) ?? 1,
					dateAcquisition: optionalDate(rawAcquisition),
					prixAchat: toNumber(row["Prix achat"]) ?? 0,
					fraisNotaire: toNumber(row["Frais notaire"]) ?? 0,
					travaux: toNumber(row["Travaux"]) ?? 0,
					valeurActuelle: toNumber(row["Valeur actuelle"]) ?? 0,
					revaloAnnuelle: toNumber(row["Revalo annuelle"]) ?? 0,
					montantEmprunte: toNumber(row["Montant emprunté"]) ?? 0,
					tauxCredit: toNumber(row["Taux crédit"]) ?? 0,
					dureeMois: toNumber(row["Durée (mois)"]) ?? 0,
					dateDebutCredit: optionalDate(rawDebutCredit),
					tauxAssurance: toNumber(row["Taux assurance"]) ?? 0,
					modeAssurance: parseModeAssurance(row["Mode assurance"]),
					assuranceMensuelle: toNumber(row["Assurance mensuelle (€)"]) ?? 0,
					loyerMensuelHC: toNumber(row["Loyer mensuel HC"]) ?? 0,
					chargesNonRecupAnnuelles: toNumber(row["Charges non récup"]) ?? 0,
					taxeFonciere: toNumber(row["Taxe foncière"]) ?? 0,
					vacancePct: toNumber(row["Vacance"]) ?? 0,
					fraisGestionPct: toNumber(row["Frais gestion"]) ?? 0,
					tmiAssocie: toNumber(row["TMI associé"]) ?? 0.3,
					partAmortissable: toNumber(row["Part amortissable"]) ?? 0.85,
					dureeAmortissement: toNumber(row["Durée amortissement"]) ?? 30,
					notes: emptyToUndefined(row["Notes"]),
				});
				if (!parsed.success) throw new Error(describeZodError(parsed.error));
				return parsed.data;
			} catch (err) {
				throw rowError(SHEET_IMMOBILIER, i + 2, err);
			}
		});
}

function optionalDate(value: unknown): Date | string | undefined {
	if (value === null || value === undefined || value === "") return undefined;
	return coerceDate(value);
}

function coerceDate(value: unknown): Date | string {
	if (value instanceof Date) return value;
	if (typeof value === "number") {
		const date = XLSX.SSF.parse_date_code(value);
		if (!date) throw new Error(`Cannot parse Excel date: ${value}`);
		return new Date(Date.UTC(date.y, date.m - 1, date.d));
	}
	if (typeof value === "string") return value;
	throw new Error(`Cannot coerce date from value: ${value}`);
}

function parseManualPriceDate(value: unknown): Date {
	if (value instanceof Date) return value;
	if (typeof value === "number") {
		const date = XLSX.SSF.parse_date_code(value);
		if (!date) return new Date(Number.NaN);
		return new Date(Date.UTC(date.y, date.m - 1, date.d));
	}
	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = new Date(value);
		return Number.isFinite(parsed.getTime()) ? parsed : new Date(Number.NaN);
	}
	return new Date(Number.NaN);
}

function parseManualPrices(
	rows: Record<string, unknown>[],
	assets: Asset[],
): ManualPrice[] {
	const raw: ManualPrice[] = [];
	for (const row of rows) {
		const assetId = emptyToUndefined(row["Actif"]);
		if (!assetId) continue;
		raw.push({
			assetId,
			date: parseManualPriceDate(row["Date"]),
			price: toNumber(row["Prix"]) ?? Number.NaN,
		});
	}
	return normalizeManualPrices(raw, assets);
}

function parseGeographicAllocations(
	rows: Record<string, unknown>[],
	assets: Asset[],
): GeographicAllocation[] {
	type RawRow = {
		assetId: string;
		country: string;
		source: GeographicAllocation["source"];
		rawWeight: number;
	};
	const pending: RawRow[] = [];
	const rawByAsset = new Map<string, number[]>();

	for (const row of rows) {
		const assetId = emptyToUndefined(row["Actif"]);
		const country = emptyToUndefined(row["Pays"]);
		const sourceRaw = emptyToUndefined(row["Source"]);
		if (!assetId || !country || !sourceRaw) continue;
		if (sourceRaw !== "justetf" && sourceRaw !== "manual") continue;
		const rawWeight = toNumber(row["Poids %"]);
		if (rawWeight === null) continue;
		pending.push({ assetId, country, source: sourceRaw, rawWeight });
		const bucket = rawByAsset.get(assetId) ?? [];
		bucket.push(rawWeight);
		rawByAsset.set(assetId, bucket);
	}

	const raw: GeographicAllocation[] = pending.map((row) => ({
		assetId: row.assetId,
		country: row.country,
		weight: weightFromExcelPercentCell(
			row.rawWeight,
			rawByAsset.get(row.assetId) ?? [row.rawWeight],
		),
		source: row.source,
	}));
	return normalizeGeographicAllocations(raw, assets);
}

function parseSectorAllocations(
	rows: Record<string, unknown>[],
	assets: Asset[],
): SectorAllocation[] {
	type RawRow = {
		assetId: string;
		sector: string;
		source: SectorAllocation["source"];
		rawWeight: number;
	};
	const pending: RawRow[] = [];
	const rawByAsset = new Map<string, number[]>();

	for (const row of rows) {
		const assetId = emptyToUndefined(row["Actif"]);
		const sector = emptyToUndefined(row["Secteur"]);
		const sourceRaw = emptyToUndefined(row["Source"]);
		if (!assetId || !sector || !sourceRaw) continue;
		if (sourceRaw !== "justetf" && sourceRaw !== "manual") continue;
		const rawWeight = toNumber(row["Poids %"]);
		if (rawWeight === null) continue;
		pending.push({ assetId, sector, source: sourceRaw, rawWeight });
		const bucket = rawByAsset.get(assetId) ?? [];
		bucket.push(rawWeight);
		rawByAsset.set(assetId, bucket);
	}

	const raw: SectorAllocation[] = pending.map((row) => ({
		assetId: row.assetId,
		sector: row.sector,
		weight: weightFromExcelPercentCell(
			row.rawWeight,
			rawByAsset.get(row.assetId) ?? [row.rawWeight],
		),
		source: row.source,
	}));
	return normalizeSectorAllocations(raw, assets);
}

function parseDiversificationTargets(
	rows: Record<string, unknown>[],
): DiversificationTarget[] {
	const allRawMin: number[] = [];
	const allRawMax: number[] = [];
	for (const row of rows) {
		const rawMin = toNumber(row["Min %"]);
		const rawMax = toNumber(row["Max %"]);
		if (rawMin !== null) allRawMin.push(rawMin);
		if (rawMax !== null) allRawMax.push(rawMax);
	}

	const pending: DiversificationTarget[] = [];
	for (const row of rows) {
		const key = emptyToUndefined(row["Dimension"]);
		if (!key) continue;
		const rawMin = toNumber(row["Min %"]);
		const rawMax = toNumber(row["Max %"]);
		if (rawMin === null || rawMax === null) continue;
		pending.push({
			key,
			minPct: diversificationPctFromExcel(rawMin, allRawMin),
			maxPct: diversificationPctFromExcel(rawMax, allRawMax),
		});
	}
	return normalizeDiversificationTargets(pending);
}

function parsePublicPensionLink(
	raw: unknown,
): FinancialGoal["publicPensionLink"] {
	const value = emptyToUndefined(raw);
	if (!value || value === "Aucune") return "NONE";
	if (
		value === "LEGAL_AGE" ||
		value === "FULL_RATE" ||
		value === "AUTOMATIC_FULL_RATE" ||
		value === "NONE"
	) {
		return value;
	}
	return "NONE";
}

function formatPublicPensionLink(
	link: FinancialGoal["publicPensionLink"] | undefined,
): string | null {
	if (!link || link === "NONE") return "Aucune";
	return link;
}

function parseFinancialGoals(rows: Record<string, unknown>[]): FinancialGoal[] {
	const pending: FinancialGoal[] = [];
	for (const row of rows) {
		const id = emptyToUndefined(row["ID"]);
		const label = emptyToUndefined(row["Libellé"]);
		const type = emptyToUndefined(row["Type"]);
		if (!id || !label || !type) continue;
		const targetAmount = toNumber(row["Montant cible"]);
		if (targetAmount === null) continue;
		const targetAgeRaw = toNumber(row["Âge cible"]);
		const targetDateRaw = optionalDate(row["Date cible"]);
		let targetDate: Date | undefined;
		if (targetDateRaw instanceof Date) {
			targetDate = targetDateRaw;
		} else if (typeof targetDateRaw === "string" && targetDateRaw.length > 0) {
			const parsed = new Date(targetDateRaw);
			if (Number.isFinite(parsed.getTime())) targetDate = parsed;
		}
		const capitalisationRaw = toNumber(row["Taux capitalisation"]);
		pending.push({
			id,
			label,
			type: type as FinancialGoal["type"],
			targetAmount,
			targetAge:
				targetAgeRaw !== null ? Math.round(targetAgeRaw) : undefined,
			targetDate,
			inflationIncluded: parseOuiNon(row["Inflation comprise"], true),
			drawOnCapital: parseOuiNon(row["Vivre sur le capital"], false),
			capitalisationRate:
				capitalisationRaw !== null ? capitalisationRaw : undefined,
			publicPensionLink: parsePublicPensionLink(row["Pension publique"]),
			notes: emptyToUndefined(row["Notes"]),
		});
	}
	return normalizeFinancialGoals(pending);
}

function parseEmergencyFundConfig(
	rows: Record<string, unknown>[],
): EmergencyFundConfig | undefined {
	const row = rows.find((entry) =>
		["Cible (mois)", "Cible (€)", "Horizon rattrapage (mois)"].some(
			(column) => toNumber(entry[column]) !== null,
		),
	);
	if (!row) return undefined;

	const targetMonths = toNumber(row["Cible (mois)"]);
	const targetAmountOverride = toNumber(row["Cible (€)"]);
	const catchUpHorizonMonths = toNumber(row["Horizon rattrapage (mois)"]);

	if (
		targetMonths === null &&
		targetAmountOverride === null &&
		catchUpHorizonMonths === null
	) {
		return undefined;
	}

	return {
		targetMonths: targetMonths ?? DEFAULT_EMERGENCY_FUND_TARGET_MONTHS,
		targetAmountOverride: targetAmountOverride ?? undefined,
		catchUpHorizonMonths: Math.max(
			1,
			Math.round(
				catchUpHorizonMonths ??
					DEFAULT_EMERGENCY_FUND_CATCH_UP_HORIZON_MONTHS,
			),
		),
	};
}

function parseOuiNon(value: unknown, defaultValue: boolean): boolean {
	if (value === null || value === undefined || value === "") return defaultValue;
	const normalized = String(value).trim().toLowerCase();
	if (["non", "no", "false", "0", "n"].includes(normalized)) return false;
	if (["oui", "yes", "true", "1", "y", "o"].includes(normalized)) return true;
	return defaultValue;
}

function toNumber(value: unknown): number | null {
	if (value === null || value === undefined || value === "") return null;
	if (typeof value === "number") return value;
	if (typeof value === "string") {
		const parsed = Number(value.replace(",", "."));
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function emptyToUndefined(value: unknown): string | undefined {
	if (value === null || value === undefined) return undefined;
	const str = String(value).trim();
	return str.length === 0 ? undefined : str;
}

let cache: {
	mtime: number;
	workbook: Workbook;
	transactionRows: LoadedTransaction[];
} | null = null;

function buildWorkbookFromXlsx(sheet: XLSX.WorkBook): {
	workbook: Workbook;
	transactionRows: LoadedTransaction[];
} {
	const { headers, dataRows } = readTransactionRowsFromSheet(sheet);
	const parsedTransactions = parseTransactions(
		dataRows.map((row) => aoaRowToObject(headers, row)),
	);
	const transactionRows: LoadedTransaction[] = parsedTransactions.map(
		(transaction, row) => ({ transaction, row }),
	);

	const assets = parseAssets(readSheet(sheet, SHEET_ACTIFS));
	const accounts = parseAccounts(readSheet(sheet, SHEET_COMPTES));
	const budget = parseBudget(readSheetOptional(sheet, SHEET_BUDGET));
	const loanInsurancePaliers = parseLoanInsurancePaliers(
		readSheetOptional(sheet, SHEET_ASSURANCE_EMPRUNT),
	);
	const properties = hydratePropertyPaliers(
		parseProperties(readSheetOptional(sheet, SHEET_IMMOBILIER)),
		loanInsurancePaliers,
	);
	const dca = parseDcaConfigs(readSheetOptional(sheet, SHEET_DCA));
	const manualPrices = parseManualPrices(
		readSheetOptional(sheet, SHEET_PRIX_MANUELS),
		assets,
	);
	const propertyTaxes = parsePropertyTaxes(
		readSheetOptional(sheet, SHEET_TAXE_FONCIERE),
		properties,
	);
	const geographicAllocations = parseGeographicAllocations(
		readSheetOptional(sheet, SHEET_EXPOSITION_GEO),
		assets,
	);
	const sectorAllocations = parseSectorAllocations(
		readSheetOptional(sheet, SHEET_EXPOSITION_SECTEUR),
		assets,
	);
	const diversificationTargets = parseDiversificationTargets(
		readSheetOptional(sheet, SHEET_CIBLES_DIVERSIFICATION),
	);
	const financialGoals = parseFinancialGoals(
		readSheetOptional(sheet, SHEET_OBJECTIFS),
	);
	const emergencyFundConfig = parseEmergencyFundConfig(
		readSheetOptional(sheet, SHEET_FONDS_URGENCE),
	);

	const transactions = [...parsedTransactions].sort(
		(a, b) => a.date.getTime() - b.date.getTime(),
	);

	return {
		workbook: {
			transactions,
			assets,
			accounts,
			budget,
			properties,
			dca,
			manualPrices,
			loanInsurancePaliers,
			geographicAllocations,
			sectorAllocations,
			diversificationTargets,
			financialGoals,
			emergencyFundConfig,
			propertyTaxes,
		},
		transactionRows,
	};
}

export function loadWorkbook(): Workbook {
	const path = getExcelPath();
	const mtime = statSync(path).mtimeMs;

	if (cache && cache.mtime === mtime && process.env.NODE_ENV === "production") {
		return cache.workbook;
	}

	const fileBuffer = readFileSync(path);
	const sheet = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

	const { workbook, transactionRows } = buildWorkbookFromXlsx(sheet);

	cache = { mtime, workbook, transactionRows };
	return workbook;
}

export function loadTransactionRows(): LoadedTransaction[] {
	loadWorkbook();
	return cache?.transactionRows ?? [];
}

export function getBudget(): BudgetLine[] {
	return loadWorkbook().budget;
}

export function getProperties(): Property[] {
	return loadWorkbook().properties;
}

export function getPropertyTaxes(): PropertyTax[] {
	return loadWorkbook().propertyTaxes ?? [];
}

export function getDcaConfigs(): DcaConfig[] {
	if (!isExcelConfigured()) return [];
	return loadWorkbook().dca;
}

export function saveDcaConfigs(configs: DcaConfig[]): void {
	const path = getExcelPath();
	const fileBuffer = readFileSync(path);
	const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

	const headers = [...DCA_HEADERS];
	const rows = dcaConfigsToRows(configs).map((row) =>
		headers.map((header) => row[header] ?? null),
	);
	const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

	workbook.Sheets[SHEET_DCA] = sheet;
	if (!workbook.SheetNames.includes(SHEET_DCA)) {
		workbook.SheetNames.push(SHEET_DCA);
	}
	writeWorkbook(workbook, path);
}

export function getAssetMap(): Map<string, Asset> {
	return new Map(loadWorkbook().assets.map((a) => [a.id, a]));
}

export function getAccountMap(): Map<string, Account> {
	return new Map(loadWorkbook().accounts.map((a) => [a.id, a]));
}

function transactionValueByHeader(
	transaction: Transaction,
): Record<string, unknown> {
	return {
		Date: transaction.date,
		Type: transaction.type,
		Compte: transaction.compte,
		"Compte destination": transaction.compteDestination ?? null,
		Actif: transaction.actif || null,
		Quantité: transaction.quantite,
		"Prix unitaire": transaction.prixUnitaire,
		Devise: transaction.devise,
		Frais: transaction.frais,
		"Frais devise": transaction.fraisDevise,
		Notes: transaction.notes ?? null,
	};
}

export function appendTransaction(transaction: Transaction): void {
	appendTransactions([transaction]);
}

export function appendTransactions(transactions: Transaction[]): void {
	if (transactions.length === 0) return;
	const path = getExcelPath();
	const fileBuffer = readFileSync(path);
	const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
	const sheet = workbook.Sheets[SHEET_TRANSACTIONS];
	if (!sheet) {
		throw new Error(`Missing sheet "${SHEET_TRANSACTIONS}" in workbook.`);
	}

	const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
	const headers = (aoa[0] ?? []) as string[];
	if (headers.length === 0) {
		throw new Error(`Sheet "${SHEET_TRANSACTIONS}" has no header row.`);
	}

	const rows = transactions.map((tx) => {
		const valueByHeader = transactionValueByHeader(tx);
		return headers.map((h) => valueByHeader[h] ?? null);
	});

	XLSX.utils.sheet_add_aoa(sheet, rows, { origin: -1, cellDates: true });

	const out = XLSX.write(workbook, {
		type: "buffer",
		bookType: "xlsx",
		cellDates: true,
	}) as Buffer;
	writeFileSync(path, out);

	cache = null;
}

export function updateTransactionAt(
	row: number,
	transaction: Transaction,
): void {
	const path = getExcelPath();
	const fileBuffer = readFileSync(path);
	const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
	const { headers, dataRows } = readTransactionRowsFromSheet(workbook);

	if (row < 0 || row >= dataRows.length) {
		throw new Error(`Transaction introuvable (ligne ${row}).`);
	}

	const valueByHeader = transactionValueByHeader(transaction);
	dataRows[row] = headers.map((h) => valueByHeader[h] ?? null);

	const nextSheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows], {
		cellDates: true,
	});
	workbook.Sheets[SHEET_TRANSACTIONS] = nextSheet;
	writeWorkbook(workbook, path);
}

export function deleteTransactionAt(row: number): void {
	const path = getExcelPath();
	const fileBuffer = readFileSync(path);
	const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
	const { headers, dataRows } = readTransactionRowsFromSheet(workbook);

	if (row < 0 || row >= dataRows.length) {
		throw new Error(`Transaction introuvable (ligne ${row}).`);
	}

	dataRows.splice(row, 1);

	const nextSheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows], {
		cellDates: true,
	});
	workbook.Sheets[SHEET_TRANSACTIONS] = nextSheet;
	writeWorkbook(workbook, path);
}

type UpsertEntry = {
	id: string;
	valueByHeader: Record<string, unknown>;
};

function upsertRowsInWorkbook(
	workbook: XLSX.WorkBook,
	sheetName: string,
	idHeader: string,
	entries: UpsertEntry[],
	defaultHeaders?: readonly string[],
): void {
	if (entries.length === 0) return;
	let sheet = workbook.Sheets[sheetName];
	if (!sheet) {
		if (!defaultHeaders) {
			throw new Error(`Missing sheet "${sheetName}" in workbook.`);
		}
		sheet = XLSX.utils.aoa_to_sheet([[...defaultHeaders]]);
		workbook.Sheets[sheetName] = sheet;
		workbook.SheetNames.push(sheetName);
	}

	const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
		header: 1,
		defval: null,
	});
	const headers = (aoa[0] ?? []) as string[];
	if (headers.length === 0) {
		throw new Error(`Sheet "${sheetName}" has no header row.`);
	}
	const idIndex = headers.indexOf(idHeader);
	if (idIndex === -1) {
		throw new Error(`Missing column "${idHeader}" in sheet "${sheetName}".`);
	}

	const missingHeaders: string[] = [];
	for (const { valueByHeader } of entries) {
		for (const key of Object.keys(valueByHeader)) {
			if (!headers.includes(key) && !missingHeaders.includes(key)) {
				missingHeaders.push(key);
			}
		}
	}
	if (missingHeaders.length > 0) {
		headers.push(...missingHeaders);
		XLSX.utils.sheet_add_aoa(sheet, [headers], { origin: "A1" });
	}

	const existingByKey = new Map<string, number>();
	for (let i = 1; i < aoa.length; i++) {
		const cell = aoa[i]?.[idIndex];
		if (cell !== null && cell !== undefined) {
			existingByKey.set(String(cell), i);
		}
	}

	for (const { id, valueByHeader } of entries) {
		const row = headers.map((h) =>
			h in valueByHeader ? (valueByHeader[h] ?? null) : null,
		);
		const existingRowIndex = existingByKey.get(id);
		if (existingRowIndex === undefined) {
			XLSX.utils.sheet_add_aoa(sheet, [row], { origin: -1, cellDates: true });
			existingByKey.set(id, aoa.length);
			aoa.push(row);
		} else {
			XLSX.utils.sheet_add_aoa(sheet, [row], {
				origin: { r: existingRowIndex, c: 0 },
				cellDates: true,
			});
		}
	}
}

function writeWorkbook(workbook: XLSX.WorkBook, path: string): void {
	const out = XLSX.write(workbook, {
		type: "buffer",
		bookType: "xlsx",
		cellDates: true,
	}) as Buffer;
	const temporaryPath = `${path}.tmp`;
	try {
		writeFileSync(temporaryPath, out);
		renameSync(temporaryPath, path);
	} catch (error) {
		rmSync(temporaryPath, { force: true });
		throw error;
	}
	cache = null;
}

function upsertRow(
	sheetName: string,
	idHeader: string,
	id: string,
	valueByHeader: Record<string, unknown>,
	defaultHeaders?: readonly string[],
): void {
	const path = getExcelPath();
	const fileBuffer = readFileSync(path);
	const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
	upsertRowsInWorkbook(
		workbook,
		sheetName,
		idHeader,
		[{ id, valueByHeader }],
		defaultHeaders,
	);
	writeWorkbook(workbook, path);
}

function assetEntry(asset: Asset): UpsertEntry {
	return {
		id: asset.id,
		valueByHeader: {
			ID: asset.id,
			Libellé: asset.label,
			Type: asset.type,
			ISIN: asset.isin ?? null,
			Ticker: asset.ticker ?? null,
			"Source prix": asset.source,
			"Param source": asset.param ?? null,
			Devise: asset.currency,
			TER: asset.ter ?? null,
		},
	};
}

function accountEntry(account: Account): UpsertEntry {
	return {
		id: account.id,
		valueByHeader: {
			ID: account.id,
			Libellé: account.label,
			Type: account.type,
			Enveloppe: account.envelope,
			"Date d'ouverture": account.openDate ?? null,
			Taux: account.rate ?? null,
			Plafond: account.plafond ?? null,
		},
	};
}

function replaceSheetRows(
	workbook: XLSX.WorkBook,
	sheetName: string,
	valueByHeaderRows: Record<string, unknown>[],
	defaultHeaders?: readonly string[],
): void {
	const existingSheet = workbook.Sheets[sheetName];
	const existingRows = existingSheet
		? XLSX.utils.sheet_to_json<unknown[]>(existingSheet, {
				header: 1,
				defval: null,
			})
		: [];
	const headers = (defaultHeaders ??
		(existingRows[0] as string[] | undefined)) as
		| readonly string[]
		| undefined;

	if (!headers || headers.length === 0) {
		throw new Error(`Sheet "${sheetName}" has no header row.`);
	}

	workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(
		[
			[...headers],
			...valueByHeaderRows.map((row) =>
				headers.map((header) => row[header] ?? null),
			),
		],
		{ cellDates: true },
	);
	if (!workbook.SheetNames.includes(sheetName)) {
		workbook.SheetNames.push(sheetName);
	}
}

function deleteSheetIfPresent(workbook: XLSX.WorkBook, sheetName: string): void {
	const index = workbook.SheetNames.indexOf(sheetName);
	if (index === -1) return;
	workbook.SheetNames.splice(index, 1);
	delete workbook.Sheets[sheetName];
}

export function replaceWorkbook(nextWorkbook: Workbook): void {
	const path = getExcelPath();
	const fileBuffer = readFileSync(path);
	const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

	replaceSheetRows(
		workbook,
		SHEET_TRANSACTIONS,
		nextWorkbook.transactions.map(transactionValueByHeader),
	);
	replaceSheetRows(
		workbook,
		SHEET_ACTIFS,
		nextWorkbook.assets.map((asset) => assetEntry(asset).valueByHeader),
	);
	replaceSheetRows(
		workbook,
		SHEET_COMPTES,
		nextWorkbook.accounts.map((account) => accountEntry(account).valueByHeader),
	);
	replaceSheetRows(
		workbook,
		SHEET_DCA,
		dcaConfigsToRows(nextWorkbook.dca),
		DCA_HEADERS,
	);
	replaceSheetRows(
		workbook,
		SHEET_PRIX_MANUELS,
		nextWorkbook.manualPrices.map((entry) => ({
			Actif: entry.assetId,
			Date: entry.date,
			Prix: entry.price,
		})),
		PRIX_MANUELS_HEADERS,
	);
	replaceSheetRows(
		workbook,
		SHEET_ASSURANCE_EMPRUNT,
		(nextWorkbook.loanInsurancePaliers ?? []).map((entry) => ({
			Bien: entry.propertyId,
			"Année début": entry.anneeDebut,
			"Assurance mensuelle (€)": entry.assuranceMensuelle,
		})),
		ASSURANCE_EMPRUNT_HEADERS,
	);
	replaceSheetRows(
		workbook,
		SHEET_TAXE_FONCIERE,
		(nextWorkbook.propertyTaxes ?? []).map((entry) => ({
			Bien: entry.propertyId,
			Année: entry.year,
			Montant: entry.amount,
		})),
		TAXE_FONCIERE_HEADERS,
	);
	replaceSheetRows(
		workbook,
		SHEET_EXPOSITION_GEO,
		(nextWorkbook.geographicAllocations ?? []).map((entry) => ({
			Actif: entry.assetId,
			Pays: entry.country,
			"Poids %": Math.round(entry.weight * 1000) / 10,
			Source: entry.source,
		})),
		EXPOSITION_GEO_HEADERS,
	);
	replaceSheetRows(
		workbook,
		SHEET_EXPOSITION_SECTEUR,
		(nextWorkbook.sectorAllocations ?? []).map((entry) => ({
			Actif: entry.assetId,
			Secteur: entry.sector,
			"Poids %": Math.round(entry.weight * 1000) / 10,
			Source: entry.source,
		})),
		EXPOSITION_SECTEUR_HEADERS,
	);
	replaceSheetRows(
		workbook,
		SHEET_CIBLES_DIVERSIFICATION,
		(nextWorkbook.diversificationTargets ?? []).map((entry) => ({
			Dimension: entry.key,
			"Min %": Math.round(entry.minPct * 1000) / 10,
			"Max %": Math.round(entry.maxPct * 1000) / 10,
		})),
		CIBLES_DIVERSIFICATION_HEADERS,
	);
	replaceSheetRows(
		workbook,
		SHEET_OBJECTIFS,
		(nextWorkbook.financialGoals ?? []).map((entry) => ({
			ID: entry.id,
			Libellé: entry.label,
			Type: entry.type,
			"Montant cible": entry.targetAmount,
			"Âge cible":
				entry.type === "RETIREMENT_INCOME" ? null : (entry.targetAge ?? null),
			"Date cible": entry.targetDate ?? null,
			"Inflation comprise":
				entry.inflationIncluded !== false ? "Oui" : "Non",
			"Vivre sur le capital":
				entry.type === "RETIREMENT_INCOME"
					? entry.drawOnCapital
						? "Oui"
						: "Non"
					: null,
			"Taux capitalisation":
				entry.type === "RETIREMENT_INCOME"
					? (entry.capitalisationRate ?? null)
					: null,
			"Pension publique":
				entry.type === "RETIREMENT_INCOME"
					? formatPublicPensionLink(entry.publicPensionLink)
					: null,
			Notes: entry.notes ?? null,
		})),
		OBJECTIFS_HEADERS,
	);
	replaceSheetRows(
		workbook,
		SHEET_FONDS_URGENCE,
		nextWorkbook.emergencyFundConfig
			? [
					{
						"Cible (mois)": nextWorkbook.emergencyFundConfig.targetMonths,
						"Cible (€)":
							nextWorkbook.emergencyFundConfig.targetAmountOverride ?? null,
						"Horizon rattrapage (mois)":
							nextWorkbook.emergencyFundConfig.catchUpHorizonMonths,
					},
				]
			: [],
		FONDS_URGENCE_HEADERS,
	);
	deleteSheetIfPresent(workbook, SHEET_ALLOCATION_CIBLE);

	writeWorkbook(workbook, path);
}

export function upsertAsset(asset: Asset): void {
	upsertAssets([asset]);
}

export function upsertAssets(assets: Asset[]): void {
	if (assets.length === 0) return;
	const path = getExcelPath();
	const fileBuffer = readFileSync(path);
	const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
	upsertRowsInWorkbook(workbook, SHEET_ACTIFS, "ID", assets.map(assetEntry));
	writeWorkbook(workbook, path);
}

export function upsertAccount(account: Account): void {
	upsertAccounts([account]);
}

export function upsertAccounts(accounts: Account[]): void {
	if (accounts.length === 0) return;
	const path = getExcelPath();
	const fileBuffer = readFileSync(path);
	const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
	upsertRowsInWorkbook(
		workbook,
		SHEET_COMPTES,
		"ID",
		accounts.map(accountEntry),
	);
	writeWorkbook(workbook, path);
}

export function commitImport(payload: {
	newAccounts: Account[];
	newAssets: Asset[];
	transactions: Transaction[];
}): void {
	const path = getExcelPath();
	const fileBuffer = readFileSync(path);
	const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

	if (payload.newAccounts.length > 0) {
		upsertRowsInWorkbook(
			workbook,
			SHEET_COMPTES,
			"ID",
			payload.newAccounts.map(accountEntry),
		);
	}
	if (payload.newAssets.length > 0) {
		upsertRowsInWorkbook(
			workbook,
			SHEET_ACTIFS,
			"ID",
			payload.newAssets.map(assetEntry),
		);
	}
	if (payload.transactions.length > 0) {
		const sheet = workbook.Sheets[SHEET_TRANSACTIONS];
		if (!sheet) {
			throw new Error(`Missing sheet "${SHEET_TRANSACTIONS}" in workbook.`);
		}
		const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
		const headers = (aoa[0] ?? []) as string[];
		if (headers.length === 0) {
			throw new Error(`Sheet "${SHEET_TRANSACTIONS}" has no header row.`);
		}
		const rows = payload.transactions.map((tx) => {
			const valueByHeader = transactionValueByHeader(tx);
			return headers.map((h) => valueByHeader[h] ?? null);
		});
		XLSX.utils.sheet_add_aoa(sheet, rows, { origin: -1, cellDates: true });
	}

	writeWorkbook(workbook, path);
}

function deleteRow(sheetName: string, idHeader: string, id: string): void {
	const path = getExcelPath();
	const fileBuffer = readFileSync(path);
	const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
	const sheet = workbook.Sheets[sheetName];
	if (!sheet) return;

	const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
		header: 1,
		defval: null,
	});
	const headers = (aoa[0] ?? []) as string[];
	const idIndex = headers.indexOf(idHeader);
	if (idIndex === -1) return;

	const kept = aoa
		.slice(1)
		.filter((row) => String(row?.[idIndex] ?? "") !== id);
	const nextSheet = XLSX.utils.aoa_to_sheet([headers, ...kept], {
		cellDates: true,
	});
	workbook.Sheets[sheetName] = nextSheet;

	const out = XLSX.write(workbook, {
		type: "buffer",
		bookType: "xlsx",
		cellDates: true,
	}) as Buffer;
	writeFileSync(path, out);

	cache = null;
}

export function upsertBudgetLine(line: BudgetLine): void {
	upsertRow(
		SHEET_BUDGET,
		"ID",
		line.id,
		{
			ID: line.id,
			Libellé: line.label,
			Type: line.kind,
			Montant: line.amount,
			Fréquence: line.frequency,
			Catégorie: line.category,
			Notes: line.notes ?? null,
		},
		BUDGET_HEADERS,
	);
}

export function deleteBudgetLine(id: string): void {
	deleteRow(SHEET_BUDGET, "ID", id);
}

function propertyEntry(property: Property): UpsertEntry {
	return {
		id: property.id,
		valueByHeader: {
			ID: property.id,
			Libellé: property.label,
			Détention: property.detention,
			Régime: property.regime,
			"Part détenue": property.partDetenue,
			"Date acquisition": property.dateAcquisition ?? null,
			"Prix achat": property.prixAchat,
			"Frais notaire": property.fraisNotaire,
			Travaux: property.travaux,
			"Valeur actuelle": property.valeurActuelle,
			"Revalo annuelle": property.revaloAnnuelle,
			"Montant emprunté": property.montantEmprunte,
			"Taux crédit": property.tauxCredit,
			"Durée (mois)": property.dureeMois,
			"Date début crédit": property.dateDebutCredit ?? null,
			"Taux assurance": property.tauxAssurance,
			"Mode assurance": property.modeAssurance ?? "CRD",
			"Assurance mensuelle (€)": property.assuranceMensuelle ?? 0,
			"Loyer mensuel HC": property.loyerMensuelHC,
			"Charges non récup": property.chargesNonRecupAnnuelles,
			"Taxe foncière": property.taxeFonciere,
			Vacance: property.vacancePct,
			"Frais gestion": property.fraisGestionPct,
			"TMI associé": property.tmiAssocie,
			"Part amortissable": property.partAmortissable,
			"Durée amortissement": property.dureeAmortissement,
			Notes: property.notes ?? null,
		},
	};
}

export function upsertProperty(property: Property): void {
	upsertProperties([property]);
}

export function upsertProperties(properties: Property[]): void {
	if (properties.length === 0) return;
	const path = getExcelPath();
	const fileBuffer = readFileSync(path);
	const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
	upsertRowsInWorkbook(
		workbook,
		SHEET_IMMOBILIER,
		"ID",
		properties.map(propertyEntry),
		IMMOBILIER_HEADERS,
	);

	const existingPaliers = parseLoanInsurancePaliers(
		readSheetOptional(workbook, SHEET_ASSURANCE_EMPRUNT),
	);
	const touchedIds = new Set(properties.map((p) => p.id));
	const kept = existingPaliers.filter((p) => !touchedIds.has(p.propertyId));
	const next: LoanInsurancePalier[] = [...kept];
	for (const property of properties) {
		for (const palier of property.assurancePaliers ?? []) {
			next.push({
				propertyId: property.id,
				anneeDebut: palier.anneeDebut,
				assuranceMensuelle: palier.assuranceMensuelle,
			});
		}
	}
	const normalized = normalizeLoanInsurancePaliers(next);
	replaceSheetRows(
		workbook,
		SHEET_ASSURANCE_EMPRUNT,
		normalized.map((p) => ({
			Bien: p.propertyId,
			"Année début": p.anneeDebut,
			"Assurance mensuelle (€)": p.assuranceMensuelle,
		})),
		ASSURANCE_EMPRUNT_HEADERS,
	);

	writeWorkbook(workbook, path);
}

export function deleteProperty(id: string): void {
	const path = getExcelPath();
	const fileBuffer = readFileSync(path);
	const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
	const immobilier = workbook.Sheets[SHEET_IMMOBILIER];
	if (immobilier) {
		const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(immobilier, {
			defval: null,
		});
		const kept = rows.filter((row) => String(row["ID"] ?? "") !== id);
		replaceSheetRows(
			workbook,
			SHEET_IMMOBILIER,
			kept.map((row) => {
				const out: Record<string, unknown> = {};
				for (const header of IMMOBILIER_HEADERS) {
					out[header] = row[header] ?? null;
				}
				return out;
			}),
			IMMOBILIER_HEADERS,
		);
	}
	const paliers = parseLoanInsurancePaliers(
		readSheetOptional(workbook, SHEET_ASSURANCE_EMPRUNT),
	).filter((p) => p.propertyId !== id);
	replaceSheetRows(
		workbook,
		SHEET_ASSURANCE_EMPRUNT,
		paliers.map((p) => ({
			Bien: p.propertyId,
			"Année début": p.anneeDebut,
			"Assurance mensuelle (€)": p.assuranceMensuelle,
		})),
		ASSURANCE_EMPRUNT_HEADERS,
	);
	const taxRows = readSheetOptional(workbook, SHEET_TAXE_FONCIERE).filter(
		(row) => String(row["Bien"] ?? "") !== id,
	);
	replaceSheetRows(
		workbook,
		SHEET_TAXE_FONCIERE,
		taxRows.map((row) => ({
			Bien: row["Bien"] ?? null,
			Année: row["Année"] ?? null,
			Montant: row["Montant"] ?? null,
		})),
		TAXE_FONCIERE_HEADERS,
	);
	writeWorkbook(workbook, path);
}
