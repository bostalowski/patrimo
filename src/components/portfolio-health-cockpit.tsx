import type {
	PortfolioHealthCockpit,
	PortfolioHealthTone,
} from "@patrimo/core/portfolio-health-cockpit";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

const TONE_BADGE: Record<
	PortfolioHealthTone,
	"success" | "warning" | "danger"
> = {
	ok: "success",
	watch: "warning",
	breach: "danger",
};

const TONE_LABEL: Record<PortfolioHealthTone, string> = {
	ok: "OK",
	watch: "À surveiller",
	breach: "À traiter",
};

export function PortfolioHealthCockpitCard({
	cockpit,
}: {
	cockpit: PortfolioHealthCockpit | null;
}) {
	if (!cockpit) return null;

	return (
		<Card data-testid="portfolio-health-cockpit">
			<CardHeader>
				<CardTitle>Santé du portefeuille</CardTitle>
				<p className="text-xs text-zinc-500">
					Vue d&apos;ensemble — chaque indicateur ouvre le détail.
				</p>
			</CardHeader>
			<CardBody className="space-y-3 pt-0">
				{cockpit.pills.length > 0 && (
					<ul className="flex flex-wrap gap-2">
						{cockpit.pills.map((pill) => (
							<li key={pill.id}>
								<Link
									href={pill.href}
									className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
								>
									<span className="font-medium text-zinc-800 dark:text-zinc-100">
										{pill.label}
									</span>
									<Badge variant={TONE_BADGE[pill.tone]}>
										{TONE_LABEL[pill.tone]}
									</Badge>
								</Link>
							</li>
						))}
					</ul>
				)}
				<p className="text-sm text-zinc-700 dark:text-zinc-300">
					<span className="font-medium text-zinc-900 dark:text-zinc-100">
						Prochaine action :{" "}
					</span>
					<Link
						href={cockpit.nextAction.href}
						className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500 dark:decoration-zinc-600 dark:hover:decoration-zinc-400"
					>
						{cockpit.nextAction.sentence}
					</Link>
				</p>
			</CardBody>
		</Card>
	);
}
