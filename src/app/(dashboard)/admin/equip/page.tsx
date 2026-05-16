/**
 * /admin/equip — review queue.
 *
 * Mirrors the layout of /admin/credit-applications so reviewers
 * who know that surface feel at home. Tab filter, table, per-row
 * "Review" links. Counts come from the same endpoint that lists
 * the apps.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, ArrowRight, Rocket, Beaker } from "lucide-react";
import { DSPageHeader, DSSection, DSStatGrid, DSStat } from "@/components/design-system";
import {
  STREAM_META, STATUS_META,
  type EquipStatus, type EquipStream,
} from "@/lib/equip/types";
import { institutionLabel } from "@/lib/equip/institutions";

export const dynamic = "force-dynamic";

const TABS: { id: string; label: string }[] = [
  { id: "open",        label: "Open" },
  { id: "submitted",   label: "Submitted" },
  { id: "under_review",label: "Under review" },
  { id: "approved",    label: "Approved" },
  { id: "rejected",    label: "Not selected" },
  { id: "funded",      label: "Funded" },
  { id: "all",         label: "All" },
];

export default async function AdminEquipPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const params = await searchParams;
  const activeTab = params.status ?? "open";

  // Build the where clause manually since we want "open" =
  // submitted + under_review (a synthetic filter not stored as
  // a status value).
  const where = activeTab === "all"
    ? {}
    : activeTab === "open"
      ? { status: { in: ["submitted", "under_review"] } }
      : { status: activeTab };

  const [apps, counts] = await Promise.all([
    prisma.equipApplication.findMany({
      where,
      orderBy: [{ status: "asc" }, { submittedAt: "desc" }, { updatedAt: "desc" }],
      take: 100,
      select: {
        id: true, stream: true, status: true,
        requestedAmount: true, approvedAmount: true,
        institution: true, institutionOther: true,
        applicantType: true,
        submittedAt: true, decidedAt: true, fundedAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true } },
      },
    }),
    prisma.equipApplication.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const totalOpen = (byStatus.submitted ?? 0) + (byStatus.under_review ?? 0);
  const totalApproved = (byStatus.approved ?? 0) + (byStatus.funded ?? 0);
  const totalFunded = await prisma.equipApplication.aggregate({
    where: { OR: [{ status: "approved" }, { status: "funded" }] },
    _sum: { approvedAmount: true },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link href="/admin" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Admin overview
      </Link>

      <DSPageHeader
        eyebrow="Admin · Equip pillar"
        title="Equip review queue"
        icon={Rocket}
        description="VentureConnect (≤$5K, monthly) + VentureLift (≤$25K, quarterly). Click a row to review, leave a note, and decide."
      />

      <DSStatGrid>
        <DSStat label="Open" value={totalOpen} help="submitted + under review" tone="amber" />
        <DSStat label="Approved" value={totalApproved} help="approved + funded" tone="emerald" />
        <DSStat label="Funded $" value={`$${(totalFunded._sum.approvedAmount ?? 0).toLocaleString()}`} help="total approved amount" tone="violet" />
        <DSStat label="Drafts" value={byStatus.draft ?? 0} help="not yet submitted" tone="brand" />
      </DSStatGrid>

      {/* Tab filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const count = tab.id === "open"
            ? totalOpen
            : tab.id === "all"
              ? Object.values(byStatus).reduce((a, b) => a + b, 0)
              : (byStatus[tab.id] ?? 0);
          return (
            <Link
              key={tab.id}
              href={`/admin/equip?status=${tab.id}`}
              className={
                "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ring-1 transition-colors " +
                (isActive
                  ? "bg-brand-600 text-white ring-brand-700"
                  : "bg-card-solid text-fg ring-line hover:bg-elevated")
              }
            >
              {tab.label}
              <span className={"text-[10px] tabular-nums font-bold " + (isActive ? "text-white/70" : "text-muted")}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <DSSection eyebrow="Most-recent first" title="Applications" icon={Rocket}>
        {apps.length === 0 ? (
          <p className="text-sm text-subtle">No applications in this view.</p>
        ) : (
          <div className="rounded-xl border border-line overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-elevated text-subtle">
                <tr>
                  <th className="text-left px-3 py-2">Applicant</th>
                  <th className="text-left px-3 py-2">Stream</th>
                  <th className="text-left px-3 py-2">Institution</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-left px-3 py-2">Submitted</th>
                  <th className="text-left px-3 py-2">Reviewer</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => {
                  const meta = STATUS_META[a.status as EquipStatus];
                  const stream = STREAM_META[a.stream as EquipStream];
                  return (
                    <tr key={a.id} className="border-t border-line">
                      <td className="px-3 py-2">
                        <p className="text-fg font-semibold">{a.user.name ?? "—"}</p>
                        <p className="text-[10px] text-subtle">{a.user.email}</p>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-fg">
                          {a.stream === "venture_lift" ? <Rocket size={11} /> : <Beaker size={11} />}
                          {stream.name}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted truncate max-w-[180px]">
                        {institutionLabel(a.institution, a.institutionOther)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-mono text-fg">
                        {a.approvedAmount
                          ? `$${a.approvedAmount.toLocaleString()}`
                          : a.requestedAmount
                            ? `$${a.requestedAmount.toLocaleString()}`
                            : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-subtle">
                        {a.submittedAt ? a.submittedAt.toISOString().slice(0, 10) : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted">{a.reviewer?.name ?? "—"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge tone={meta.tone} label={meta.label} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/admin/equip/${a.id}`}
                          className="text-xs font-bold text-brand-700 hover:text-brand-800 inline-flex items-center gap-0.5"
                        >
                          Review <ArrowRight size={11} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DSSection>
    </div>
  );
}

function StatusBadge({ tone, label }: { tone: string; label: string }) {
  const toneClass =
    tone === "emerald" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" :
    tone === "amber"   ? "bg-amber-50 text-amber-800 ring-amber-200" :
    tone === "rose"    ? "bg-rose-50 text-rose-800 ring-rose-200" :
    tone === "violet"  ? "bg-violet-50 text-violet-800 ring-violet-200" :
    tone === "brand"   ? "bg-brand-50 text-brand-800 ring-brand-200" :
                         "bg-elevated text-muted ring-line";
  return (
    <span className={"inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-inset " + toneClass}>
      {label}
    </span>
  );
}
