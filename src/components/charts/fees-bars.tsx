"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEuro } from "@/lib/utils";

type Point = {
  year: number;
  transaction: number;
  network: number;
  total: number;
};

const TRANSACTION_COLOR = "#f59e0b";
const NETWORK_COLOR = "#8b5cf6";

const compactEuro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function FeesBars({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
        Aucun frais enregistré pour le moment.
      </div>
    );
  }

  const hasNetwork = data.some((p) => p.network > 0);

  return (
    <div>
      <Legend hasNetwork={hasNetwork} />
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
            barCategoryGap="28%"
            barGap={4}
          >
            <CartesianGrid
              stroke="#e4e4e7"
              strokeDasharray="3 3"
              vertical={false}
            />
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
                  name === "transaction"
                    ? "Frais de transaction"
                    : "Frais réseau";
                return [formatEuro(v), label];
              }}
            />
            <Bar
              dataKey="transaction"
              stackId="fees"
              fill={TRANSACTION_COLOR}
              radius={hasNetwork ? undefined : [4, 4, 0, 0]}
              isAnimationActive={false}
            />
            {hasNetwork && (
              <Bar
                dataKey="network"
                stackId="fees"
                fill={NETWORK_COLOR}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Legend({ hasNetwork }: { hasNetwork: boolean }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
      <LegendItem color={TRANSACTION_COLOR} label="Frais de transaction" />
      {hasNetwork && (
        <LegendItem color={NETWORK_COLOR} label="Frais réseau" />
      )}
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
