"use client";

/** Recharts views for /admin/ai-metrics — calls/errors per day + cost per day. */
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import type { DayPoint } from "@/lib/ai/metrics";

const tick = { fontSize: 10, fill: "var(--fg-subtle)" };

export function AiMetricsCharts({ byDay }: { byDay: DayPoint[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-line bg-card-solid p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-subtle">Calls &amp; errors per day</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDay} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" tick={tick} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={tick} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="calls" name="calls" fill="var(--brand-500)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="errors" name="errors" fill="#dc2626" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-card-solid p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-subtle">Cost per day (USD)</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDay} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" tick={tick} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={tick} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value) => [`$${Number(value).toFixed(4)}`, "cost"] as [string, string]}
              />
              <Bar dataKey="costUsd" name="cost" fill="var(--brand-600)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
