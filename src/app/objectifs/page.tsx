import { Target } from "lucide-react";
import { assessFinancialGoals } from "@patrimo/core/financial-goals";
import { GoalsAssessmentPanel } from "@/app/objectifs/goals-assessment";
import { GoalsEditor } from "@/app/objectifs/goals-editor";
import { getInflationRate } from "@/lib/config";
import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap, readRetirementProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ObjectifsPage() {
	requireExcelConfigured();
	const workbook = loadWorkbook();
	const [priceMap, profile] = await Promise.all([
		readPriceMap(workbook.assets),
		readRetirementProfile(),
	]);
	const portfolio = buildPortfolio(workbook, priceMap);
	const inflationRate = getInflationRate();
	const assessment = assessFinancialGoals({
		goals: workbook.financialGoals ?? [],
		portfolio,
		dcaConfigs: workbook.dca,
		profile,
		inflationRate,
	});

	return (
		<div className="space-y-6">
			<header>
				<h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
					<Target className="h-6 w-6" />
					Objectifs
				</h1>
				<p className="text-sm text-zinc-500 dark:text-zinc-400">
					Combien te faut-il de placements pour viser un revenu ou un capital
					à une date — écart stock aujourd&apos;hui, hors scénario de
					rendement (voir Projection).
				</p>
			</header>

			<GoalsEditor initialGoals={workbook.financialGoals ?? []} />
			<GoalsAssessmentPanel assessment={assessment} />
		</div>
	);
}
