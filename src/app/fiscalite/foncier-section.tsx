import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatEuro, signClass } from "@/lib/utils";
import type { Detention, PropertyRegime } from "@/lib/schema";

const REGIME_LABELS: Record<PropertyRegime, string> = {
  IR_REEL: "IR réel",
  IR_MICRO: "Micro-foncier",
  IS: "IS",
  RESIDENCE_PRINCIPALE: "Résidence principale",
};

const DETENTION_LABELS: Record<Detention, string> = {
  SCI: "SCI",
  DIRECT: "Direct",
};

export type FoncierRow = {
  id: string;
  label: string;
  detention: Detention;
  regime: PropertyRegime;
  grossRent: number;
  taxeFonciere: number;
  annualTax: number;
  monthlyCashFlow: number;
};

export function FoncierSection({ rows }: { rows: FoncierRow[] }) {
  if (rows.length === 0) return null;

  const totalTax = rows.reduce((s, r) => s + r.annualTax, 0);
  const totalFonciere = rows.reduce((s, r) => s + r.taxeFonciere, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenus fonciers / SCI</CardTitle>
        <p className="text-xs leading-relaxed text-zinc-500">
          Impôt annuel estimé sur les revenus locatifs selon le régime de chaque
          SCI (IR : barème au TMI + PS 17,2 % ; IS : 15 % puis 25 % après
          amortissement). Indicatif.
        </p>
      </CardHeader>
      <CardBody className="px-0">
        <Table>
          <THead>
            <TR>
              <TH>Bien</TH>
              <TH>Régime</TH>
              <TH className="text-right">Loyers / an</TH>
              <TH className="text-right">Taxe foncière</TH>
              <TH className="text-right">Impôt foncier / an</TH>
              <TH className="text-right">Cash-flow / mois</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium">{r.label}</TD>
                <TD>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="info">{DETENTION_LABELS[r.detention]}</Badge>
                    <Badge variant="default">{REGIME_LABELS[r.regime]}</Badge>
                  </div>
                </TD>
                <TD className="text-right font-mono tabular-nums">
                  {formatEuro(r.grossRent)}
                </TD>
                <TD className="text-right font-mono tabular-nums">
                  {formatEuro(r.taxeFonciere)}
                </TD>
                <TD className="text-right font-mono tabular-nums">
                  {formatEuro(r.annualTax)}
                </TD>
                <TD
                  className={`text-right font-mono tabular-nums ${signClass(r.monthlyCashFlow)}`}
                >
                  {formatEuro(r.monthlyCashFlow)}
                </TD>
              </TR>
            ))}
            <TR>
              <TD className="font-semibold">Total</TD>
              <TD />
              <TD />
              <TD className="text-right font-mono font-semibold tabular-nums">
                {formatEuro(totalFonciere)}
              </TD>
              <TD className="text-right font-mono font-semibold tabular-nums">
                {formatEuro(totalTax)}
              </TD>
              <TD />
            </TR>
          </TBody>
        </Table>
      </CardBody>
    </Card>
  );
}
