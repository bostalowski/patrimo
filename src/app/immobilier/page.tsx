import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { getProperties, getPropertyTaxes } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import {
	aggregatePropertySnapshots,
	loanInsuranceRuleLabelFr,
	propertySnapshot,
	REAL_ESTATE_ASSUMPTIONS_FR,
	REAL_ESTATE_EQUITY_DEFINITION_FR,
} from "@/lib/realestate/projection";
import { loanEndDate } from "@/lib/realestate/property";
import type { Detention, PropertyRegime } from "@/lib/schema";
import { formatDate, formatEuro, formatPercent, signClass } from "@/lib/utils";
import { DeletePropertyButton } from "./delete-property-button";
import { PropertyForm } from "./property-form";

export const dynamic = "force-dynamic";

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

export default function ImmobilierPage() {
	requireExcelConfigured();
	const properties = getProperties();
	const propertyTaxes = getPropertyTaxes();
	const snapshots = properties.map((p) =>
		propertySnapshot(
			p,
			undefined,
			[],
			propertyTaxes.filter((entry) => entry.propertyId === p.id),
		),
	);

	const totals = aggregatePropertySnapshots(snapshots);

	return (
		<div className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold tracking-tight">Immobilier</h1>
				<p className="text-sm text-zinc-500 dark:text-zinc-400">
					Biens détenus en SCI : coût du crédit, cash-flow locatif net de
					fiscalité et patrimoine net.
				</p>
				<p className="mt-2 text-xs leading-relaxed text-zinc-400">
					{REAL_ESTATE_EQUITY_DEFINITION_FR}
				</p>
			</header>

			<PropertyForm />

			{properties.length === 0 ? (
				<Card>
					<CardBody className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
						Aucun bien pour le moment. Ajoute ton premier bien immobilier en
						SCI.
					</CardBody>
				</Card>
			) : (
				<>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<SummaryCard title="Valeur des biens" value={totals.value} />
						<SummaryCard title="Patrimoine net" value={totals.equity} />
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
											<PropertyForm
												property={p}
												trigger="icon"
												propertyTaxes={propertyTaxes
													.filter((entry) => entry.propertyId === p.id)
													.map((entry) => ({
														year: entry.year,
														amount: entry.amount,
													}))}
											/>
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
											<Row
												label="Patrimoine net"
												value={formatEuro(s.equity)}
												strong
											/>
											<Row
												label="Mensualité (crédit + assurance)"
												value={formatEuro(s.monthlyPayment)}
											/>
											<Row
												label="Règle assurance"
												value={loanInsuranceRuleLabelFr(p)}
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
														label="Cash-on-cash après impôt"
														value={formatPercent(s.netYield)}
														className={signClass(s.netYield)}
													/>
													<Row
														label="Impôt foncier annuel"
														value={formatEuro(s.annualTaxFoncier)}
													/>
												</>
											)}
											<Row
												label="Taxe foncière"
												value={formatEuro(s.currentPropertyTax)}
											/>
										</dl>
										{s.warnings.length > 0 && (
											<ul className="mt-3 space-y-1 text-xs text-amber-700 dark:text-amber-400">
												{s.warnings.map((w) => (
													<li key={w}>{w}</li>
												))}
											</ul>
										)}
									</CardBody>
								</Card>
							);
						})}
					</div>
				</>
			)}

			<p className="text-xs leading-relaxed text-zinc-400">
				{REAL_ESTATE_ASSUMPTIONS_FR}
			</p>
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
