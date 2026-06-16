/**
 * Admin → AI metrics. Reliability + cost observability over the AIInteraction
 * telemetry log: call volume, error rate, p50/p95 latency, cost, valid-output
 * (acceptance) rate, with per-day charts and a per-feature table. Date-windowed.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageHero } from "@/components/ui/PageHero";
import { getAiMetrics } from "@/lib/ai/metrics";
import { AiMetricsCharts } from "@/components/admin/AiMetricsCharts";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const WINDOWS = [7, 30, 90];

export default async function AiMetricsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const sp = await searchParams;
  const days = WINDOWS.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const m = await getAiMetrics(days);

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const ms = (v: number | null) => (v == null ? "—" : `${v.toLocaleString()} ms`);

  const cards: { label: string; value: string; sub?: string }[] = [
    { label: "Calls", value: m.totalCalls.toLocaleString() },
    { label: "Error rate", value: pct(m.errorRate) },
    {
      label: "Valid-output rate",
      value: m.validRate == null ? "—" : pct(m.validRate),
      sub: m.validatedCalls ? `${m.validatedCalls} validated calls` : "no validated calls",
    },
    { label: "p95 latency", value: ms(m.p95LatencyMs), sub: `p50 ${ms(m.p50LatencyMs)}` },
    { label: "Total cost", value: `$${m.totalCostUsd.toFixed(4)}` },
    {
      label: "Tokens",
      value: (m.promptTokens + m.completionTokens).toLocaleString(),
      sub: `${m.promptTokens.toLocaleString()} in / ${m.completionTokens.toLocaleString()} out`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><Activity size={11} /> Admin · Observability</>}
        title="AI metrics"
        description="Reliability and cost across every AI call, from the AIInteraction telemetry log. Valid-output rate is the share of schema-validated structured calls that passed; retrieval quality is measured offline by the eval harness (npm run eval)."
      />

      <div className="flex w-fit items-center gap-1 rounded-lg bg-elevated/60 p-1">
        {WINDOWS.map((w) => (
          <Link
            key={w}
            href={`?days=${w}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              w === days ? "bg-card-solid text-fg shadow-card-rest" : "text-muted hover:text-fg",
            )}
          >
            {w}d
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line bg-card-solid p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{c.label}</p>
            <p className="mt-1 text-xl font-bold text-fg">{c.value}</p>
            {c.sub && <p className="mt-0.5 text-[11px] text-muted">{c.sub}</p>}
          </div>
        ))}
      </div>

      {m.byDay.length > 0 ? (
        <AiMetricsCharts byDay={m.byDay} />
      ) : (
        <p className="text-sm text-muted">No AI calls in this window yet.</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-card-solid">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-wide text-subtle">
              <th className="px-3 py-2">Feature (kind)</th>
              <th className="px-3 py-2">Calls</th>
              <th className="px-3 py-2">Error rate</th>
              <th className="px-3 py-2">Avg latency</th>
              <th className="px-3 py-2">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {m.byFeature.map((f) => (
              <tr key={f.feature}>
                <td className="px-3 py-2 font-medium text-fg">{f.feature}</td>
                <td className="px-3 py-2 tabular-nums">{f.calls.toLocaleString()}</td>
                <td className="px-3 py-2 tabular-nums">{pct(f.errorRate)}</td>
                <td className="px-3 py-2 tabular-nums">{ms(f.avgLatencyMs)}</td>
                <td className="px-3 py-2 tabular-nums">${f.costUsd.toFixed(4)}</td>
              </tr>
            ))}
            {m.byFeature.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted">No data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
