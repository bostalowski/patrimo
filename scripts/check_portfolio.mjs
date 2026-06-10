import { loadWorkbook } from "../src/lib/excel.ts";
import { buildPortfolio } from "../src/lib/portfolio.ts";

const workbook = loadWorkbook();
console.log(`Loaded ${workbook.transactions.length} transactions, ${workbook.assets.length} assets`);

const portfolio = buildPortfolio(workbook, new Map());

for (const p of portfolio.assets) {
  console.log(
    `${p.assetId.padEnd(28)} qty=${p.quantity.toFixed(8).padStart(14)}  basis=${p.costBasis.toFixed(2).padStart(10)}€  PRU=${p.pru.toFixed(2).padStart(8)}€  realized=${p.realizedPnL.toFixed(2)}€  income=${p.realizedIncome.toFixed(2)}€  fees=${p.fees.toFixed(2)}€`,
  );
}

console.log("\nTotals:");
console.log(portfolio.totals);
