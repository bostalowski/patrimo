import type { Property } from "../schema";
import { FLAT_TAX_RATE, PS_RATE } from "../tax-rules";
import { acquisitionCost, apport } from "./property";

export const IS_RATE_REDUCED = 0.15;
export const IS_RATE_NORMAL = 0.25;
export const IS_THRESHOLD = 42500;
export const MICRO_FONCIER_ABATTEMENT = 0.3;
export const MICRO_BIC_ABATTEMENT = 0.5;
export const PV_IMMO_IR_RATE = 0.19;

export function corporateTax(profit: number): number {
  if (profit <= 0) return 0;
  const reduced = Math.min(profit, IS_THRESHOLD) * IS_RATE_REDUCED;
  const normal = Math.max(0, profit - IS_THRESHOLD) * IS_RATE_NORMAL;
  return reduced + normal;
}

export type AnnualTaxInput = {
  property: Property;
  grossRent: number;
  deductibleCharges: number;
  loanInterest: number;
  loanInsurance: number;
  amortization: number;
  priorDeficit: number;
  priorAmortization: number;
};

export type AnnualTaxResult = {
  taxableBase: number;
  ir: number;
  ps: number;
  is: number;
  total: number;
  deficitCarried: number;
  amortizationUsed: number;
  amortizationDeferred: number;
};

export function annualTax(input: AnnualTaxInput): AnnualTaxResult {
  const {
    property,
    grossRent,
    deductibleCharges,
    loanInterest,
    loanInsurance,
    amortization,
    priorDeficit,
    priorAmortization,
  } = input;
  const tmi = property.tmiAssocie;

  if (property.regime === "RESIDENCE_PRINCIPALE") {
    return {
      taxableBase: 0,
      ir: 0,
      ps: 0,
      is: 0,
      total: 0,
      deficitCarried: 0,
      amortizationUsed: 0,
      amortizationDeferred: 0,
    };
  }

  if (property.regime === "IR_MICRO" || property.regime === "LMNP_MICRO") {
    const abattement =
      property.regime === "LMNP_MICRO"
        ? MICRO_BIC_ABATTEMENT
        : MICRO_FONCIER_ABATTEMENT;
    const base = grossRent * (1 - abattement);
    const ir = base * tmi;
    const ps = base * PS_RATE;
    return {
      taxableBase: base,
      ir,
      ps,
      is: 0,
      total: ir + ps,
      deficitCarried: 0,
      amortizationUsed: 0,
      amortizationDeferred: 0,
    };
  }

  if (property.regime === "IR_REEL") {
    const netBeforeDeficit =
      grossRent - deductibleCharges - loanInterest - loanInsurance;
    if (netBeforeDeficit < 0) {
      return {
        taxableBase: 0,
        ir: 0,
        ps: 0,
        is: 0,
        total: 0,
        deficitCarried: priorDeficit - netBeforeDeficit,
        amortizationUsed: 0,
        amortizationDeferred: 0,
      };
    }
    const usedDeficit = Math.min(priorDeficit, netBeforeDeficit);
    const base = netBeforeDeficit - usedDeficit;
    const ir = base * tmi;
    const ps = base * PS_RATE;
    return {
      taxableBase: base,
      ir,
      ps,
      is: 0,
      total: ir + ps,
      deficitCarried: priorDeficit - usedDeficit,
      amortizationUsed: 0,
      amortizationDeferred: 0,
    };
  }

  if (property.regime === "LMNP_REEL") {
    const operatingResult =
      grossRent - deductibleCharges - loanInterest - loanInsurance;
    if (operatingResult < 0) {
      return {
        taxableBase: 0,
        ir: 0,
        ps: 0,
        is: 0,
        total: 0,
        deficitCarried: priorDeficit - operatingResult,
        amortizationUsed: 0,
        amortizationDeferred: priorAmortization + amortization,
      };
    }
    const usedDeficit = Math.min(priorDeficit, operatingResult);
    const resultAfterDeficit = operatingResult - usedDeficit;
    const amortizationStock = priorAmortization + amortization;
    const amortizationUsed = Math.min(amortizationStock, resultAfterDeficit);
    const base = resultAfterDeficit - amortizationUsed;
    const ir = base * tmi;
    const ps = base * PS_RATE;
    return {
      taxableBase: base,
      ir,
      ps,
      is: 0,
      total: ir + ps,
      deficitCarried: priorDeficit - usedDeficit,
      amortizationUsed,
      amortizationDeferred: amortizationStock - amortizationUsed,
    };
  }

  const resultBeforeDeficit =
    grossRent -
    deductibleCharges -
    loanInterest -
    loanInsurance -
    amortization;
  if (resultBeforeDeficit < 0) {
    return {
      taxableBase: 0,
      ir: 0,
      ps: 0,
      is: 0,
      total: 0,
      deficitCarried: priorDeficit - resultBeforeDeficit,
      amortizationUsed: 0,
      amortizationDeferred: 0,
    };
  }
  const usedDeficit = Math.min(priorDeficit, resultBeforeDeficit);
  const base = resultBeforeDeficit - usedDeficit;
  const is = corporateTax(base);
  return {
    taxableBase: base,
    ir: 0,
    ps: 0,
    is,
    total: is,
    deficitCarried: priorDeficit - usedDeficit,
    amortizationUsed: 0,
    amortizationDeferred: 0,
  };
}

function abattementIR(years: number): number {
  if (years <= 5) return 0;
  if (years >= 22) return 1;
  return (years - 5) * 0.06;
}

function abattementPS(years: number): number {
  if (years <= 5) return 0;
  if (years >= 30) return 1;
  let a = (Math.min(years, 21) - 5) * 0.0165;
  if (years >= 22) a += 0.016;
  if (years >= 23) a += (Math.min(years, 30) - 22) * 0.09;
  return Math.min(1, a);
}

export type ResaleInput = {
  property: Property;
  salePrice: number;
  remainingLoan: number;
  holdingYears: number;
  cumulativeAmortization: number;
  cumulativeAmortizationDeducted: number;
};

export type ResaleResult = {
  grossPlusValue: number;
  capitalGainTax: number;
  distributionTax: number;
  totalTax: number;
  netProceeds: number;
};

export function resaleTax(input: ResaleInput): ResaleResult {
  const {
    property,
    salePrice,
    remainingLoan,
    holdingYears,
    cumulativeAmortization,
    cumulativeAmortizationDeducted,
  } = input;

  if (property.regime === "RESIDENCE_PRINCIPALE") {
    return {
      grossPlusValue: Math.max(0, salePrice - acquisitionCost(property)),
      capitalGainTax: 0,
      distributionTax: 0,
      totalTax: 0,
      netProceeds: salePrice - remainingLoan,
    };
  }

  if (property.regime === "IS") {
    const vnc = acquisitionCost(property) - cumulativeAmortization;
    const plusValue = Math.max(0, salePrice - vnc);
    const capitalGainTax = corporateTax(plusValue);
    const netSociete = salePrice - remainingLoan - capitalGainTax;
    const distributable = Math.max(0, netSociete - apport(property));
    const distributionTax = distributable * FLAT_TAX_RATE;
    return {
      grossPlusValue: plusValue,
      capitalGainTax,
      distributionTax,
      totalTax: capitalGainTax + distributionTax,
      netProceeds: netSociete - distributionTax,
    };
  }

  const acquisition =
    property.regime === "LMNP_REEL"
      ? acquisitionCost(property) - cumulativeAmortizationDeducted
      : acquisitionCost(property);
  const plusValue = Math.max(0, salePrice - acquisition);
  const irPV = plusValue * (1 - abattementIR(holdingYears)) * PV_IMMO_IR_RATE;
  const psPV = plusValue * (1 - abattementPS(holdingYears)) * PS_RATE;
  const totalTax = irPV + psPV;
  return {
    grossPlusValue: plusValue,
    capitalGainTax: totalTax,
    distributionTax: 0,
    totalTax,
    netProceeds: salePrice - remainingLoan - totalTax,
  };
}
