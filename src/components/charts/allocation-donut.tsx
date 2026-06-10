"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatEuro, formatPercent } from "@/lib/utils";

type Slice = { name: string; value: number };

const PALETTE = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
];

export function AllocationDonut({ data }: { data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
        Pas encore de valorisation disponible.
      </div>
    );
  }
  return (
    <div className="flex h-64 w-full items-center">
      <div className="h-full w-1/2">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={88}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(24,24,27,0.95)",
                border: "none",
                borderRadius: 8,
                color: "white",
                fontSize: 12,
              }}
              formatter={(value, name) => {
                const v = typeof value === "number" ? value : 0;
                return [
                  `${formatEuro(v)} (${formatPercent(v / total)})`,
                  String(name),
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex w-1/2 flex-col gap-2 pl-4 text-sm">
        {data.map((slice, i) => (
          <div key={slice.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">
              {slice.name}
            </span>
            <span className="font-mono text-xs tabular-nums text-zinc-500">
              {formatPercent(slice.value / total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
