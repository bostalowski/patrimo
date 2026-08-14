import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap } from "@/lib/store";
import {
  allInAnnualCost,
  annualFeeDrag,
  estimatedAnnualTer,
  feeRatio,
  feesByAccount,
  feesByAsset,
  feesByType,
  feesByYear,
  feesToGainRatio,
} from "@/lib/fees";
import { FeesReport } from "./fees-report";

export const dynamic = "force-dynamic";

export default async function FraisPage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const priceMap = await readPriceMap(workbook.assets);
  const portfolio = buildPortfolio(workbook, priceMap);

  const quantities = new Map(
    portfolio.assets.map((p) => [p.assetId, p.quantity]),
  );

  const yearlyFees = feesByYear(workbook.transactions);
  const assetFees = feesByAsset(workbook.transactions, workbook.assets);
  const accountFees = feesByAccount(workbook.transactions, workbook.accounts);
  const typeFees = feesByType(workbook.transactions);
  const terEstimates = estimatedAnnualTer(
    workbook.assets,
    priceMap,
    quantities,
  );
  const ratio = feeRatio(portfolio.totals.fees, portfolio.totals.netInvested);

  const currentYear = new Date().getFullYear();
  const ytdFees =
    yearlyFees.find((y) => y.year === currentYear)?.total ?? 0;

  const netInvested = portfolio.totals.netInvested;
  const annualDrag = annualFeeDrag(ytdFees, netInvested);
  const allInCost = allInAnnualCost(ytdFees, terEstimates.total, netInvested);
  const feesToGain = feesToGainRatio(
    portfolio.totals.fees,
    portfolio.totals.totalReturn,
  );

  return (
    <FeesReport
      totalFees={portfolio.totals.fees}
      ytdFees={ytdFees}
      ratio={ratio}
      annualDrag={annualDrag}
      allInCost={allInCost}
      feesToGain={feesToGain}
      terTotal={terEstimates.total}
      terPerAsset={terEstimates.perAsset}
      yearlyFees={yearlyFees}
      assetFees={assetFees}
      accountFees={accountFees}
      typeFees={typeFees}
      netInvested={netInvested}
    />
  );
}
