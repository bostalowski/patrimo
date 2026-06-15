"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEuro } from "@/lib/utils";

type Point = {
  date: string;
  value: number;
  invested: number;
  realValue?: number;
};

export function ProjectionCurve({
  data,
  plafond,
  showReal = true,
}: {
  data: Point[];
  plafond?: number | null;
  showReal?: boolean;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-zinc-500">
        Renseignez un versement mensuel et un horizon.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="projectionValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
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
              const label =
                name === "invested"
                  ? "Versé"
                  : name === "realValue"
                    ? "Valeur après inflation"
                    : "Valeur";
              return [formatEuro(v), label];
            }}
          />
          {plafond ? (
            <ReferenceLine
              y={plafond}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{
                value: `Plafond ${formatEuro(plafond)}`,
                fill: "#f59e0b",
                fontSize: 11,
                position: "insideTopRight",
              }}
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#projectionValue)"
            isAnimationActive={false}
          />
          {showReal ? (
            <Line
              type="monotone"
              dataKey="realValue"
              stroke="#0ea5e9"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="invested"
            stroke="#71717a"
            strokeWidth={1.5}
            strokeDasharray="2 3"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
