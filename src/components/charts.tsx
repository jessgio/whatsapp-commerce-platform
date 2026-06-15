"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatIDRCompact } from "@/lib/format";

const MERLOT = "#6f2c3f";
const TAUPE = "#b49e8e";
const PALETTE = ["#6f2c3f", "#b49e8e", "#5f5448", "#8a3a4f", "#d8c9b5", "#3f6f53"];

export function RevenueTrend({ data }: { data: { date: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MERLOT} stopOpacity={0.35} />
            <stop offset="100%" stopColor={MERLOT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(8)}
          tick={{ fontSize: 11, fill: "#8a7e72" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatIDRCompact(v)}
          tick={{ fontSize: 11, fill: "#8a7e72" }}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <Tooltip
          formatter={(value) => [formatIDRCompact(Number(value)), "Revenue"]}
          contentStyle={{ borderRadius: 10, border: "1px solid #e6dccb", fontSize: 12 }}
        />
        <Area type="monotone" dataKey="value" stroke={MERLOT} strokeWidth={2} fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryBars({ data }: { data: { category: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fontSize: 11, fill: "#5f5448" }}
          axisLine={false}
          tickLine={false}
          width={92}
        />
        <Tooltip
          formatter={(value) => [formatIDRCompact(Number(value)), "Revenue"]}
          contentStyle={{ borderRadius: 10, border: "1px solid #e6dccb", fontSize: 12 }}
          cursor={{ fill: "#f4eee5" }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MiniBars({ data }: { data: { priority: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="priority" tick={{ fontSize: 11, fill: "#8a7e72" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8a7e72" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip cursor={{ fill: "#f4eee5" }} contentStyle={{ borderRadius: 10, border: "1px solid #e6dccb", fontSize: 12 }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} fill={TAUPE} />
      </BarChart>
    </ResponsiveContainer>
  );
}
