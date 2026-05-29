/**
 * One KPI/OKR tile — value + RAG status + optional target line +
 * sparkline. Reused by the exec summary and every report header.
 * Server-safe.
 */
import Link from "next/link";
import type { MetricResult } from "@/lib/employer/reporting/types";
import { RAG_DOT, RAG_TEXT, RAG_LABEL } from "@/lib/employer/reporting/rag";
import { Card } from "@/components/ui/Card";
import { Sparkline } from "./Sparkline";

function fmtTarget(r: MetricResult): string {
  if (r.target == null) return "—";
  switch (r.unit) {
    case "percent":  return `${r.target}%`;
    case "currency": return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(r.target);
    case "days":     return `${r.target}d`;
    default:         return String(r.target);
  }
}

export function KpiTile({ label, result, href }: { label: string; result: MetricResult; href?: string }) {
  const rag = result.rag ?? "no_target";
  const showRag = rag === "on_track" || rag === "at_risk" || rag === "off_track";

  const subline =
    result.target != null
      ? `Target ${fmtTarget(result)} · ${result.pctToGoal ?? "—"}%`
      : result.note ?? (result.n != null ? `n=${result.n}` : "");

  const body = (
    <Card className="px-5 py-4 h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">{label}</span>
        {showRag && (
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${RAG_TEXT[rag]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${RAG_DOT[rag]}`} />
            {RAG_LABEL[rag]}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-fg tabular-nums">{result.formatted}</p>
      <div className="mt-2 flex items-end justify-between gap-2 min-h-[30px]">
        <span className="text-[11px] text-muted leading-tight">{subline}</span>
        {result.series && result.series.length > 1 && (
          <Sparkline points={result.series} className="text-brand-500 shrink-0" />
        )}
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-400">
      {body}
    </Link>
  ) : (
    body
  );
}
