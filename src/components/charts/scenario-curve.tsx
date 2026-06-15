"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEuro } from "@/lib/utils";

export type ScenarioSeries = {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
};

export type ScenarioPoint = Record<string, string | number>;

export function ScenarioCurve({
  data,
  series,
}: {
  data: ScenarioPoint[];
  series: ScenarioSeries[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-zinc-500">
        Renseignez un montant mensuel et un horizon.
      </div>
    );
  }

  const labels = new Map(series.map((s) => [s.key, s.label]));
  labels.set("invested", "Versé");

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#a1a1aa"
            tick={{ fontSize: 11 }}
            tickFormatter={(d) =>
              new Date(d).toLocaleDateString("fr-FR", {
                month: "short",
                year: "2-digit",
              })
            }
            minTickGap={48}
          />
          <YAxis
            stroke="#a1a1aa"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatEuro(v, false).replace(/\u00a0€/, "")}
            width={72}
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
                month: "long",
                year: "numeric",
              })
            }
            formatter={(value, name) => {
              const v = typeof value === "number" ? value : 0;
              return [formatEuro(v), labels.get(String(name)) ?? String(name)];
            }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={s.dashed ? 1.5 : 2}
              strokeDasharray={s.dashed ? "5 4" : undefined}
              strokeOpacity={s.dashed ? 0.7 : 1}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          <Line
            type="monotone"
            dataKey="invested"
            stroke="#71717a"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
