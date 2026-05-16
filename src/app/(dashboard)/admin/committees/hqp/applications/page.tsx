/**
 * /admin/committees/hqp/applications — review queue for HQP
 * committee applications.
 *
 * Server-rendered table grouped by status. Approve transitions
 * the application to "approved" AND creates / re-activates the
 * applicant's CommitteeMembership row in one transaction.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { HqpApplicationRow } from "@/components/admin/HqpApplicationRow";
import {
  PROGRAM_PILLAR_LABELS, AREA_LABELS, STATUS_META,
  type HqpApplicationFormData, type HqpProgramPillar, type HqpAreaOfInterest,
  type HqpApplicationStatus,
} from "@/lib/hqp/types";

export const dynamic = "force-dynamic";

const TABS: { id: string; label: string }[] = [
  { id: "submitted", label: "Pending" },
  { id: "approved",  label: "Approved" },
  { id: "rejected",  label: "Not selected" },
  { id: "all",       label: "All" },
];

export default async function HqpApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");
  const sp = await searchParams;
  const active = sp.status ?? "submitted";
  const filter = active === "all" ? {} : { status: active };

  const apps = await prisma.hqpMemberApplication.findMany({
    where: filter,
    include: {
      user:   { select: { id: true, name: true, email: true, organization: true, role: true } },
      window: { select: { id: true, year: true, title: true } },
      decidedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const counts = {
    submitted: await prisma.hqpMemberApplication.count({ where: { status: "submitted" } }),
    approved:  await prisma.hqpMemberApplication.count({ where: { status: "approved"  } }),
    rejected:  await prisma.hqpMemberApplication.count({ where: { status: "rejected"  } }),
    all:       await prisma.hqpMemberApplication.count(),
  };

  return (
    <div className="space-y-5">
      <Link href="/admin/committees" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Committees
      </Link>
      <PageHeader
        title={<span className="inline-flex items-center gap-2"><Users2 size={22} className="text-violet-600" /> HQP applications</span>}
        description="Review applications to the HQP Advisory Committee. Approving creates a CommitteeMembership(hqp) row and the applicant immediately gets the welcome-screen badge + sidebar shortcut. Reject is soft — the application row stays in the audit trail."
      />

      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((t) => {
          const isActive = active === t.id;
          const count = counts[t.id as keyof typeof counts] ?? 0;
          return (
            <Link
              key={t.id}
              href={`/admin/committees/hqp/applications${t.id === "submitted" ? "" : `?status=${t.id}`}`}
              className={
                "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors " +
                (isActive
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-card text-muted border-line hover:border-line-strong")
              }
            >
              {t.label}<span className="ml-1.5 opacity-60">{count}</span>
            </Link>
          );
        })}
        <Link href="/admin/committees/hqp/windows" className="ml-auto text-xs font-bold text-brand-700 hover:text-brand-900">
          Manage open-call windows →
        </Link>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-12 text-center surface-shadow">
          <p className="font-medium text-fg">Nothing here</p>
          <p className="text-sm text-muted mt-1">No applications in this state.</p>
        </div>
      ) : (
        <section className="rounded-2xl border border-line bg-card overflow-hidden surface-shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] text-muted uppercase tracking-wide">
                <th className="px-5 py-3">Applicant</th>
                <th className="px-5 py-3">Programs + interests</th>
                <th className="px-5 py-3">Motivation</th>
                <th className="px-5 py-3">Window</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 w-px">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {apps.map((a) => {
                const f = (a.formData as HqpApplicationFormData) ?? {};
                const meta = STATUS_META[a.status as HqpApplicationStatus];
                return (
                  <tr key={a.id} className="align-top">
                    <td className="px-5 py-3">
                      <p className="text-fg font-medium">{a.user.name ?? "—"}</p>
                      <p className="text-[11px] text-subtle">{a.user.email}</p>
                      {a.user.organization && <p className="text-[11px] text-subtle">{a.user.organization}</p>}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-muted">
                      <p className="font-semibold text-fg">{(f.programsParticipating ?? []).map((p) => PROGRAM_PILLAR_LABELS[p as HqpProgramPillar]?.split(" — ")[0]).join(", ") || "—"}</p>
                      <p className="text-subtle mt-0.5">{(f.areasOfInterest ?? []).map((a) => AREA_LABELS[a as HqpAreaOfInterest]).join(", ") || "—"}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted max-w-xs">
                      <p className="line-clamp-3">{f.motivation ?? "—"}</p>
                      {f.perspective && <p className="text-[11px] text-subtle mt-1 line-clamp-2"><strong>Perspective:</strong> {f.perspective}</p>}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-muted whitespace-nowrap">
                      {a.window.year} · {a.window.title}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={meta.tone === "emerald" ? "success" : meta.tone === "rose" ? "danger" : meta.tone === "brand" ? "brand" : "neutral"}>
                        {meta.label}
                      </Badge>
                      {a.decidedBy?.name && (
                        <p className="text-[10px] text-subtle mt-1">by {a.decidedBy.name}</p>
                      )}
                      {a.reviewerNote && (
                        <p className="text-[10px] text-subtle italic mt-1 max-w-[180px] line-clamp-2">“{a.reviewerNote}”</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <HqpApplicationRow applicationId={a.id} status={a.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
