import {
	normalizeGeographicAllocations,
	weightFromExcelPercentCell,
} from "@patrimo/core/geographic-allocation";
import { normalizeSectorAllocations } from "@patrimo/core/sector-allocation";
import { normalizeManualPrices } from "@patrimo/core/manual-prices";
import type {
	DiversificationTarget,
	EmergencyFundConfig,
	FinancialGoal,
	GeographicAllocation,
	SectorAllocation,
} from "@patrimo/core/schema";
import {
	Account,
	Asset,
	BudgetLine,
	DcaConfig,
	type ManualPrice,
	Property,
	Transaction,
	type Workbook,
} from "@patrimo/core/schema";
import {
	DEFAULT_EMERGENCY_FUND_CATCH_UP_HORIZON_MONTHS,
	DEFAULT_EMERGENCY_FUND_TARGET_MONTHS,
} from "@patrimo/core/emergency-fund-config";
import {
	diversificationPctFromExcel,
	normalizeDiversificationTargets,
} from "@patrimo/core/diversification-targets";
import { normalizeFinancialGoals } from "@patrimo/core/financial-goals";
import {
	ACTIFS_HEADERS,
	CIBLES_DIVERSIFICATION_HEADERS,
	COMPTES_HEADERS,
	DCA_HEADERS,
	EXPOSITION_GEO_HEADERS,
	EXPOSITION_SECTEUR_HEADERS,
	FONDS_URGENCE_HEADERS,
	OBJECTIFS_HEADERS,
	PRIX_MANUELS_HEADERS,
	SHEET_ACTIFS,
	SHEET_ALLOCATION_CIBLE,
	SHEET_CIBLES_DIVERSIFICATION,
	SHEET_COMPTES,
	SHEET_DCA,
	SHEET_EXPOSITION_GEO,
	SHEET_EXPOSITION_SECTEUR,
	SHEET_FONDS_URGENCE,
	SHEET_OBJECTIFS,
	SHEET_PRIX_MANUELS,
	SHEET_TRANSACTIONS,
	TRANSACTIONS_HEADERS,
} from "@patrimo/core/workbook-template";
import * as XLSX from "xlsx";

export type ParsedWorkbook = {
	workbook: Workbook;
	transactionKeys: string[];
};

export function parseWorkbook(buffer: ArrayBuffer): ParsedWorkbook {
	console.log("[Parser v2] Starting parse...");
	const wb = XLSX.read(buffer, { type: "array", cellDates: true });

	const rawTransactions = readSheet(wb, "Transactions");
	const rawAssets = readSheet(wb, "Actifs");
	const rawAccounts = readSheet(wb, "Comptes");
	const rawBudget = readSheet(wb, "Budget");
	const rawProperties = readSheet(wb, "Immobilier");
	const rawDca = readSheet(wb, "DCA");
	const rawManualPrices = readSheet(wb, SHEET_PRIX_MANUELS);
	const rawGeographicAllocations = readSheet(wb, SHEET_EXPOSITION_GEO);
	const rawSectorAllocations = readSheet(wb, SHEET_EXPOSITION_SECTEUR);
	const rawDiversificationTargets = readSheet(wb, SHEET_CIBLES_DIVERSIFICATION);
	const rawFinancialGoals = readSheet(wb, SHEET_OBJECTIFS);
	const rawEmergencyFundConfig = readSheet(wb, SHEET_FONDS_URGENCE);

	const { transactions, keys: transactionKeys } =
		parseTransactions(rawTransactions);
	const assets = parseAssets(rawAssets);
	const accounts = parseAccounts(rawAccounts);
	const budget = parseBudget(rawBudget);
	const properties = parseProperties(rawProperties);
	const dca = parseDca(rawDca);
	const manualPrices = parseManualPrices(rawManualPrices, assets);
	const geographicAllocations = parseGeographicAllocations(
		rawGeographicAllocations,
		assets,
	);
	const sectorAllocations = parseSectorAllocations(rawSectorAllocations, assets);
	const diversificationTargets = parseDiversificationTargets(
		rawDiversificationTargets,
	);
	const financialGoals = parseFinancialGoals(rawFinancialGoals);
	const emergencyFundConfig = parseEmergencyFundConfig(rawEmergencyFundConfig);

	console.log("[Parser v2] Results:", {
		transactions: transactions.length,
		assets: assets.length,
		accounts: accounts.length,
		budget: budget.length,
		properties: properties.length,
		dca: dca.length,
		manualPrices: manualPrices.length,
		geographicAllocations: geographicAllocations.length,
		sectorAllocations: sectorAllocations.length,
		diversificationTargets: diversificationTargets.length,
		financialGoals: financialGoals.length,
		emergencyFundConfig: emergencyFundConfig ? 1 : 0,
	});

	return {
		workbook: {
			transactions,
			assets,
			accounts,
			budget,
			properties,
			dca,
			manualPrices,
			geographicAllocations,
			sectorAllocations,
			diversificationTargets,
			financialGoals,
			emergencyFundConfig,
		},
		transactionKeys,
	};
}

function replaceRows(
	workbook: XLSX.WorkBook,
	sheetName: string,
	headers: readonly string[],
	rows: Record<string, unknown>[],
): void {
	workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(
		[
			[...headers],
			...rows.map((row) => headers.map((header) => row[header] ?? null)),
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

export function serializeWorkbook(
	source: ArrayBuffer,
	workbookData: Workbook,
): ArrayBuffer {
	const workbook = XLSX.read(source, { type: "array", cellDates: true });

	replaceRows(
		workbook,
		SHEET_TRANSACTIONS,
		TRANSACTIONS_HEADERS,
		workbookData.transactions.map((transaction) => ({
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
		})),
	);
	replaceRows(
		workbook,
		SHEET_ACTIFS,
		ACTIFS_HEADERS,
		workbookData.assets.map((asset) => ({
			ID: asset.id,
			Libellé: asset.label,
			Type: asset.type,
			ISIN: asset.isin ?? null,
			Ticker: asset.ticker ?? null,
			"Source prix": asset.source,
			"Param source": asset.param ?? null,
			Devise: asset.currency,
			TER: asset.ter ?? null,
		})),
	);
	replaceRows(
		workbook,
		SHEET_COMPTES,
		COMPTES_HEADERS,
		workbookData.accounts.map((account) => ({
			ID: account.id,
			Libellé: account.label,
			Type: account.type,
			Enveloppe: account.envelope,
			"Date d'ouverture": account.openDate ?? null,
			Taux: account.rate ?? null,
			Plafond: account.plafond ?? null,
		})),
	);
	replaceRows(
		workbook,
		SHEET_DCA,
		DCA_HEADERS,
		workbookData.dca.flatMap((config) => {
			if (config.lines.length === 0) {
				return [
					{
						ID: config.id,
						Libellé: config.label,
						Enveloppe: config.envelope,
						Montant: config.amount,
						Fréquence: config.frequency,
						"Mois versement": config.paymentMonth ?? null,
						Panier: null as string | null,
						Actifs: "",
						"Cible %": 0,
					},
				];
			}
			return config.lines.map((line) => ({
				ID: config.id,
				Libellé: config.label,
				Enveloppe: config.envelope,
				Montant: config.amount,
				Fréquence: config.frequency,
				"Mois versement": config.paymentMonth ?? null,
				Panier: line.label ?? null,
				Actifs: line.assetIds.join(", "),
				"Cible %": Math.round(line.targetPct * 1000) / 10,
			}));
		}),
	);
	replaceRows(
		workbook,
		SHEET_PRIX_MANUELS,
		PRIX_MANUELS_HEADERS,
		workbookData.manualPrices.map((entry) => ({
			Actif: entry.assetId,
			Date: entry.date,
			Prix: entry.price,
		})),
	);
	replaceRows(
		workbook,
		SHEET_EXPOSITION_GEO,
		EXPOSITION_GEO_HEADERS,
		(workbookData.geographicAllocations ?? []).map((entry) => ({
			Actif: entry.assetId,
			Pays: entry.country,
			"Poids %": Math.round(entry.weight * 1000) / 10,
			Source: entry.source,
		})),
	);
	replaceRows(
		workbook,
		SHEET_EXPOSITION_SECTEUR,
		EXPOSITION_SECTEUR_HEADERS,
		(workbookData.sectorAllocations ?? []).map((entry) => ({
			Actif: entry.assetId,
			Secteur: entry.sector,
			"Poids %": Math.round(entry.weight * 1000) / 10,
			Source: entry.source,
		})),
	);
	replaceRows(
		workbook,
		SHEET_CIBLES_DIVERSIFICATION,
		CIBLES_DIVERSIFICATION_HEADERS,
		(workbookData.diversificationTargets ?? []).map((entry) => ({
			Dimension: entry.key,
			"Min %": Math.round(entry.minPct * 1000) / 10,
			"Max %": Math.round(entry.maxPct * 1000) / 10,
		})),
	);
	replaceRows(
		workbook,
		SHEET_OBJECTIFS,
		OBJECTIFS_HEADERS,
		(workbookData.financialGoals ?? []).map((entry) => ({
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
					? !entry.publicPensionLink || entry.publicPensionLink === "NONE"
						? "Aucune"
						: entry.publicPensionLink
					: null,
			Notes: entry.notes ?? null,
		})),
	);
	replaceRows(
		workbook,
		SHEET_FONDS_URGENCE,
		FONDS_URGENCE_HEADERS,
		workbookData.emergencyFundConfig
			? [
					{
						"Cible (mois)": workbookData.emergencyFundConfig.targetMonths,
						"Cible (€)":
							workbookData.emergencyFundConfig.targetAmountOverride ?? null,
						"Horizon rattrapage (mois)":
							workbookData.emergencyFundConfig.catchUpHorizonMonths,
					},
				]
			: [],
	);
	deleteSheetIfPresent(workbook, SHEET_ALLOCATION_CIBLE);

	return XLSX.write(workbook, {
		type: "array",
		bookType: "xlsx",
		cellDates: true,
	}) as ArrayBuffer;
}

function readSheet(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] {
	const sheet = wb.Sheets[name];
	if (!sheet) return [];
	return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
		raw: true,
		defval: null,
	});
}

function parseTransactions(rows: Record<string, unknown>[]): {
	transactions: Transaction[];
	keys: string[];
} {
	const results: { tx: Transaction; rowKey: string }[] = [];
	let failCount = 0;
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const mapped = {
			date: coerceDate(row["Date"]),
			type: trimStr(row["Type"]),
			compte: trimStr(row["Compte"]),
			compteDestination: emptyToUndefined(row["Compte destination"]),
			actif: emptyToUndefined(row["Actif"]) ?? "",
			quantite: toNumber(row["Quantité"]) ?? 0,
			prixUnitaire: toNumber(row["Prix unitaire"]),
			devise: trimStr(row["Devise"]) || "EUR",
			frais: toNumber(row["Frais"]) ?? 0,
			fraisDevise: trimStr(row["Frais devise"]) || "EUR",
			notes: emptyToUndefined(row["Notes"]),
		};
		const parsed = Transaction.safeParse(mapped);
		if (parsed.success) {
			results.push({ tx: parsed.data, rowKey: `row${i + 2}` });
		} else if (failCount < 3) {
			failCount++;
			console.log("[Transactions] FAIL:", JSON.stringify(mapped).slice(0, 200));
			console.log(
				"[Transactions] error:",
				JSON.stringify(parsed.error).slice(0, 300),
			);
		}
	}
	console.log(`[Transactions] ${results.length} OK / ${rows.length} total`);

	const sorted = results.sort(
		(a, b) => a.tx.date.getTime() - b.tx.date.getTime(),
	);
	return {
		transactions: sorted.map((r) => r.tx),
		keys: sorted.map((r) => r.rowKey),
	};
}

function parseAssets(rows: Record<string, unknown>[]): Asset[] {
	const results: Asset[] = [];
	let failCount = 0;
	for (const row of rows) {
		const mapped = {
			id: trimStr(row["ID"]),
			label: trimStr(row["Libellé"]),
			type: trimStr(row["Type"]),
			isin: emptyToUndefined(row["ISIN"]),
			ticker: emptyToUndefined(row["Ticker"]),
			source: emptyToUndefined(row["Source prix"]) ?? "manual",
			param: emptyToUndefined(row["Param source"]),
			currency: trimStr(row["Devise"]) || "EUR",
			ter: toNumber(row["TER"] ?? row["Taux"]) ?? undefined,
		};
		const parsed = Asset.safeParse(mapped);
		if (parsed.success) {
			results.push(parsed.data);
		} else if (failCount < 3) {
			failCount++;
			console.log("[Assets] FAIL:", JSON.stringify(mapped).slice(0, 200));
			console.log(
				"[Assets] error:",
				JSON.stringify(parsed.error).slice(0, 300),
			);
		}
	}
	console.log(`[Assets] ${results.length} OK / ${rows.length} total`);
	return results;
}

function parseAccounts(rows: Record<string, unknown>[]): Account[] {
	const results: Account[] = [];
	let failCount = 0;
	for (const row of rows) {
		const rawOpenDate = row["Date d'ouverture"];
		const mapped = {
			id: trimStr(row["ID"]),
			label: trimStr(row["Libellé"]),
			type: trimStr(row["Type"]),
			envelope: trimStr(row["Enveloppe"]),
			openDate: optionalDate(rawOpenDate),
			rate: toNumber(row["Taux"]) ?? undefined,
			plafond: toNumber(row["Plafond"]) ?? undefined,
		};
		const parsed = Account.safeParse(mapped);
		if (parsed.success) {
			results.push(parsed.data);
		} else if (failCount < 3) {
			failCount++;
			console.log("[Accounts] FAIL:", JSON.stringify(mapped).slice(0, 200));
			console.log(
				"[Accounts] error:",
				JSON.stringify(parsed.error).slice(0, 300),
			);
		}
	}
	console.log(`[Accounts] ${results.length} OK / ${rows.length} total`);
	return results;
}

function parseBudget(rows: Record<string, unknown>[]): BudgetLine[] {
	const results: BudgetLine[] = [];
	let failCount = 0;
	for (const row of rows) {
		if (emptyToUndefined(row["ID"]) === undefined) continue;
		const mapped = {
			id: trimStr(row["ID"]),
			label: trimStr(row["Libellé"]),
			kind: trimStr(row["Type"]),
			amount: toNumber(row["Montant"]) ?? 0,
			frequency: trimStr(row["Fréquence"]),
			category: trimStr(row["Catégorie"]),
			notes: emptyToUndefined(row["Notes"]),
		};
		const parsed = BudgetLine.safeParse(mapped);
		if (parsed.success) {
			results.push(parsed.data);
		} else if (failCount < 3) {
			failCount++;
			console.log("[Budget] FAIL:", JSON.stringify(mapped).slice(0, 200));
			console.log(
				"[Budget] error:",
				JSON.stringify(parsed.error).slice(0, 300),
			);
		}
	}
	console.log(`[Budget] ${results.length} OK / ${rows.length} total`);
	return results;
}

function parseProperties(rows: Record<string, unknown>[]): Property[] {
	const results: Property[] = [];
	let failCount = 0;
	for (const row of rows) {
		if (emptyToUndefined(row["ID"]) === undefined) continue;
		const parsed = Property.safeParse({
			id: trimStr(row["ID"]),
			label: trimStr(row["Libellé"]),
			detention: emptyToUndefined(row["Détention"]) ?? "SCI",
			regime: trimStr(row["Régime"]),
			partDetenue: toNumber(row["Part détenue"]) ?? 1,
			dateAcquisition: optionalDate(row["Date acquisition"]),
			prixAchat: toNumber(row["Prix achat"]) ?? 0,
			fraisNotaire: toNumber(row["Frais notaire"]) ?? 0,
			travaux: toNumber(row["Travaux"]) ?? 0,
			valeurActuelle: toNumber(row["Valeur actuelle"]) ?? 0,
			revaloAnnuelle: toNumber(row["Revalo annuelle"]) ?? 0,
			montantEmprunte: toNumber(row["Montant emprunté"]) ?? 0,
			tauxCredit: toNumber(row["Taux crédit"]) ?? 0,
			dureeMois: toNumber(row["Durée (mois)"]) ?? 0,
			dateDebutCredit: optionalDate(row["Date début crédit"]),
			tauxAssurance: toNumber(row["Taux assurance"]) ?? 0,
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
		if (parsed.success) {
			results.push(parsed.data);
		} else if (failCount < 3) {
			failCount++;
			console.log("[Properties] FAIL:", JSON.stringify(row).slice(0, 200));
			console.log(
				"[Properties] error:",
				JSON.stringify(parsed.error).slice(0, 300),
			);
		}
	}
	console.log(`[Properties] ${results.length} OK / ${rows.length} total`);
	return results;
}

function parseManualPriceDate(value: unknown): Date {
	if (value instanceof Date) {
		return Number.isFinite(value.getTime()) ? value : new Date(Number.NaN);
	}
	if (typeof value === "number") {
		if (value > 25569 && value < 100000) {
			const msPerDay = 86400000;
			const epoch = new Date(Date.UTC(1899, 11, 30));
			return new Date(epoch.getTime() + value * msPerDay);
		}
		const parsed = new Date(value);
		return Number.isFinite(parsed.getTime()) ? parsed : new Date(Number.NaN);
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

function parseDca(rows: Record<string, unknown>[]): DcaConfig[] {
	const byId = new Map<
		string,
		{
			id: string;
			label: string;
			envelope: string;
			amount: number;
			frequency: string;
			paymentMonth?: number;
			lines: { label?: string; assetIds: string[]; targetPct: number }[];
		}
	>();
	const order: string[] = [];

	for (const row of rows) {
		const id = emptyToUndefined(row["ID"]);
		if (!id) continue;

		const assetIds = String(row["Actifs"] ?? "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);

		const existing = byId.get(id);
		if (assetIds.length === 0) {
			if (existing) continue;
			const monthStr = emptyToUndefined(row["Mois versement"]);
			const paymentMonth = monthStr
				? Math.round(Number(monthStr.replace(",", ".")))
				: undefined;
			byId.set(id, {
				id,
				label: emptyToUndefined(row["Libellé"]) ?? id,
				envelope: row["Enveloppe"] as string,
				amount: toNumber(row["Montant"]) ?? 0,
				frequency:
					emptyToUndefined(row["Fréquence"])?.toUpperCase() ?? "MENSUEL",
				paymentMonth:
					paymentMonth && paymentMonth >= 1 && paymentMonth <= 12
						? paymentMonth
						: undefined,
				lines: [],
			});
			order.push(id);
			continue;
		}

		const rawCible = toNumber(row["Cible %"]) ?? 0;
		const line = {
			label: emptyToUndefined(row["Panier"]),
			assetIds,
			targetPct: rawCible / 100,
		};

		if (existing) {
			existing.lines.push(line);
			continue;
		}

		const monthStr = emptyToUndefined(row["Mois versement"]);
		const paymentMonth = monthStr
			? Math.round(Number(monthStr.replace(",", ".")))
			: undefined;

		byId.set(id, {
			id,
			label: emptyToUndefined(row["Libellé"]) ?? id,
			envelope: row["Enveloppe"] as string,
			amount: toNumber(row["Montant"]) ?? 0,
			frequency: emptyToUndefined(row["Fréquence"])?.toUpperCase() ?? "MENSUEL",
			paymentMonth:
				paymentMonth && paymentMonth >= 1 && paymentMonth <= 12
					? paymentMonth
					: undefined,
			lines: [line],
		});
		order.push(id);
	}

	const results: DcaConfig[] = [];
	let failCount = 0;
	for (const id of order) {
		const parsed = DcaConfig.safeParse(byId.get(id));
		if (parsed.success) {
			results.push(parsed.data);
		} else if (failCount < 3) {
			failCount++;
			console.log("[DCA] FAIL:", JSON.stringify(byId.get(id)).slice(0, 200));
			console.log("[DCA] error:", JSON.stringify(parsed.error).slice(0, 300));
		}
	}
	console.log(`[DCA] ${results.length} OK / ${order.length} total`);
	return results;
}

function trimStr(value: unknown): string {
	if (value === null || value === undefined) return "";
	return String(value).trim();
}

function coerceDate(value: unknown): Date | string {
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) return new Date(0);
		return value;
	}
	if (typeof value === "number") {
		if (value > 25569 && value < 100000) {
			const msPerDay = 86400000;
			const epoch = new Date(Date.UTC(1899, 11, 30));
			return new Date(epoch.getTime() + value * msPerDay);
		}
		return new Date(value);
	}
	if (typeof value === "string" && value.length > 0) {
		const d = new Date(value);
		if (!Number.isNaN(d.getTime())) return d;
	}
	return new Date(0);
}

function optionalDate(value: unknown): Date | string | undefined {
	if (value === null || value === undefined || value === "") return undefined;
	return coerceDate(value);
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
