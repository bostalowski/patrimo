"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
	RetirementProfileForm,
} from "@/components/retirement-profile-form";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardBody,
	CardHeader,
	CardTitle,
	CardValue,
} from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { Envelope, RetirementProfile } from "@/lib/schema";
import {
	computeSustainableIncome,
	type RetirementScenarioBlock,
	type SustainableIncome,
	type TimelineEntry,
} from "@/lib/retraite";
import { SCENARIO_PRESETS, type ScenarioKey } from "@/lib/projection";
import { formatDate, formatEuro, formatPercent } from "@/lib/utils";

const SCENARIO_COLORS: Record<ScenarioKey, string> = {
	prudent: "#0ea5e9",
	modere: "#10b981",
	dynamique: "#8b5cf6",
};

const ENVELOPE_LABELS: Record<Envelope, string> = {
	CTO: "CTO",
	PEA: "PEA",
	PEE: "PEE / FCPE",
	AV: "Assurance-vie",
	LIVRET: "Livret",
	PER: "PER",
};

type SerializedHorizon = {
	horizonYears: number;
	retirementDate: string;
	scenarioLabel: string;
} | null;

type Props = {
	initialProfile: RetirementProfile;
	horizon: SerializedHorizon;
	scenarios: RetirementScenarioBlock[];
	monthlyRealEstateNet: number;
	timeline: TimelineEntry[];
	inflationRate: number;
};

export function RetraiteClient({
	initialProfile,
	horizon,
	scenarios,
	monthlyRealEstateNet,
	timeline,
	inflationRate,
}: Props) {
	const incomeRows: SustainableIncome[] = useMemo(() => {
		return scenarios.map((scenario) => {
			const preset = SCENARIO_PRESETS.find((p) => p.key === scenario.scenario);
			return computeSustainableIncome(
				initialProfile,
				scenario,
				monthlyRealEstateNet,
				preset?.rate ?? 0,
			);
		});
	}, [initialProfile, scenarios, monthlyRealEstateNet]);

	return (
		<div className="space-y-8">
			<RetirementProfileForm initialProfile={initialProfile} />

			{horizon ? (
				<div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
					<p>
						<span className="font-medium">Scénario actif</span>{" "}
						{horizon.scenarioLabel} —{" "}
						<span className="font-medium">Horizon</span>{" "}
						{horizon.horizonYears.toFixed(1)} ans —{" "}
						<span className="font-medium">Date de départ</span>{" "}
						{formatDate(new Date(horizon.retirementDate))}
					</p>
				</div>
			) : (
				<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
					Renseigne un scénario de pension publique complet (date + montant
					brut), puis sélectionne le scénario actif sur{" "}
					<Link href="/projection" className="underline">
						Projection
					</Link>
					. Sans scénario actif renseigné, aucun horizon de projection
					n&apos;est inventé.
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Timeline</CardTitle>
					<p className="text-xs text-zinc-500">
						Jalons PEA (5 ans), AV (8 ans) et retraite visée, triés par date.
					</p>
				</CardHeader>
				<CardBody>
					{timeline.length === 0 ? (
						<p className="text-sm text-zinc-500">Aucun jalon pour l&apos;instant.</p>
					) : (
						<ul className="space-y-3 border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
							{timeline.map((item) => (
								<li key={`${item.label}-${item.date}`} className="relative text-sm">
									<span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
									<span className="font-medium text-zinc-900 dark:text-zinc-50">
										{item.label}
									</span>
									<span className="ml-2 font-mono text-xs text-zinc-500">
										{formatDate(new Date(item.date))}
									</span>
								</li>
							))}
						</ul>
					)}
				</CardBody>
			</Card>

			{!horizon || scenarios.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>Capital mobilisable (projection)</CardTitle>
					</CardHeader>
					<CardBody>
						<p className="text-sm text-amber-800 dark:text-amber-200">
							Sélectionne un scénario actif sur{" "}
							<Link href="/projection" className="underline">
								Projection
							</Link>{" "}
							pour projeter le capital jusqu&apos;à la date de départ.
						</p>
					</CardBody>
				</Card>
			) : (
				<>
					<div>
						<h2 className="mb-3 text-lg font-semibold tracking-tight">
							Capital mobilisable (projection)
						</h2>
						<p className="mb-4 text-xs text-zinc-500">
							Scénarios de rendement{" "}
							{SCENARIO_PRESETS.map((p) => p.label).join(" / ")}. Encours + DCA
							mensuel par enveloppe, immobilier hors résidence principale
							(equity en fin d&apos;horizon). Inflation{" "}
							{formatPercent(inflationRate)} pour la colonne réelle.
						</p>
						<div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
							{scenarios.map((block) => (
								<Card key={block.scenario}>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<span
												className="h-2.5 w-2.5 rounded-full"
												style={{
													backgroundColor: SCENARIO_COLORS[block.scenario],
												}}
											/>
											{block.label}
										</CardTitle>
										<CardValue>{formatEuro(block.totalNominal)}</CardValue>
										<p className="text-xs text-sky-600 dark:text-sky-400">
											≈ {formatEuro(block.totalReal)} après inflation
										</p>
									</CardHeader>
									<CardBody className="px-0 pt-0">
										<Table>
											<THead>
												<TR>
													<TH>Source</TH>
													<TH className="text-right">Nominal</TH>
													<TH className="text-right">Réel</TH>
												</TR>
											</THead>
											<TBody>
												{block.envelopes.map((row) => (
													<TR key={row.envelope}>
														<TD>{ENVELOPE_LABELS[row.envelope]}</TD>
														<TD className="text-right font-mono text-xs">
															{formatEuro(row.nominal)}
														</TD>
														<TD className="text-right font-mono text-xs text-zinc-500">
															{formatEuro(row.real)}
														</TD>
													</TR>
												))}
												<TR>
													<TD className="font-medium">Immo (equity)</TD>
													<TD className="text-right font-mono text-xs">
														{formatEuro(block.realEstateEquityNominal)}
													</TD>
													<TD className="text-right font-mono text-xs text-zinc-500">
														{formatEuro(block.realEstateEquityReal)}
													</TD>
												</TR>
											</TBody>
										</Table>
									</CardBody>
								</Card>
							))}
						</div>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>
								Revenu mensuel net estimé — sans grignoter le capital
							</CardTitle>
							<p className="text-xs leading-relaxed text-zinc-500">
								Combien tu peux retirer chaque mois en ne vivant que des{" "}
								<span className="font-medium text-zinc-700 dark:text-zinc-300">
									fruits du capital
								</span>{" "}
								(rendement nominal du scénario), sans toucher au principal. Tous
								les montants sont en net estimé.
							</p>
							<p className="text-xs leading-relaxed text-zinc-500">
								<span className="font-medium text-zinc-700 dark:text-zinc-300">
									Fiscalité
								</span>{" "}
								: taux moyen pondéré par enveloppe (Livret 0 %, PEA/PEE/AV 17,2 %,
								CTO 30 %, PER 30 %).{" "}
								<span className="font-medium text-zinc-700 dark:text-zinc-300">
									Loyers
								</span>{" "}
								: cash-flow déjà net de la dernière année à l&apos;horizon (crédit
								terminé si la durée est dépassée).
							</p>
						</CardHeader>
						<CardBody className="px-0">
							<Table>
								<THead>
									<TR>
										<TH>Scénario</TH>
										<TH
											className="text-right text-[0.65rem] leading-tight normal-case"
											title="Pension brute × 0,82 (prélèvements sociaux et CSG courants)."
										>
											Pension net
										</TH>
										<TH
											className="text-right text-[0.65rem] leading-tight normal-case"
											title="Capital financier projeté × rendement nominal / 12."
										>
											Fruits brut
										</TH>
										<TH
											className="text-right text-[0.65rem] leading-tight normal-case"
											title="Taux moyen pondéré par enveloppe appliqué aux fruits (Livret 0 %, PEA/PEE/AV 17,2 %, CTO/PER 30 %)."
										>
											Fiscalité
										</TH>
										<TH
											className="text-right text-[0.65rem] leading-tight normal-case"
											title="Fruits brut − fiscalité."
										>
											Fruits net
										</TH>
										<TH
											className="text-right text-[0.65rem] leading-tight normal-case"
											title="Cash-flow locatif net mensuel à l'horizon retraite (biens hors résidence principale)."
										>
											Loyers net
										</TH>
										<TH
											className="text-right text-[0.65rem] leading-tight normal-case"
											title="Pension net + fruits net + loyers net."
										>
											Net / mois
										</TH>
									</TR>
								</THead>
								<TBody>
									{incomeRows.map((row) => (
										<TR key={row.scenario}>
											<TD className="font-medium">
												{row.label}
												<span className="ml-1 text-[0.6rem] text-zinc-400">
													({formatPercent(row.nominalReturnRate)})
												</span>
											</TD>
											<TD className="text-right font-mono text-xs">
												{formatEuro(row.pensionNet)}
											</TD>
											<TD className="text-right font-mono text-xs">
												{formatEuro(row.fruitsBrut)}
											</TD>
											<TD className="text-right font-mono text-xs text-zinc-400">
												−{formatEuro(row.taxOnFruits)}
												<span className="ml-0.5 text-[0.6rem]">
													({formatPercent(row.avgTaxRate)})
												</span>
											</TD>
											<TD className="text-right font-mono text-xs">
												{formatEuro(row.fruitsNet)}
											</TD>
											<TD className="text-right font-mono text-xs">
												{formatEuro(row.realEstateRent)}
											</TD>
											<TD className="text-right font-semibold">
												<Badge variant="info">
													{formatEuro(row.totalNetMonthly)}
												</Badge>
											</TD>
										</TR>
									))}
								</TBody>
							</Table>
							<p className="px-6 pt-4 text-xs leading-relaxed text-zinc-400">
								Hypothèses : PEA/PEE/AV matures (prélèvements sociaux seuls), PER
								taxé au PFU, pas de conversion PER en rente, equity immobilière non
								redistribuée dans les fruits. Les montants sont nominaux (non
								corrigés de l&apos;inflation {formatPercent(inflationRate)}).
							</p>
						</CardBody>
					</Card>
				</>
			)}
		</div>
	);
}
