import type { Property } from "../schema";
import { deflate } from "../inflation";
import { monthlyPayment, remainingBalance } from "./loan";
import {
  acquisitionCost,
  apport as computeApport,
  grossAnnualRent,
  monthsSince,
  operatingForYear,
} from "./property";
import { annualTax, resaleTax, type ResaleResult } from "./tax";

export type RealEstateYear = {
  year: number;
  propertyValue: number;
  remainingLoan: number;
  equity: number;
  grossRent: number;
  operatingCharges: number;
  loanInterest: number;
  loanPrincipal: number;
  loanInsurance: number;
  loanPayment: number;
  amortization: number;
  tax: number;
  cashFlowBeforeTax: number;
  cashFlowAfterTax: number;
  cumulativeCashFlow: number;
  realPropertyValue: number;
  realEquity: number;
};

export type RealEstateProjection = {
  share: number;
  apport: number;
  monthlyPayment: number;
  years: RealEstateYear[];
  finalEquity: number;
  finalRealEquity: number;
  cumulativeNetCashFlow: number;
  resale: ResaleResult & { salePrice: number; remainingLoan: number };
  netIfSold: number;
  realNetIfSold: number;
  totalReturn: number;
  annualizedReturn: number;
};

export type ProjectionOptions = {
  horizonYears: number;
  revaloAnnuelle?: number;
  now?: Date;
  inflationRate?: number;
};

export function projectProperty(
  property: Property,
  options: ProjectionOptions,
): RealEstateProjection {
  const now = options.now ?? new Date();
  const horizon = Math.max(0, Math.round(options.horizonYears));
  const revalo = options.revaloAnnuelle ?? property.revaloAnnuelle;
  const inflationRate = options.inflationRate ?? 0;
  const share = property.partDetenue;

  const loan = {
    principal: property.montantEmprunte,
    annualRate: property.tauxCredit,
    durationMonths: property.dureeMois,
    annualInsuranceRate: property.tauxAssurance,
  };
  const monthlyRate = loan.annualRate / 12;
  const payment = monthlyPayment(loan);
  const monthlyInsurance = (loan.principal * loan.annualInsuranceRate) / 12;

  const monthsElapsedLoan = monthsSince(property.dateDebutCredit, now);
  const yearsHeld = Math.floor(monthsSince(property.dateAcquisition, now) / 12);

  const amortBase = property.prixAchat * property.partAmortissable;
  const amortPerYear =
    property.dureeAmortissement > 0 ? amortBase / property.dureeAmortissement : 0;
  let cumulativeAmort = Math.min(amortPerYear * yearsHeld, amortBase);
  let cumulativeAmortDeducted = cumulativeAmort;

  const operating = operatingForYear(property);

  const years: RealEstateYear[] = [];
  let priorDeficit = 0;
  let priorAmortDeferred = 0;
  let cumulativeCashFlow = 0;

  for (let k = 1; k <= horizon; k += 1) {
    const propertyValue = property.valeurActuelle * Math.pow(1 + revalo, k);

    const monthsStart = monthsElapsedLoan + (k - 1) * 12;
    const monthsEnd = monthsElapsedLoan + k * 12;

    let loanInterest = 0;
    let loanInsurance = 0;
    for (let m = monthsStart + 1; m <= monthsEnd; m += 1) {
      if (m > loan.durationMonths) break;
      const balanceStart = remainingBalance(loan, m - 1);
      loanInterest += balanceStart * monthlyRate;
      loanInsurance += monthlyInsurance;
    }
    const remainingLoanStart = remainingBalance(
      loan,
      Math.min(monthsStart, loan.durationMonths),
    );
    const remainingLoan = remainingBalance(
      loan,
      Math.min(monthsEnd, loan.durationMonths),
    );
    const loanPrincipal = Math.max(0, remainingLoanStart - remainingLoan);
    const loanPayment = loanInterest + loanPrincipal + loanInsurance;

    let amortization = 0;
    if (cumulativeAmort < amortBase) {
      amortization = Math.min(amortPerYear, amortBase - cumulativeAmort);
      cumulativeAmort += amortization;
    }

    const tax = annualTax({
      property,
      grossRent: operating.grossRent,
      deductibleCharges: operating.operatingCharges,
      loanInterest,
      loanInsurance,
      amortization,
      priorDeficit,
      priorAmortization: priorAmortDeferred,
    });
    priorDeficit = tax.deficitCarried;
    priorAmortDeferred = tax.amortizationDeferred;
    cumulativeAmortDeducted += tax.amortizationUsed;

    const cashFlowBeforeTax =
      operating.grossRent - operating.operatingCharges - loanPayment;
    const cashFlowAfterTax = cashFlowBeforeTax - tax.total;
    cumulativeCashFlow += cashFlowAfterTax;

    const yearEquity = (propertyValue - remainingLoan) * share;
    years.push({
      year: k,
      propertyValue: propertyValue * share,
      remainingLoan: remainingLoan * share,
      equity: yearEquity,
      grossRent: operating.grossRent * share,
      operatingCharges: operating.operatingCharges * share,
      loanInterest: loanInterest * share,
      loanPrincipal: loanPrincipal * share,
      loanInsurance: loanInsurance * share,
      loanPayment: loanPayment * share,
      amortization: amortization * share,
      tax: tax.total * share,
      cashFlowBeforeTax: cashFlowBeforeTax * share,
      cashFlowAfterTax: cashFlowAfterTax * share,
      cumulativeCashFlow: cumulativeCashFlow * share,
      realPropertyValue: deflate(propertyValue * share, k, inflationRate),
      realEquity: deflate(yearEquity, k, inflationRate),
    });
  }

  const salePrice =
    property.valeurActuelle * Math.pow(1 + revalo, horizon);
  const remainingLoanFinal = remainingBalance(
    loan,
    Math.min(monthsElapsedLoan + horizon * 12, loan.durationMonths),
  );
  const resaleRaw = resaleTax({
    property,
    salePrice,
    remainingLoan: remainingLoanFinal,
    holdingYears: yearsHeld + horizon,
    cumulativeAmortization: cumulativeAmort,
    cumulativeAmortizationDeducted: cumulativeAmortDeducted,
  });

  const apportValue = computeApport(property) * share;
  const cumulativeNetCashFlow = cumulativeCashFlow * share;
  const resaleNet = resaleRaw.netProceeds * share;
  const finalEquity = years[years.length - 1]?.equity ?? 0;
  const netIfSold = cumulativeNetCashFlow + resaleNet;
  const totalReturn = netIfSold - apportValue;
  const annualizedReturn =
    apportValue > 0 && horizon > 0
      ? Math.pow(netIfSold / apportValue, 1 / horizon) - 1
      : 0;

  return {
    share,
    apport: apportValue,
    monthlyPayment: (payment + monthlyInsurance) * share,
    years,
    finalEquity,
    finalRealEquity: deflate(finalEquity, horizon, inflationRate),
    cumulativeNetCashFlow,
    resale: {
      ...resaleRaw,
      capitalGainTax: resaleRaw.capitalGainTax * share,
      distributionTax: resaleRaw.distributionTax * share,
      totalTax: resaleRaw.totalTax * share,
      netProceeds: resaleNet,
      salePrice: salePrice * share,
      remainingLoan: remainingLoanFinal * share,
    },
    netIfSold,
    realNetIfSold: deflate(netIfSold, horizon, inflationRate),
    totalReturn,
    annualizedReturn,
  };
}

export function currentEquity(property: Property, now: Date = new Date()): number {
  const loan = {
    principal: property.montantEmprunte,
    annualRate: property.tauxCredit,
    durationMonths: property.dureeMois,
    annualInsuranceRate: property.tauxAssurance,
  };
  const monthsElapsed = monthsSince(property.dateDebutCredit, now);
  const remaining = remainingBalance(
    loan,
    Math.min(monthsElapsed, loan.durationMonths),
  );
  return (property.valeurActuelle - remaining) * property.partDetenue;
}

export type PropertySnapshot = {
  property: Property;
  monthlyPayment: number;
  monthlyCashFlowAfterTax: number;
  equity: number;
  remainingLoan: number;
  grossYield: number;
  netYield: number;
  annualTaxFoncier: number;
};

export type PropertyTotals = {
  value: number;
  equity: number;
  debt: number;
  cashFlow: number;
};

export function aggregatePropertySnapshots(
  snapshots: PropertySnapshot[],
): PropertyTotals {
  return snapshots.reduce(
    (acc, s) => {
      acc.value += s.property.valeurActuelle * s.property.partDetenue;
      acc.equity += s.equity;
      acc.debt += s.remainingLoan;
      acc.cashFlow += s.monthlyCashFlowAfterTax;
      return acc;
    },
    { value: 0, equity: 0, debt: 0, cashFlow: 0 },
  );
}

export function propertySnapshot(
  property: Property,
  now: Date = new Date(),
): PropertySnapshot {
  const projection = projectProperty(property, { horizonYears: 1, now });
  const firstYear = projection.years[0];
  const share = property.partDetenue;
  const grossRent = grossAnnualRent(property) * share;
  const cost = acquisitionCost(property) * share;

  const loan = {
    principal: property.montantEmprunte,
    annualRate: property.tauxCredit,
    durationMonths: property.dureeMois,
    annualInsuranceRate: property.tauxAssurance,
  };
  const monthsElapsed = monthsSince(property.dateDebutCredit, now);
  const remainingLoan =
    remainingBalance(loan, Math.min(monthsElapsed, loan.durationMonths)) * share;

  return {
    property,
    monthlyPayment: projection.monthlyPayment,
    monthlyCashFlowAfterTax: (firstYear?.cashFlowAfterTax ?? 0) / 12,
    equity: currentEquity(property, now),
    remainingLoan,
    grossYield: cost > 0 ? grossRent / cost : 0,
    netYield: cost > 0 ? (firstYear?.cashFlowAfterTax ?? 0) / cost : 0,
    annualTaxFoncier: firstYear?.tax ?? 0,
  };
}
