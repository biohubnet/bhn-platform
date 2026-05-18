import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, CheckCircle2, AlertTriangle, Hourglass, MinusCircle, ExternalLink, Lock } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageHero } from "@/components/ui/PageHero";
import {
  COMPLIANCE_ITEMS,
  STATUS_LABELS,
  type ComplianceItem,
  type ComplianceStatus,
} from "@/lib/compliance/items";
import { cn } from "@/lib/utils";

/**
 * /compliance — management-facing compliance overview.
 *
 * Plain-English summary of every regulatory framework + industry
 * baseline BHN follows, the platform's specific measures for each,
 * and the current honest status. Designed to be readable by a
 * non-technical executive in five minutes — no acronym soup beyond
 * what the framework names already use.
 *
 * Admin / superadmin only. The data driving the page lives in
 * src/lib/compliance/items.ts; per-item notes can be edited inline
 * (planned) or in code today.
 */
export default async function CompliancePage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  // Counts per status for the at-a-glance scorecard.
  const counts: Record<ComplianceStatus, number> = {
    met: 0, partial: 0, in_progress: 0, not_applicable: 0,
  };
  for (const it of COMPLIANCE_ITEMS) counts[it.status]++;
  const total = COMPLIANCE_ITEMS.length;

  // Group items by their declared bucket — preserves source order
  // inside each group so the file order is the page order.
  const groups: Record<string, ComplianceItem[]> = {};
  for (const it of COMPLIANCE_ITEMS) {
    if (!groups[it.group]) groups[it.group] = [];
    groups[it.group].push(it);
  }
  const groupOrder = ["Privacy", "Accessibility", "Communications", "Security", "Operational"] as const;

  return (
    <div>
      <PageHero
        eyebrow={<><ShieldCheck size={11} /> Management overview</>}
        title="Compliance & data protection"
        description="A plain-English summary of every framework BHN follows, what we actually do for each, and where we stand today. Status is honest — partials and gaps are flagged, not hidden."
        tone="brand"
      />

      {/* Status scorecard */}
      <section className="max-w-5xl mx-auto px-2 sm:px-0 -mt-2 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatusTile status="met"            count={counts.met}            total={total} />
          <StatusTile status="partial"        count={counts.partial}        total={total} />
          <StatusTile status="in_progress"    count={counts.in_progress}    total={total} />
          <StatusTile status="not_applicable" count={counts.not_applicable} total={total} />
        </div>
        <p className="text-xs text-muted mt-4 leading-relaxed">
          <Lock size={11} className="inline -mt-0.5 mr-1 text-subtle" />
          Posture is reviewed quarterly. The source data for this page
          lives in <code className="font-mono text-fg bg-elevated px-1 py-0.5 rounded">src/lib/compliance/items.ts</code> — keep it
          honest. Partial / gap entries do more for management trust
          than aspirational marketing copy.
        </p>
      </section>

      {/* Per-group sections */}
      <div className="max-w-5xl mx-auto px-2 sm:px-0 space-y-10">
        {groupOrder.filter((g) => groups[g]?.length).map((g) => (
          <section key={g}>
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle mb-4">
              {g}
            </h2>
            <div className="space-y-4">
              {groups[g].map((it) => <Item key={it.id} item={it} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ─── Tile + Item renderers ───────────────────────────────────────

function StatusTile({
  status, count, total,
}: {
  status: ComplianceStatus;
  count: number;
  total: number;
}) {
  const meta = STATUS_LABELS[status];
  const Icon = statusIcon(status);
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const colour = {
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-200",
    info:    "bg-sky-50 text-sky-800 ring-sky-200",
    neutral: "bg-elevated text-fg ring-line",
  }[meta.tone];
  return (
    <div className={cn("rounded-2xl ring-1 ring-inset p-4 surface-shadow", colour)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="shrink-0" />
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold opacity-80">
          {meta.label}
        </p>
      </div>
      <p className="text-3xl font-bold font-mono tabular-nums leading-none">
        {count}
        <span className="text-base opacity-60 font-semibold ml-1">/ {total}</span>
      </p>
      {count > 0 && (
        <p className="text-[11px] opacity-80 mt-1">{pct}% of registered controls</p>
      )}
    </div>
  );
}

function Item({ item }: { item: ComplianceItem }) {
  const meta = STATUS_LABELS[item.status];
  const StatusIc = statusIcon(item.status);
  return (
    <article className="rounded-2xl border border-line bg-card surface-shadow overflow-hidden">
      <header className="px-5 py-4 border-b border-line flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-subtle">
            {item.authority}
          </p>
          <h3 className="text-base font-bold text-fg mt-0.5 tracking-tight">
            {item.title}
          </h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-bold px-2.5 py-1 rounded-full ring-1 ring-inset shrink-0",
            statusChipClass(item.status),
          )}
        >
          <StatusIc size={11} />
          {meta.label}
        </span>
      </header>

      <div className="px-5 py-4 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-subtle mb-1">
            Why we follow this
          </p>
          <p className="text-sm text-fg leading-relaxed">{item.why}</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-subtle mb-1">
            What we do
          </p>
          <ul className="space-y-1.5">
            {item.measures.map((m, i) => (
              <li key={i} className="text-sm text-fg leading-relaxed pl-4 relative">
                <span aria-hidden className="absolute left-0 top-2 w-1 h-1 rounded-full bg-brand-600" />
                {m}
              </li>
            ))}
          </ul>
        </div>

        {item.notes && (
          <div className="rounded-lg bg-amber-50/60 ring-1 ring-inset ring-amber-200 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-amber-800 mb-0.5">
              Gap / note
            </p>
            <p className="text-xs text-amber-900 leading-relaxed">{item.notes}</p>
          </div>
        )}

        {item.evidenceHref && item.evidenceLabel && (
          <div>
            <Link
              href={item.evidenceHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline"
            >
              {item.evidenceLabel} <ExternalLink size={11} />
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

function statusIcon(status: ComplianceStatus) {
  switch (status) {
    case "met":             return CheckCircle2;
    case "partial":         return AlertTriangle;
    case "in_progress":     return Hourglass;
    case "not_applicable":  return MinusCircle;
  }
}

function statusChipClass(status: ComplianceStatus): string {
  switch (status) {
    case "met":             return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "partial":         return "bg-amber-50 text-amber-800 ring-amber-200";
    case "in_progress":     return "bg-sky-50 text-sky-800 ring-sky-200";
    case "not_applicable":  return "bg-elevated text-muted ring-line";
  }
}
