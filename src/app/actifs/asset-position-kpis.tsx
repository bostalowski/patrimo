import {
  Card,
  CardHeader,
  CardTitle,
  CardValue,
} from "@/components/ui/card";
import { formatEuro, formatPercent, formatQuantity, signClass } from "@/lib/utils";

type AssetPositionKpisProps = {
  quantity: number;
  pru: number;
  costBasis: number;
  currentPrice: number | null;
  marketValue: number;
  unrealizedPnL: number;
  ter: number | null;
};

export function AssetPositionKpis({
  quantity,
  pru,
  currentPrice,
  marketValue,
  unrealizedPnL,
  costBasis,
  ter,
}: AssetPositionKpisProps) {
  const hasTer = ter != null && ter > 0;
  const gridCols = hasTer ? "lg:grid-cols-6" : "lg:grid-cols-5";

  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${gridCols}`}>
      <Card>
        <CardHeader>
          <CardTitle>Quantité</CardTitle>
          <CardValue>{formatQuantity(quantity)}</CardValue>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>PRU</CardTitle>
          <CardValue>{formatEuro(pru, true)}</CardValue>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Investi</CardTitle>
          <CardValue>{formatEuro(costBasis)}</CardValue>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Valeur actuelle</CardTitle>
          <CardValue>
            {currentPrice !== null ? formatEuro(marketValue) : "—"}
          </CardValue>
          {currentPrice !== null && (
            <p className="text-xs text-zinc-500">
              Cours {formatEuro(currentPrice, true)}
            </p>
          )}
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>P&amp;L latente</CardTitle>
          <CardValue className={signClass(unrealizedPnL)}>
            {currentPrice !== null ? formatEuro(unrealizedPnL) : "—"}
          </CardValue>
          {costBasis > 0 && currentPrice !== null && (
            <p className={`text-xs ${signClass(unrealizedPnL)}`}>
              {formatPercent(unrealizedPnL / costBasis)}
            </p>
          )}
        </CardHeader>
      </Card>
      {hasTer && (
        <Card>
          <CardHeader>
            <CardTitle>Frais de gestion (TER)</CardTitle>
            <CardValue>{formatPercent(ter)}</CardValue>
            {marketValue > 0 && (
              <p className="text-xs text-zinc-500">
                ≈ {formatEuro(marketValue * ter)}/an sur {formatEuro(marketValue)}
              </p>
            )}
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
