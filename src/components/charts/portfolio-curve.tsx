"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEuro } from "@/lib/utils";

type Point = { date: string; value: number; invested: number };

export function PortfolioCurve({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-zinc-500">
        Aucune donnée historique disponible.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
        >
          <defs>
            <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#a1a1aa"
            tick={{ fontSize: 11 }}
            tickFormatter={(d) => {
              const date = new Date(d);
              return date.toLocaleDateString("fr-FR", {
                month: "short",
                year: "2-digit",
              });
            }}
            minTickGap={48}
          />
          <YAxis
            stroke="#a1a1aa"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${Math.round(v / 1000)}k €`}
            width={64}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(24,24,27,0.95)",
              border: "none",
              borderRadius: 8,
              color: "white",
              fontSize: 12,
            }}
            labelFormatter={(d) =>
              new Date(d).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            }
            formatter={(value, name) => {
              const v = typeof value === "number" ? value : 0;
              return [formatEuro(v), name === "value" ? "Valeur" : "Capital investi"];
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#valueGradient)"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="invested"
            stroke="#71717a"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
