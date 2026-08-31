"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { MonthlyDcaTilt } from "@patrimo/core/monthly-dca-tilt";
import { DcaPlanner } from "@/app/dca/dca-planner";
import { DeletePropertyButton } from "@/app/immobilier/delete-property-button";
import { PropertyForm } from "@/app/immobilier/property-form";
import {
	RetirementProfileForm,
} from "@/components/retirement-profile-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { propertySnapshot } from "@/lib/realestate/projection";
import { loanEndDate } from "@/lib/realestate/property";
import type {
	Asset,
	DcaConfig,
	Detention,
	Property,
	PropertyRegime,
	RetirementProfile,
} from "@/lib/schema";
import {
	cn,
	formatDate,
	formatEuro,
	formatPercent,
	signClass,
} from "@/lib/utils";
import { DcaExecutionCalculator } from "./dca-execution";

type SerializedProperty = Omit<
	Property,
	"dateAcquisition" | "dateDebutCredit"
> & {
	dateAcquisition?: string;
	dateDebutCredit?: string;
};

const REGIME_LABELS: Record<PropertyRegime, string> = {
	IR_REEL: "IR réel",
	IR_MICRO: "Micro-foncier",
	LMNP_REEL: "LMNP réel",
	LMNP_MICRO: "LMNP micro-BIC",
	IS: "IS",
	RESIDENCE_PRINCIPALE: "Résidence principale",
};

const DETENTION_LABELS: Record<Detention, string> = {
	SCI: "SCI",
	DIRECT: "Direct",
};

type Props = {
	configs: DcaConfig[];
	portfolioByEnvelope: Record<string, Record<string, number>>;
	assets: Asset[];
	seedConfig: DcaConfig | null;
	priceMap: Record<string, number>;
	monthlyTilt: MonthlyDcaTilt | null;
	initialProfile: RetirementProfile;
	properties: SerializedProperty[];
};

type Tab = "dca" | "execution" | "retraite" | "immobilier";

const TABS: { key: Tab; label: string }[] = [
	{ key: "dca", label: "Plans DCA" },
	{ key: "execution", label: "Exécution" },
	{ key: "retraite", label: "Retraite" },
	{ key: "immobilier", label: "Immobilier" },
];

export function InvestissementsClient({
	configs,
	portfolioByEnvelope,
	assets,
	seedConfig,
	priceMap,
	monthlyTilt,
	initialProfile,
	properties,
}: Props) {
	const searchParams = useSearchParams();
	const initialTab = searchParams.get("tab");
	const [tab, setTab] = useState<Tab>(
		initialTab === "execution" ||
			initialTab === "retraite" ||
			initialTab === "immobilier"
			? initialTab
			: "dca",
	);

	useEffect(() => {
		if (
			initialTab === "execution" ||
			initialTab === "retraite" ||
			initialTab === "immobilier"
		) {
			setTab(initialTab);
		}
	}, [initialTab]);

	return (
		<div className="space-y-6">
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

			{tab === "dca" && (
				<DcaPlanner
					configs={configs}
					portfolioByEnvelope={portfolioByEnvelope}
					assets={assets}
					seedConfig={seedConfig}
				/>
			)}

			{tab === "execution" && (
				<DcaExecutionCalculator
					configs={configs}
					priceMap={priceMap}
					portfolioByEnvelope={portfolioByEnvelope}
					assets={assets}
					monthlyTilt={monthlyTilt}
				/>
			)}

			{tab === "retraite" && (
				<div className="space-y-4">
					<RetirementProfileForm
						initialProfile={initialProfile}
						refreshOnBirthDateChange={false}
					/>
					<p className="text-xs text-zinc-500">
						Projections détaillées sur la page{" "}
						<Link href="/retraite" className="underline">
							Retraite
						</Link>
						.
					</p>
				</div>
			)}

			{tab === "immobilier" && <ImmobilierSection properties={properties} />}
		</div>
	);
}

function ImmobilierSection({
	properties,
}: {
	properties: SerializedProperty[];
}) {
	const deserializedProperties = properties.map((p) => ({
		...p,
		dateAcquisition: p.dateAcquisition
			? new Date(p.dateAcquisition)
			: undefined,
		dateDebutCredit: p.dateDebutCredit
			? new Date(p.dateDebutCredit)
			: undefined,
	})) as Property[];

	const snapshots = deserializedProperties.map((p) => propertySnapshot(p));

	const totals = snapshots.reduce(
		(acc, s) => {
			acc.value += s.property.valeurActuelle * s.property.partDetenue;
			acc.equity += s.equity;
			acc.debt += s.remainingLoan;
			acc.cashFlow += s.monthlyCashFlowAfterTax;
			return acc;
		},
		{ value: 0, equity: 0, debt: 0, cashFlow: 0 },
	);

	return (
		<div className="space-y-4">
			<PropertyForm />

			{deserializedProperties.length === 0 ? (
				<Card>
					<CardBody className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
						Aucun bien pour le moment. Ajoute ton premier bien immobilier.
					</CardBody>
				</Card>
			) : (
				<>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<SummaryCard title="Valeur des biens" value={totals.value} />
						<SummaryCard title="Équité nette" value={totals.equity} />
						<SummaryCard title="Capital restant dû" value={totals.debt} />
						<Card>
							<CardHeader>
								<CardTitle>Cash-flow mensuel net</CardTitle>
								<p
									className={`text-2xl font-semibold ${signClass(totals.cashFlow)}`}
								>
									{formatEuro(totals.cashFlow)}
								</p>
							</CardHeader>
						</Card>
					</div>

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{snapshots.map((s) => {
							const p = s.property;
							const creditEnd = loanEndDate(p);
							const value = p.valeurActuelle * p.partDetenue;
							const isResidence = p.regime === "RESIDENCE_PRINCIPALE";
							return (
								<Card key={p.id}>
									<CardHeader className="flex flex-row items-start justify-between gap-2">
										<div>
											<CardTitle className="text-base">{p.label}</CardTitle>
											<div className="mt-1 flex flex-wrap items-center gap-2">
												<Badge variant="info">
													{DETENTION_LABELS[p.detention]}
												</Badge>
												<Badge variant="default">
													{REGIME_LABELS[p.regime]}
												</Badge>
												{p.partDetenue < 1 && (
													<span className="text-xs text-zinc-400">
														{formatPercent(p.partDetenue)} détenu
													</span>
												)}
											</div>
										</div>
										<div className="flex items-center gap-1">
											<PropertyForm property={p} trigger="icon" />
											<DeletePropertyButton id={p.id} label={p.label} />
										</div>
									</CardHeader>
									<CardBody>
										<dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
											<Row label="Valeur" value={formatEuro(value)} />
											<Row
												label="Capital restant dû"
												value={formatEuro(s.remainingLoan)}
											/>
											<Row label="Équité" value={formatEuro(s.equity)} strong />
											<Row
												label="Mensualité (crédit + assurance)"
												value={formatEuro(s.monthlyPayment)}
											/>
											{creditEnd && (
												<Row
													label="Fin de crédit (estimée)"
													value={formatDate(creditEnd)}
												/>
											)}
											<Row
												label={
													isResidence ? "Coût mensuel" : "Cash-flow mensuel net"
												}
												value={formatEuro(s.monthlyCashFlowAfterTax)}
												className={signClass(s.monthlyCashFlowAfterTax)}
											/>
											{!isResidence && (
												<>
													<Row
														label="Rendement brut"
														value={formatPercent(s.grossYield)}
													/>
													<Row
														label="Rendement net (après impôt)"
														value={formatPercent(s.netYield)}
														className={signClass(s.netYield)}
													/>
												</>
											)}
										</dl>
									</CardBody>
								</Card>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}

function SummaryCard({ title, value }: { title: string; value: number }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<p className="text-2xl font-semibold tracking-tight">
					{formatEuro(value)}
				</p>
			</CardHeader>
		</Card>
	);
}

function Row({
	label,
	value,
	strong,
	className,
}: {
	label: string;
	value: string;
	strong?: boolean;
	className?: string;
}) {
	return (
		<div className="flex flex-col gap-0.5">
			<dt className="text-xs uppercase tracking-wider text-zinc-500">
				{label}
			</dt>
			<dd
				className={`font-mono tabular-nums ${strong ? "text-base font-semibold" : ""} ${className ?? ""}`}
			>
				{value}
			</dd>
		</div>
	);
}
