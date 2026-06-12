"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEuro } from "@/lib/utils";

type Point = {
  year: number;
  realizedPnL: number;
  income: number;
  total: number;
};

const POSITIVE = "#10b981";
const NEGATIVE = "#f43f5e";
const INCOME = "#6366f1";

const compactEuro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function RealizedPnLBars({
  data,
  activeYear,
  onSelectYear,
}: {
  data: Point[];
  activeYear?: number;
  onSelectYear?: (year: number) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
        Aucun gain réalisé pour le moment.
      </div>
    );
  }

  const selectYear = (year: number | undefined) => {
    if (onSelectYear && year !== undefined) onSelectYear(year);
  };

  return (
    <div>
      <Legend />
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
            barCategoryGap="28%"
            barGap={4}
            onClick={(state) => {
              const label = (state as { activeLabel?: number | string })
                ?.activeLabel;
              if (label !== undefined && label !== null) selectYear(Number(label));
            }}
            className={onSelectYear ? "cursor-pointer" : undefined}
          >
            <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="year"
              stroke="#a1a1aa"
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              stroke="#a1a1aa"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => compactEuro.format(v)}
              width={72}
            />
            <ReferenceLine y={0} stroke="#a1a1aa" />
            <Tooltip
              cursor={{ fill: "rgba(161,161,170,0.12)" }}
              contentStyle={{
                backgroundColor: "rgba(24,24,27,0.95)",
                border: "none",
                borderRadius: 8,
                color: "white",
                fontSize: 12,
              }}
              labelFormatter={(year) => `Année ${year}`}
              formatter={(value, name) => {
                const v = typeof value === "number" ? value : 0;
                const label =
                  name === "realizedPnL"
                    ? "Plus-values réalisées"
                    : "Dividendes + intérêts";
                return [formatEuro(v), label];
              }}
            />
            <Bar
              dataKey="realizedPnL"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              minPointSize={3}
            >
              {data.map((point) => (
                <Cell
                  key={`pv-${point.year}`}
                  fill={point.realizedPnL >= 0 ? POSITIVE : NEGATIVE}
                  fillOpacity={
                    activeYear === undefined || activeYear === point.year ? 1 : 0.3
                  }
                />
              ))}
            </Bar>
            <Bar
              dataKey="income"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              minPointSize={3}
            >
              {data.map((point) => (
                <Cell
                  key={`inc-${point.year}`}
                  fill={INCOME}
                  fillOpacity={
                    activeYear === undefined || activeYear === point.year ? 1 : 0.3
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
      <LegendItem color={POSITIVE} label="Plus-values (gain)" />
      <LegendItem color={NEGATIVE} label="Plus-values (perte)" />
      <LegendItem color={INCOME} label="Dividendes + intérêts" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
