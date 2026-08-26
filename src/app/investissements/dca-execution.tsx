"use client";

import { useMemo, useState, useCallback } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { contributionsForConfig } from "@patrimo/core/monthly-dca-tilt";
import type { MonthlyDcaTilt } from "@patrimo/core/monthly-dca-tilt";
import { monthlyDcaTiltVerdictLabel } from "@patrimo/core/next-euro-copy";
import {
	getEmptyBasketLabels,
	splitLumpSumAcrossDcaPlans,
} from "@patrimo/core/dca";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
	computeDcaExecution,
	computeDcaExecutionFromContributions,
	computeDcaPlan,
	type DcaExecution,
} from "@/lib/dca";
import type { Asset, DcaConfig, Envelope } from "@/lib/schema";
import { formatEuro } from "@/lib/utils";

const DEFAULT_MIN_ORDERS: Partial<Record<Envelope, number>> = {
	PEA: 200,
};

const ENVELOPE_LABELS: Record<Envelope, string> = {
	CTO: "CTO",
	PEA: "PEA",
	PEE: "PEE",
	AV: "Assurance-vie",
	LIVRET: "Livret",
	PER: "PER",
};

const inputClasses =
	"rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

function allAssetIdsFromConfigs(configs: DcaConfig[]): Set<string> {
	const ids = new Set<string>();
	for (const config of configs) {
		for (const line of config.lines) {
			for (const id of line.assetIds) {
				ids.add(id);
			}
		}
	}
	return ids;
}

type Props = {
	configs: DcaConfig[];
	priceMap: Record<string, number>;
	portfolioByEnvelope: Record<string, Record<string, number>>;
	assets: Asset[];
	monthlyTilt: MonthlyDcaTilt | null;
};

function defaultSelectedPlanIds(configs: DcaConfig[]): Set<string> {
	return new Set(
		configs.filter((config) => config.envelope !== "LIVRET").map((config) => config.id),
	);
}

export function DcaExecutionCalculator({
	configs,
	priceMap,
	portfolioByEnvelope,
	assets,
	monthlyTilt,
}: Props) {
	const tiltAvailable =
		monthlyTilt !== null &&
		(monthlyTilt.verdict === "tilt" || monthlyTilt.verdict === "adjust_plan");

	// D9 / ADR 0022: always start on saved DCA; tilt is opt-in and not persisted.
	const [useTilt, setUseTilt] = useState(false);

	const [lumpSumEnabled, setLumpSumEnabled] = useState(false);
	const [lumpSumTotal, setLumpSumTotal] = useState("");
	const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(() =>
		defaultSelectedPlanIds(configs),
	);

	const [minOrders, setMinOrders] = useState<Record<string, string>>(() => {
		const initial: Record<string, string> = {};
		for (const [env, value] of Object.entries(DEFAULT_MIN_ORDERS)) {
			initial[env] = String(value);
		}
		return initial;
	});

	const [amountOverrides, setAmountOverrides] = useState<Record<string, string>>(
		{},
	);

	const [enabledAssetIds, setEnabledAssetIds] = useState<Set<string>>(() =>
		allAssetIdsFromConfigs(configs),
	);

	const toggleAssetEnabled = useCallback((assetId: string) => {
		setEnabledAssetIds((prev) => {
			const next = new Set(prev);
			if (next.has(assetId)) {
				next.delete(assetId);
			} else {
				next.add(assetId);
			}
			return next;
		});
	}, []);

	const setAmountOverride = useCallback((configId: string, value: string) => {
		setAmountOverrides((prev) => ({ ...prev, [configId]: value }));
	}, []);

	const resetAmountOverride = useCallback((configId: string) => {
		setAmountOverrides((prev) => {
			const next = { ...prev };
			delete next[configId];
			return next;
		});
	}, []);

	const handleLumpSumToggle = useCallback((enabled: boolean) => {
		setLumpSumEnabled(enabled);
		if (!enabled) {
			setAmountOverrides({});
		}
	}, []);

	const togglePlanSelection = useCallback((configId: string) => {
		setSelectedPlanIds((prev) => {
			const next = new Set(prev);
			if (next.has(configId)) {
				next.delete(configId);
			} else {
				next.add(configId);
			}
			return next;
		});
	}, []);

	const priceMapObj = useMemo(
		() => new Map(Object.entries(priceMap)),
		[priceMap],
	);

	const assetMap = useMemo(
		() => new Map(assets.map((a) => [a.id, a])),
		[assets],
	);

	const envelopesUsed = useMemo(
		() => [...new Set(configs.map((c) => c.envelope))],
		[configs],
	);

	const parsedMinOrders = useMemo(() => {
		const result: Partial<Record<Envelope, number>> = {};
		for (const [env, raw] of Object.entries(minOrders)) {
			const n = Number(raw.replace(",", "."));
			if (Number.isFinite(n) && n > 0) result[env as Envelope] = n;
		}
		return result;
	}, [minOrders]);

	function getMinOrder(envelope: Envelope): number {
		return parsedMinOrders[envelope] ?? 0;
	}

	const parsedAmountOverrides = useMemo(() => {
		const result: Record<string, number> = {};
		for (const [id, raw] of Object.entries(amountOverrides)) {
			const n = Number(raw.replace(",", "."));
			if (Number.isFinite(n) && n >= 0) result[id] = n;
		}
		return result;
	}, [amountOverrides]);

	const parsedLumpSumTotal = useMemo(() => {
		const n = Number(lumpSumTotal.replace(",", "."));
		return Number.isFinite(n) && n > 0 ? n : null;
	}, [lumpSumTotal]);

	const lumpSumActive = lumpSumEnabled && parsedLumpSumTotal !== null;

	const lumpSumSplit = useMemo(() => {
		if (!lumpSumActive) return null;
		return splitLumpSumAcrossDcaPlans({
			totalAmount: parsedLumpSumTotal,
			configs: configs.map((config) => ({
				id: config.id,
				amount: config.amount,
			})),
			selectedIds: [...selectedPlanIds],
		});
	}, [lumpSumActive, parsedLumpSumTotal, configs, selectedPlanIds]);

	const visibleConfigs = useMemo(() => {
		if (!lumpSumActive) return configs;
		if (selectedPlanIds.size === 0) return [];
		return configs.filter((config) => selectedPlanIds.has(config.id));
	}, [configs, lumpSumActive, selectedPlanIds]);

	const getEffectiveAmount = useCallback(
		(config: DcaConfig): number => {
			if (config.id in parsedAmountOverrides) {
				return parsedAmountOverrides[config.id];
			}
			if (lumpSumActive && selectedPlanIds.has(config.id)) {
				return lumpSumSplit?.byConfigId[config.id] ?? 0;
			}
			return config.amount;
		},
		[lumpSumActive, lumpSumSplit, parsedAmountOverrides, selectedPlanIds],
	);

	const executions = useMemo<DcaExecution[]>(() => {
		return visibleConfigs.map((config) => {
			const minOrder = parsedMinOrders[config.envelope] ?? 0;

			if (
				!lumpSumActive &&
				useTilt &&
				monthlyTilt &&
				config.envelope !== "LIVRET"
			) {
				const perConfig = contributionsForConfig(
					config,
					monthlyTilt.contributions,
				);
				if (Object.keys(perConfig).length > 0) {
					return computeDcaExecutionFromContributions(
						config.id,
						perConfig,
						priceMapObj,
						minOrder,
					);
				}
			}

			const currentValues = portfolioByEnvelope[config.envelope] ?? {};
			const effectiveConfig = {
				...config,
				amount: getEffectiveAmount(config),
			};
			const plan = computeDcaPlan(effectiveConfig, currentValues, {
				enabledAssetIds,
			});
			return computeDcaExecution(plan, priceMapObj, minOrder);
		});
	}, [
		visibleConfigs,
		portfolioByEnvelope,
		priceMapObj,
		parsedMinOrders,
		lumpSumActive,
		useTilt,
		monthlyTilt,
		getEffectiveAmount,
		enabledAssetIds,
	]);

	const soleZeroAmountWarning =
		lumpSumActive &&
		selectedPlanIds.size > 0 &&
		lumpSumSplit !== null &&
		!lumpSumSplit.hasEligiblePlans &&
		lumpSumSplit.zeroAmountSelectedIds.length > 0;

	if (configs.length === 0) return null;

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Versement ponctuel</CardTitle>
					<p className="text-xs text-zinc-500 dark:text-zinc-400">
						Investis une somme unique en la répartissant entre tes plans DCA
						sélectionnés (pro-rata des montants mensuels sauvegardés).
					</p>
				</CardHeader>
				<CardBody className="space-y-4">
					<label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
						<input
							type="checkbox"
							checked={lumpSumEnabled}
							onChange={(e) => handleLumpSumToggle(e.target.checked)}
							className="rounded border-zinc-300"
						/>
						Activer le versement ponctuel
					</label>
					{lumpSumEnabled && (
						<>
							<label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
								Montant total
								<div className="flex items-center gap-1">
									<input
										type="text"
										inputMode="decimal"
										value={lumpSumTotal}
										onChange={(e) => setLumpSumTotal(e.target.value)}
										placeholder="0"
										className={`w-32 font-mono ${inputClasses}`}
									/>
									<span className="text-xs text-zinc-400">€</span>
								</div>
							</label>
							<fieldset className="space-y-2">
								<legend className="text-xs font-medium uppercase tracking-wider text-zinc-500">
									Plans à alimenter
								</legend>
								{configs.map((config) => (
									<label
										key={config.id}
										className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
									>
										<input
											type="checkbox"
											checked={selectedPlanIds.has(config.id)}
											onChange={() => togglePlanSelection(config.id)}
											className="rounded border-zinc-300"
										/>
										{config.label}
										<span className="text-xs text-zinc-400">
											({formatEuro(config.amount)}/mois)
										</span>
									</label>
								))}
							</fieldset>
							{soleZeroAmountWarning && (
								<div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
									<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
									<p>
										Les plans sélectionnés ont un montant mensuel à 0 € — aucun
										ordre calculé. Ajuste le plan DCA ou désélectionne-les.
									</p>
								</div>
							)}
							{lumpSumActive && lumpSumSplit?.hasEligiblePlans && (
								<p className="text-xs text-zinc-500 dark:text-zinc-400">
									Répartition automatique — tu peux ajuster le budget par plan
									après ventilation.
								</p>
							)}
						</>
					)}
				</CardBody>
			</Card>

			{lumpSumActive && selectedPlanIds.size === 0 && (
				<Card>
					<CardBody className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
						Sélectionne au moins un plan DCA pour ventiler le versement
						ponctuel.
					</CardBody>
				</Card>
			)}

			{monthlyTilt && !lumpSumActive && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Plan d&apos;achat du mois</CardTitle>
						<p className="text-xs text-zinc-500 dark:text-zinc-400">
							{useTilt && tiltAvailable
								? "Ordres calculés depuis l'ajustement diversification (Ajustement DCA du mois)."
								: "Ordres calculés depuis ton plan DCA sauvegardé."}
						</p>
					</CardHeader>
					<CardBody className="flex flex-wrap items-center gap-3">
						<Badge
							variant={
								useTilt && tiltAvailable ? "warning" : "success"
							}
						>
							{useTilt && tiltAvailable
								? monthlyDcaTiltVerdictLabel(monthlyTilt.verdict)
								: "Plan DCA sauvegardé"}
						</Badge>
						{tiltAvailable && (
							<label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
								<input
									type="checkbox"
									checked={useTilt}
									onChange={(e) => setUseTilt(e.target.checked)}
									className="rounded border-zinc-300"
								/>
								Appliquer l&apos;ajustement du mois (
								{formatEuro(monthlyTilt.monthlyPool)} investi)
							</label>
						)}
						{monthlyTilt.verdict === "aligned" && (
							<span className="text-sm text-zinc-600 dark:text-zinc-400">
								Aucun ajustement — le plan sauvegardé suffit ce mois-ci.
							</span>
						)}
					</CardBody>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Minimum par ordre</CardTitle>
					<p className="text-xs text-zinc-500 dark:text-zinc-400">
						Montant minimum exigé par ton courtier pour passer un ordre, par
						enveloppe. Laisse vide ou à 0 si pas de contrainte.
					</p>
				</CardHeader>
				<CardBody>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
						{envelopesUsed.map((envelope) => (
							<label
								key={envelope}
								className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-zinc-500"
							>
								{ENVELOPE_LABELS[envelope]}
								<div className="flex items-center gap-1">
									<input
										type="text"
										inputMode="decimal"
										value={minOrders[envelope] ?? ""}
										onChange={(e) =>
											setMinOrders((prev) => ({
												...prev,
												[envelope]: e.target.value,
											}))
										}
										placeholder="0"
										className={`w-20 ${inputClasses}`}
									/>
									<span className="text-xs text-zinc-400">€</span>
								</div>
							</label>
						))}
					</div>
				</CardBody>
			</Card>

			{executions.map((execution, i) => {
				const config = visibleConfigs[i];
				const minOrder = getMinOrder(config.envelope);
				const hasOverride = config.id in parsedAmountOverrides;
				const effectiveAmount = getEffectiveAmount(config);
				const isTiltRow =
					!lumpSumActive &&
					useTilt &&
					monthlyTilt &&
					config.envelope !== "LIVRET" &&
					Object.keys(
						contributionsForConfig(config, monthlyTilt.contributions),
					).length > 0;
				const budgetDisplayValue =
					config.id in amountOverrides
						? amountOverrides[config.id]
						: String(effectiveAmount);
				const resetBudgetLabel = lumpSumActive
					? `Revenir à la répartition automatique (${formatEuro(lumpSumSplit?.byConfigId[config.id] ?? config.amount)})`
					: `Revenir au montant du plan (${formatEuro(config.amount)})`;
				const showAssetSelection = !isTiltRow;
				const emptyBasketLabels = showAssetSelection
					? getEmptyBasketLabels(config, enabledAssetIds)
					: [];

				return (
					<Card key={execution.configId}>
						<CardHeader>
							<CardTitle className="text-base">{config.label}</CardTitle>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
								{!isTiltRow && (
									<label className="flex items-center gap-1.5">
										Budget :
										<div className="flex items-center gap-1">
											<input
												type="text"
												inputMode="decimal"
												value={budgetDisplayValue}
												onChange={(e) =>
													setAmountOverride(config.id, e.target.value)
												}
												className={`w-24 font-mono font-medium ${inputClasses} ${
													hasOverride
														? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
														: "text-zinc-700 dark:text-zinc-300"
												}`}
											/>
											<span className="text-xs text-zinc-400">€</span>
											{hasOverride && (
												<button
													type="button"
													onClick={() => resetAmountOverride(config.id)}
													className="rounded p-0.5 text-blue-500 transition-colors hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-300"
													title={resetBudgetLabel}
												>
													<RotateCcw className="h-3.5 w-3.5" />
												</button>
											)}
										</div>
									</label>
								)}
								{isTiltRow && monthlyTilt && (
									<span>
										Budget ajusté :{" "}
										<span className="font-mono font-medium text-amber-700 dark:text-amber-300">
											{formatEuro(
												Object.values(
													contributionsForConfig(
														config,
														monthlyTilt.contributions,
													),
												).reduce((s, v) => s + v, 0),
											)}
										</span>
									</span>
								)}
								<span>
									Total ordres:{" "}
									<span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
										{formatEuro(execution.totalOrderAmount)}
									</span>
								</span>
								{execution.totalRemainder > 0 && (
									<span>
										Reste:{" "}
										<span className="font-mono font-medium text-amber-600 dark:text-amber-400">
											{formatEuro(execution.totalRemainder)}
										</span>
									</span>
								)}
							</div>
						</CardHeader>
						<CardBody className="space-y-4 px-0">
							{emptyBasketLabels.length > 0 && (
								<div className="mx-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
									<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
									<p>
										Panier(s) sans actif coché ({emptyBasketLabels.join(", ")})
										— budget non alloué pour ce(s) panier(s).
									</p>
								</div>
							)}
							<Table>
								<THead>
									<TR>
										{showAssetSelection && (
											<TH className="w-10">
												<span className="sr-only">Alimenter ce mois-ci</span>
											</TH>
										)}
										<TH>Actif</TH>
										<TH className="text-right">Prix</TH>
										<TH className="text-right">Cible</TH>
										<TH className="text-right">Parts</TH>
										<TH className="text-right">Ordre</TH>
										<TH>Statut</TH>
									</TR>
								</THead>
								<TBody>
									{execution.lines.map((line) => {
										const asset = assetMap.get(line.assetId);
										const assetEnabled = enabledAssetIds.has(line.assetId);
										return (
											<TR key={line.assetId}>
												{showAssetSelection && (
													<TD>
														<label className="flex cursor-pointer items-center justify-center">
															<input
																type="checkbox"
																checked={assetEnabled}
																onChange={() =>
																	toggleAssetEnabled(line.assetId)
																}
																className="rounded border-zinc-300"
																aria-label={`Alimenter ce mois-ci — ${asset?.label ?? line.assetId}`}
															/>
														</label>
													</TD>
												)}
												<TD>
													<span className="font-medium text-zinc-900 dark:text-zinc-50">
														{asset?.label ?? line.assetId}
													</span>
												</TD>
												<TD className="text-right font-mono tabular-nums">
													{line.sharePrice > 0
														? formatEuro(line.sharePrice)
														: "—"}
												</TD>
												<TD className="text-right font-mono tabular-nums">
													{formatEuro(line.targetAmount)}
												</TD>
												<TD className="text-right font-mono tabular-nums font-semibold">
													{line.shares > 0
														? line.shares
														: line.fractionalShares
															? line.fractionalShares
																	.toFixed(6)
																	.replace(/0+$/, "")
																	.replace(/\.$/, "")
															: "—"}
												</TD>
												<TD className="text-right font-mono tabular-nums">
													{line.orderAmount > 0
														? formatEuro(line.orderAmount)
														: "—"}
												</TD>
												<TD>
													{line.status === "BUY" && (
														<Badge variant="success">Acheter</Badge>
													)}
													{line.status === "BUY_FRACTIONAL" && (
														<Badge variant="success">Fractionné</Badge>
													)}
													{line.status === "BELOW_MIN" && (
														<Badge variant="warning">Sous le minimum</Badge>
													)}
												</TD>
											</TR>
										);
									})}
								</TBody>
							</Table>

							{execution.rotation && (
								<div className="mx-6 flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900 dark:bg-sky-950/30">
									<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
									<div className="space-y-1 text-sm">
										<p className="font-medium text-sky-900 dark:text-sky-100">
											Conseil : rotation sur{" "}
											{execution.rotation.rotationMonths} mois
										</p>
										<p className="text-sky-700 dark:text-sky-300">
											{execution.rotation.rotationMonths > 1 ? (
												<>
													Concentre tout le budget sur{" "}
													<strong>
														{assetMap.get(execution.rotation.focusAssetId)
															?.label ?? execution.rotation.focusAssetId}
													</strong>{" "}
													ce mois-ci ({execution.rotation.focusShares} part
													{execution.rotation.focusShares > 1 ? "s" : ""} ={" "}
													{formatEuro(execution.rotation.focusOrderAmount)}),
													puis alterne avec les autres actifs le mois suivant.
												</>
											) : (
												<>
													Accumule pendant {execution.rotation.rotationMonths}{" "}
													mois pour{" "}
													<strong>
														{assetMap.get(execution.rotation.focusAssetId)
															?.label ?? execution.rotation.focusAssetId}
													</strong>{" "}
													({execution.rotation.focusShares} part
													{execution.rotation.focusShares > 1 ? "s" : ""} ={" "}
													{formatEuro(execution.rotation.focusOrderAmount)}).
												</>
											)}
											{minOrder > 0 && (
												<>
													{" "}
													Minimum de {formatEuro(minOrder)} respecté sur{" "}
													{ENVELOPE_LABELS[config.envelope]}.
												</>
											)}
										</p>
									</div>
								</div>
							)}
						</CardBody>
					</Card>
				);
			})}
		</div>
	);
}
