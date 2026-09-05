import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildRealizedEvents, buildYearlyReports } from "@/lib/fiscalite";
import { propertySnapshot } from "@/lib/realestate/projection";
import { grossAnnualRent } from "@/lib/realestate/property";
import type { Envelope } from "@/lib/schema";
import { FiscaliteReport, type SerializedEvent } from "./fiscalite-report";
import { FoncierSection, type FoncierRow } from "./foncier-section";

export const dynamic = "force-dynamic";

export default async function FiscalitePage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const events = buildRealizedEvents(workbook);
  const yearlyReports = buildYearlyReports(events);

  const serializedEvents: SerializedEvent[] = events.map((event) => ({
    ...event,
    date: event.date.toISOString(),
  }));

  const yearlyTotals = yearlyReports.map((report) => {
    const realizedPnL = report.envelopes.reduce(
      (sum, env) => sum + env.realizedPnL,
      0,
    );
    const income = report.envelopes.reduce(
      (sum, env) => sum + env.dividends + env.interest,
      0,
    );
    return {
      year: report.year,
      realizedPnL,
      income,
      total: realizedPnL + income,
    };
  });

  const openDates: Partial<Record<Envelope, string>> = {};
  for (const envelope of ["CTO", "PEA", "PEE", "AV", "PER"] as Envelope[]) {
    const dates = workbook.accounts
      .filter((a) => a.envelope === envelope && a.openDate)
      .map((a) => a.openDate as Date)
      .sort((a, b) => a.getTime() - b.getTime());
    if (dates[0]) openDates[envelope] = dates[0].toISOString();
  }

  const DATE_SENSITIVE_ENVELOPES: Envelope[] = ["PEA", "AV"];
  const missingOpenDates = workbook.accounts
    .filter(
      (a) => DATE_SENSITIVE_ENVELOPES.includes(a.envelope) && !a.openDate,
    )
    .map((a) => ({ label: a.label, envelope: a.envelope }));

  const foncierRows: FoncierRow[] = workbook.properties
    .filter((property) => property.regime !== "RESIDENCE_PRINCIPALE")
    .map((property) => {
      const snapshot = propertySnapshot(property);
      return {
        id: property.id,
        label: property.label,
        detention: property.detention,
        regime: property.regime,
        grossRent: grossAnnualRent(property) * property.partDetenue,
        taxeFonciere: property.taxeFonciere * property.partDetenue,
        annualTax: snapshot.annualTaxFoncier,
        monthlyCashFlow: snapshot.monthlyCashFlowAfterTax,
      };
    });

  return (
    <div className="space-y-8">
      <FiscaliteReport
        events={serializedEvents}
        yearlyTotals={yearlyTotals}
        openDates={openDates}
        missingOpenDates={missingOpenDates}
      />
      <FoncierSection rows={foncierRows} />
    </div>
  );
}
