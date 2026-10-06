import Link from "next/link";
import type { TaxBracketObservation } from "@patrimo/core/tax-bracket";
import { Card, CardBody, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import { formatEuro } from "@/lib/utils";

const pasFormatter = new Intl.NumberFormat("fr-FR", {
	style: "percent",
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

const tmiFormatter = new Intl.NumberFormat("fr-FR", {
	style: "percent",
	minimumFractionDigits: 0,
	maximumFractionDigits: 0,
});

function formatPas(rate: number | null): string {
	if (rate === null || !Number.isFinite(rate)) return "—";
	return pasFormatter.format(rate);
}

export function TaxBracketObservationCard({
	observation,
	readOnly = false,
}: {
	observation: TaxBracketObservation;
	readOnly?: boolean;
}) {
	if (observation.status !== "ok") {
		const cta =
			observation.reason === "no_revenu"
				? "Ajoute un revenu au Budget, ou saisis un montant manuel sur Fiscalité."
				: "Configure le foyer fiscal pour voir la tranche, l'IR indicatif et le PAS conseillé.";
		return (
			<Card>
				<CardHeader>
					<CardTitle>Tranche d&apos;imposition</CardTitle>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">{cta}</p>
					<p className="text-sm">
						<Link href="/fiscalite" className="text-indigo-600 underline dark:text-indigo-400">
							Fiscalité
						</Link>
					</p>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<CardTitle>Tranche d&apos;imposition</CardTitle>
					<p className="text-xs text-zinc-500">Barème revenus {observation.incomeYear}</p>
				</div>
				<CardValue>{tmiFormatter.format(observation.tmi)} TMI</CardValue>
				<p className="text-xs text-zinc-500">Taux marginal — distinct du PAS moyen conseillé</p>
			</CardHeader>
			<CardBody className="space-y-3">
				<dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
					<div>
						<dt className="text-zinc-500">IR annuel indicatif</dt>
						<dd className="font-mono tabular-nums">{formatEuro(observation.irAnnuelIndicatif)}</dd>
					</div>
					<div>
						<dt className="text-zinc-500">IR mensuel</dt>
						<dd className="font-mono tabular-nums">{formatEuro(observation.irMensuelIndicatif)}</dd>
					</div>
					<div>
						<dt className="text-zinc-500">Taux PAS conseillé</dt>
						<dd className="font-mono tabular-nums">
							{formatPas(observation.tauxPrelevementConseille)}
						</dd>
					</div>
					<div>
						<dt className="text-zinc-500">Marge avant tranche suivante</dt>
						<dd className="font-mono tabular-nums">
							{observation.roomToNextBracket === null
								? "Dernière tranche"
								: formatEuro(observation.roomToNextBracket)}
						</dd>
					</div>
				</dl>
				<p className="text-xs leading-relaxed text-zinc-500">
					Chiffres indicatifs, pas un avis d&apos;impôt : pas de décote, pas de plafond
					du quotient familial, pas de CEHR. Les frais professionnels min/max peuvent
					décaler du millésime du barème.
				</p>
				{observation.strongerDisclaimer && (
					<p className="text-xs text-amber-800 dark:text-amber-200">
						Le revenu net / Budget est un proxy de RNI (pas d&apos;abattement 10 %).
					</p>
				)}
				{readOnly && (
					<p className="text-sm">
						<Link href="/fiscalite" className="text-indigo-600 underline dark:text-indigo-400">
							Fiscalité
						</Link>
						{" — configurer le foyer"}
					</p>
				)}
			</CardBody>
		</Card>
	);
}
