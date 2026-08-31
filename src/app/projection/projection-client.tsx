"use client";

import {
	normalizeRetirementProfile,
	serializeRetirementProfileForWrite,
	yearsUntilCivilDate,
	type PensionScenarioType,
} from "@patrimo/core/retirement-profile";
import { PENSION_BRUT_TO_NET_APPROX } from "@patrimo/core/retraite";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { PENSION_SCENARIO_LABELS } from "@/lib/pension-scenario-labels";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DEFAULT_OVERFLOW_ENVELOPE,
	projectEnvelopesWithOverflow,
} from "@/lib/projection";
import { RetirementProfile, type Envelope } from "@/lib/schema";
import { cn, formatDate, formatEuro, formatPercent } from "@/lib/utils";
import {
	EnvelopeProjection,
	type EnvelopeProjectionInput,
} from "./envelope-projection";
import type { GoalsAlignmentInput } from "./goals-alignment-panel";
import {
	RealEstateProjection,
	type SerializedProperty,
} from "./realestate-projection";

export type RetirementBlockInput = {
	profile: {
		birthDate?: string;
		activeScenario?: PensionScenarioType;
		scenarios: Partial<
			Record<
				PensionScenarioType,
				{ startDate?: string; grossMonthly?: number }
			>
		>;
	};
	filledScenarios: {
		type: PensionScenarioType;
		startDate: string;
		grossMonthly: number;
	}[];
	monthlyRealEstateNet: number;
	resolved: {
		type: PensionScenarioType;
		startDate: string;
		horizonYears: number;
		grossMonthly: number;
		netMonthly: number;
	} | null;
};

type Tab = "envelopes" | "immobilier";

const TABS: { key: Tab; label: string }[] = [
	{ key: "envelopes", label: "Par enveloppe" },
	{ key: "immobilier", label: "Immobilier" },
];

function parseNumber(value: string): number {
	const n = Number(value.replace(",", ".").replace(/\s/g, ""));
	return Number.isFinite(n) ? n : 0;
}

function hydrateProfile(input: RetirementBlockInput["profile"]): RetirementProfile {
	const scenarios: RetirementProfile["scenarios"] = {};
	for (const [type, slot] of Object.entries(input.scenarios)) {
		if (!slot) continue;
		scenarios[type as PensionScenarioType] = {
			startDate: slot.startDate
				? new Date(`${slot.startDate}T00:00:00.000Z`)
				: undefined,
			grossMonthly: slot.grossMonthly,
		};
	}
	return normalizeRetirementProfile(
		RetirementProfile.parse({
			birthDate: input.birthDate
				? new Date(input.birthDate)
				: undefined,
			scenarios,
			activeScenario: input.activeScenario,
		}),
	);
}

export type InflationView = { rate: number };

export function ProjectionClient({
	monthlyRestant,
	envelopeInputs,
	envelopeRates,
	properties,
	inflationRate,
	retirement,
	goalsAlignment,
}: {
	monthlyRestant: number;
	envelopeInputs: EnvelopeProjectionInput[];
	envelopeRates: Record<Envelope, number>;
	properties: SerializedProperty[];
	inflationRate: number;
	retirement: RetirementBlockInput;
	goalsAlignment: GoalsAlignmentInput | null;
}) {
	const [tab, setTab] = useState<Tab>("envelopes");
	const [rateInput, setRateInput] = useState(
		String(Math.round(inflationRate * 1000) / 10),
	);

	const [rates, setRates] = useState<Record<string, string>>(() =>
		Object.entries(envelopeRates).reduce(
			(acc, [envelope, rate]) => {
				acc[envelope] = String(Math.round(rate * 1000) / 10);
				return acc;
			},
			{} as Record<string, string>,
		),
	);
	const [monthly, setMonthly] = useState<Record<string, string>>(() =>
		envelopeInputs.reduce(
			(acc, env) => {
				acc[env.envelope] = String(Math.max(0, env.monthlyDefault));
				return acc;
			},
			{} as Record<string, string>,
		),
	);
	const [overflowEnvelope, setOverflowEnvelope] = useState<Envelope>(
		DEFAULT_OVERFLOW_ENVELOPE,
	);

	const effectiveRate = Math.max(0, parseNumber(rateInput) / 100);
	const inflation: InflationView = { rate: effectiveRate };

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
					{TABS.map((t) => (
						<button
							key={t.key}
							type="button"
							onClick={() => setTab(t.key)}
							className={cn(
								"rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
								tab === t.key
									? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
									: "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100",
							)}
						>
							{t.label}
						</button>
					))}
				</div>

				<label className="flex items-center gap-1.5 text-xs text-zinc-500">
					Inflation
					<input
						type="text"
						inputMode="decimal"
						value={rateInput}
						onChange={(e) => setRateInput(e.target.value)}
						className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
					/>
					%
				</label>
			</div>

			{tab === "envelopes" && (
				<div className="space-y-8">
					<EnvelopeProjection
						envelopes={envelopeInputs}
						monthlyRestant={monthlyRestant}
						inflation={inflation}
						monthly={monthly}
						setMonthly={setMonthly}
						rates={rates}
						setRates={setRates}
						overflowEnvelope={overflowEnvelope}
						setOverflowEnvelope={setOverflowEnvelope}
						goalsAlignment={goalsAlignment}
					/>

					<RetirementIncomeCard
						retirement={retirement}
						envelopeInputs={envelopeInputs}
						inflation={inflation}
						monthly={monthly}
						rates={rates}
						overflowEnvelope={overflowEnvelope}
					/>
				</div>
			)}

			{tab === "immobilier" && (
				<RealEstateProjection properties={properties} inflation={inflation} />
			)}
		</div>
	);
}

function RetirementIncomeCard({
	retirement,
	envelopeInputs,
	inflation,
	monthly,
	rates,
	overflowEnvelope,
}: {
	retirement: RetirementBlockInput;
	envelopeInputs: EnvelopeProjectionInput[];
	inflation: InflationView;
	monthly: Record<string, string>;
	rates: Record<string, string>;
	overflowEnvelope: Envelope;
}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [activeType, setActiveType] = useState<PensionScenarioType | "">(
		retirement.resolved?.type ?? retirement.profile.activeScenario ?? "",
	);

	const selectedScenario = useMemo(() => {
		if (!activeType) return null;
		return (
			retirement.filledScenarios.find((s) => s.type === activeType) ?? null
		);
	}, [activeType, retirement.filledScenarios]);

	const horizonYears = selectedScenario
		? yearsUntilCivilDate(
				new Date(`${selectedScenario.startDate}T00:00:00.000Z`),
			)
		: null;

	const grossMonthly = selectedScenario?.grossMonthly ?? 0;
	const netMonthly = grossMonthly * PENSION_BRUT_TO_NET_APPROX;
	const netRealMonthly =
		horizonYears !== null
			? netMonthly / (1 + inflation.rate) ** horizonYears
			: 0;

	const rateOf = useCallback(
		(envelope: Envelope): number => parseNumber(rates[envelope] ?? "0") / 100,
		[rates],
	);

	const monthlyOf = useCallback(
		(input: EnvelopeProjectionInput): number => {
			const raw = monthly[input.envelope];
			return Math.max(
				0,
				raw === undefined ? input.monthlyDefault : parseNumber(raw),
			);
		},
		[monthly],
	);

	const projections = useMemo(() => {
		if (horizonYears === null) return [];
		const specs = envelopeInputs.map((env) => ({
			envelope: env.envelope,
			startBalance: env.currentValue,
			contributions: [
				{ amount: monthlyOf(env), frequency: "MENSUEL" as const },
				...env.extraContributions,
			],
			annualRate: rateOf(env.envelope),
			plafond: env.plafond,
		}));
		if (!specs.some((s) => s.envelope === overflowEnvelope)) {
			specs.push({
				envelope: overflowEnvelope,
				startBalance: 0,
				contributions: [],
				annualRate: rateOf(overflowEnvelope),
				plafond: undefined,
			});
		}
		const { projections: rows } = projectEnvelopesWithOverflow({
			envelopes: specs,
			years: horizonYears,
			inflationRate: inflation.rate,
			overflowEnvelope,
		});
		return rows;
	}, [
		envelopeInputs,
		monthlyOf,
		rateOf,
		horizonYears,
		inflation.rate,
		overflowEnvelope,
	]);

	const projectedCapital = projections.reduce(
		(sum, p) => sum + p.result.finalValue,
		0,
	);

	const weightedRate = useMemo(() => {
		if (projectedCapital <= 0) return 0;
		return (
			projections.reduce(
				(sum, p) => sum + p.result.finalValue * rateOf(p.envelope),
				0,
			) / projectedCapital
		);
	}, [projections, projectedCapital, rateOf]);

	const annualReturns = projectedCapital * weightedRate;
	const monthlyFromCapital = annualReturns / 12;

	const realMonthlyFromCapital =
		horizonYears !== null
			? monthlyFromCapital / (1 + inflation.rate) ** horizonYears
			: 0;

	const totalMonthly =
		monthlyFromCapital + netMonthly + retirement.monthlyRealEstateNet;
	const totalReal =
		realMonthlyFromCapital + netRealMonthly + retirement.monthlyRealEstateNet;

	async function persistActiveScenario(type: PensionScenarioType) {
		const profile = hydrateProfile(retirement.profile);
		const next = normalizeRetirementProfile({
			...profile,
			activeScenario: type,
		});
		const body = serializeRetirementProfileForWrite(next);
		const res = await fetch("/api/retirement-profile", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		if (res.ok) {
			setActiveType(type);
			startTransition(() => router.refresh());
		}
	}

	if (retirement.filledScenarios.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>
						Revenu mensuel à la retraite (sans toucher au capital)
					</CardTitle>
				</CardHeader>
				<CardBody>
					<p className="text-sm text-amber-800 dark:text-amber-200">
						Renseigne un scénario de pension publique (date + montant brut) dans{" "}
						<Link href="/retraite" className="underline">
							Retraite
						</Link>{" "}
						pour afficher cette projection.
					</p>
				</CardBody>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					Revenu mensuel à la retraite (sans toucher au capital)
				</CardTitle>
				{selectedScenario && horizonYears !== null ? (
					<p className="text-xs text-zinc-500 dark:text-zinc-400">
						Scénario{" "}
						{PENSION_SCENARIO_LABELS[selectedScenario.type]} — départ le{" "}
						{formatDate(new Date(`${selectedScenario.startDate}T00:00:00.000Z`))}{" "}
						(dans {Math.round(horizonYears)} ans) : combien tu peux retirer
						chaque mois en vivant uniquement sur les rendements de ton capital,
						sans l&apos;entamer.
					</p>
				) : (
					<p className="text-xs text-zinc-500 dark:text-zinc-400">
						Sélectionne un scénario renseigné pour calculer l&apos;horizon de
						ce bloc.
					</p>
				)}
			</CardHeader>
			<CardBody>
				<div className="mb-4 space-y-2">
					<p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
						Scénario pension publique
					</p>
					<div className="flex flex-wrap gap-2">
						{retirement.filledScenarios.map((scenario) => (
							<button
								key={scenario.type}
								type="button"
								disabled={pending}
								onClick={() => void persistActiveScenario(scenario.type)}
								className={cn(
									"rounded-lg border px-3 py-1.5 text-sm transition-colors",
									activeType === scenario.type
										? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
										: "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700",
								)}
							>
								{PENSION_SCENARIO_LABELS[scenario.type]}
							</button>
						))}
					</div>
				</div>

				{selectedScenario && horizonYears !== null ? (
					<>
						<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
							<div className="space-y-1">
								<p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
									Pension publique (brut)
								</p>
								<p className="text-lg font-semibold tabular-nums">
									{formatEuro(grossMonthly)}
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
									Pension publique (net approx.)
								</p>
								<p className="text-lg font-semibold tabular-nums">
									{formatEuro(netMonthly)}
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
									Pension nette (réel)
								</p>
								<p className="text-lg font-semibold tabular-nums text-sky-600 dark:text-sky-400">
									{formatEuro(netRealMonthly)}
								</p>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
							<div className="space-y-1">
								<p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
									Capital projeté
								</p>
								<p className="text-xl font-semibold tabular-nums">
									{formatEuro(projectedCapital)}
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
									Rendement moyen pondéré
								</p>
								<p className="text-xl font-semibold tabular-nums">
									{formatPercent(weightedRate)}
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
									Intérêts mensuels (nominal)
								</p>
								<p className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
									{formatEuro(monthlyFromCapital)}
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
									Intérêts mensuels (réel)
								</p>
								<p className="text-xl font-semibold tabular-nums text-sky-600 dark:text-sky-400">
									{formatEuro(realMonthlyFromCapital)}
								</p>
								<p className="text-xs text-zinc-400">
									ajusté de l&apos;inflation à {formatPercent(inflation.rate)}
								</p>
							</div>
						</div>

						<div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
							<p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
								Décomposition du revenu mensuel total
							</p>
							<div className="space-y-2 text-sm">
								<div className="flex items-center justify-between">
									<span className="text-zinc-600 dark:text-zinc-300">
										Rendements du capital
									</span>
									<span className="font-mono font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
										{formatEuro(monthlyFromCapital)}
									</span>
								</div>
								{netMonthly > 0 && (
									<div className="flex items-center justify-between">
										<span className="text-zinc-600 dark:text-zinc-300">
											Pension publique (net approx.)
										</span>
										<span className="font-mono font-medium tabular-nums">
											{formatEuro(netMonthly)}
										</span>
									</div>
								)}
								{retirement.monthlyRealEstateNet > 0 && (
									<div className="flex items-center justify-between">
										<span className="text-zinc-600 dark:text-zinc-300">
											Loyers nets
										</span>
										<span className="font-mono font-medium tabular-nums">
											{formatEuro(retirement.monthlyRealEstateNet)}
										</span>
									</div>
								)}
								<div className="flex items-center justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800">
									<span className="font-semibold text-zinc-900 dark:text-zinc-50">
										Total mensuel (net)
									</span>
									<span className="font-mono text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
										{formatEuro(totalMonthly)}
									</span>
								</div>
								<div className="flex items-center justify-between text-xs text-zinc-500">
									<span>
										En pouvoir d&apos;achat (pension nette réelle + intérêts
										réels + loyers)
									</span>
									<span className="font-mono tabular-nums text-sky-600 dark:text-sky-400">
										{formatEuro(totalReal)}
									</span>
								</div>
							</div>
						</div>
					</>
				) : (
					<p className="text-sm text-amber-800 dark:text-amber-200">
						Renseigne et sélectionne un scénario actif pour afficher la
						projection.
					</p>
				)}
			</CardBody>
		</Card>
	);
}
