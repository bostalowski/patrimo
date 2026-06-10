"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEuro } from "@/lib/utils";

type Point = { date: string; price: number };

export function AssetPriceCurve({
  data,
  pru,
}: {
  data: Point[];
  pru: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
        Aucun historique de cours pour cet actif.
      </div>
    );
  }
  return (
    <div className="h-64 w-full">
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
            tickFormatter={(v) => formatEuro(v, true).replace(/\u00a0€/, "")}
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
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            }
            formatter={(value) => {
              const v = typeof value === "number" ? value : 0;
              return [formatEuro(v, true), "Cours"];
            }}
          />
          {pru > 0 && (
            <ReferenceLine
              y={pru}
              stroke="#71717a"
              strokeDasharray="4 4"
              label={{
                value: `PRU ${formatEuro(pru, true)}`,
                fill: "#71717a",
                fontSize: 11,
                position: "insideTopRight",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
