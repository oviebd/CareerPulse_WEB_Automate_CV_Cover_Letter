"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tickStyle = { fill: "#6b6b8a", fontSize: 11 };
const gridStyle = { stroke: "rgba(255,255,255,0.06)" };

export function TrackerStatusChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  const gradId = useId().replace(/:/g, "");
  if (data.length === 0) return null;

  return (
    <div className="mt-4 h-[200px] w-full font-mono text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} vertical={false} />
          <XAxis
            dataKey="name"
            tick={tickStyle}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "rgba(108, 99, 255, 0.08)" }}
            contentStyle={{
              background: "#13131a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              color: "#f0f0ff",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#6b6b8a" }}
          />
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6c63ff" />
              <stop offset="100%" stopColor="#00d4a8" />
            </linearGradient>
          </defs>
          <Bar
            dataKey="count"
            name="Applications"
            fill={`url(#${gradId})`}
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
