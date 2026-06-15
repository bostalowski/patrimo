export type LoanInput = {
  principal: number;
  annualRate: number;
  durationMonths: number;
  annualInsuranceRate: number;
};

export type LoanYear = {
  year: number;
  interest: number;
  principalPaid: number;
  insurance: number;
  payment: number;
  remaining: number;
};

export type LoanSchedule = {
  monthlyPayment: number;
  monthlyInsurance: number;
  totalInterest: number;
  totalInsurance: number;
  totalCost: number;
  years: LoanYear[];
  remainingAt: (monthsElapsed: number) => number;
};

export function monthlyPayment(input: LoanInput): number {
  const { principal, annualRate, durationMonths } = input;
  if (principal <= 0 || durationMonths <= 0) return 0;
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return principal / durationMonths;
  const factor = Math.pow(1 + monthlyRate, durationMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

export function remainingBalance(input: LoanInput, monthsElapsed: number): number {
  const { principal, annualRate, durationMonths } = input;
  if (principal <= 0 || durationMonths <= 0) return 0;
  if (monthsElapsed >= durationMonths) return 0;
  if (monthsElapsed <= 0) return principal;
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) {
    return principal * (1 - monthsElapsed / durationMonths);
  }
  const payment = monthlyPayment(input);
  const growth = Math.pow(1 + monthlyRate, monthsElapsed);
  return principal * growth - payment * ((growth - 1) / monthlyRate);
}

export function buildLoanSchedule(input: LoanInput): LoanSchedule {
  const { principal, annualRate, durationMonths, annualInsuranceRate } = input;
  const payment = monthlyPayment(input);
  const monthlyInsurance = (principal * annualInsuranceRate) / 12;
  const monthlyRate = annualRate / 12;

  const years: LoanYear[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalInsurance = 0;

  let current: LoanYear | null = null;
  for (let month = 1; month <= durationMonths && balance > 0.005; month += 1) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(payment - interest, balance);
    balance -= principalPaid;
    totalInterest += interest;
    totalInsurance += monthlyInsurance;

    const yearIndex = Math.ceil(month / 12);
    if (!current || current.year !== yearIndex) {
      current = {
        year: yearIndex,
        interest: 0,
        principalPaid: 0,
        insurance: 0,
        payment: 0,
        remaining: balance,
      };
      years.push(current);
    }
    current.interest += interest;
    current.principalPaid += principalPaid;
    current.insurance += monthlyInsurance;
    current.payment += payment + monthlyInsurance;
    current.remaining = balance;
  }

  return {
    monthlyPayment: payment,
    monthlyInsurance,
    totalInterest,
    totalInsurance,
    totalCost: totalInterest + totalInsurance,
    years,
    remainingAt: (monthsElapsed: number) => remainingBalance(input, monthsElapsed),
  };
}
