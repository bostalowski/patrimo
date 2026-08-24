import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardValue,
} from "@/components/ui/card";
import type {
  EmergencyFundHealth,
  EmergencyFundStatus,
} from "@patrimo/core/emergency-fund";
import { formatEuro } from "@/lib/utils";

const STATUS_LABEL: Record<EmergencyFundStatus, string> = {
  insufficient: "Insuffisant",
  acceptable: "Acceptable",
  healthy: "Sain",
  over_allocated: "Surdimensionné",
};

const STATUS_BADGE: Record<
  EmergencyFundStatus,
  "danger" | "warning" | "success" | "info"
> = {
  insufficient: "danger",
  acceptable: "warning",
  healthy: "success",
  over_allocated: "info",
};

const coverageFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function EmergencyFundCard({
  health,
}: {
  health: EmergencyFundHealth | null;
}) {
  if (!health) return null;

  return (
    <Card className="max-w-md self-start">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Fonds d&apos;urgence</CardTitle>
          <Badge variant={STATUS_BADGE[health.status]}>
            {STATUS_LABEL[health.status]}
          </Badge>
        </div>
        <CardValue>
          {coverageFormatter.format(health.coverageMonths)} mois
        </CardValue>
        <p className="text-xs text-zinc-500">
          {formatEuro(health.livretBalance)} livrets ·{" "}
          {formatEuro(health.monthlyExpenses)} / mois
        </p>
        {health.status === "over_allocated" && (
          <p className="text-xs text-sky-700 dark:text-sky-300">
            Capital potentiellement immobilisé
          </p>
        )}
      </CardHeader>
    </Card>
  );
}
