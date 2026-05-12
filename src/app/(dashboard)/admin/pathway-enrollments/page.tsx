import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PathwayEnrollmentDecideButtons } from "@/components/admin/PathwayEnrollmentDecideButtons";
import { DemoPhantomTray, type DemoScenario } from "@/components/admin/DemoPhantomTray";

interface Row {
  id: string;
  pathwayId: string;
  status: string;
  requestReason: string | null;
  reviewerNote: string | null;
  enrolledAt: Date;
  approvedAt: Date | null;
  reviewedAt: Date | null;
  pathway: { id: string; title: string; capacity: number | null };
  user: { id: string; name: string | null; email: string; organization: string | null; jobTitle: string | null };
}

export default async function AdminPathwayEnrollmentsPage({ searchParams }: { searchParams: Promise<{ pathwayId?: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");
  const sp = await searchParams;

  const where = sp.pathwayId ? { pathwayId: sp.pathwayId } : {};
  const enrolls = await prisma.pathwayEnrollment.findMany({
    where,
    include: { pathway: { select: { id: true, title: true, capacity: true } } },
    orderBy: { enrolledAt: "asc" },
    take: 500,
  });
  const userIds = enrolls.map((e) => e.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, organization: true, jobTitle: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  const rows: Row[] = enrolls.map((e) => ({
    id: e.id,
    pathwayId: e.pathwayId,
    status: e.status,
    requestReason: e.requestReason,
    reviewerNote: e.reviewerNote,
    enrolledAt: e.enrolledAt,
    approvedAt: e.approvedAt,
    reviewedAt: e.reviewedAt,
    pathway: e.pathway,
    user: userMap.get(e.userId) ?? { id: "", name: null, email: "—", organization: null, jobTitle: null },
  }));

  // Count of approved enrollments per pathway, for capacity-aware copy
  const approvedCounts = await prisma.pathwayEnrollment.groupBy({
    by: ["pathwayId"],
    where: { status: { in: ["approved", "completed"] } },
    _count: { _all: true },
  });
  const approvedMap = new Map(approvedCounts.map((c) => [c.pathwayId, c._count._all]));

  const pendingRows  = rows.filter((r) => r.status === "pending");
  const waitlistRows = rows.filter((r) => r.status === "waitlisted");
  const approvedRows = rows.filter((r) => r.status === "approved");
  const completedRows= rows.filter((r) => r.status === "completed");
  const rejectedRows = rows.filter((r) => r.status === "rejected");

  // Distinct pathways for filter
  const pathwayList = await prisma.pathway.findMany({
    where: { status: "published" },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pathway enrollments"
        description="Review trainee requests, manage waitlists, and adjust per-pathway enrollment policy."
      />

      {/* Pathway filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/admin/pathway-enrollments"
          className={
            "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors " +
            (!sp.pathwayId
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-card text-muted border-line hover:border-line-strong")
          }
        >
          All pathways <span className="ml-1.5 opacity-60">{rows.length}</span>
        </Link>
        {pathwayList.map((p) => (
          <Link
            key={p.id}
            href={`/admin/pathway-enrollments?pathwayId=${p.id}`}
            className={
              "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors truncate max-w-xs " +
              (sp.pathwayId === p.id
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-card text-muted border-line hover:border-line-strong")
            }
          >
            {p.title}
          </Link>
        ))}
      </div>

      {/* Sections */}
      <Section title="Pending review"      tone="amber"   rows={pendingRows}   approvedMap={approvedMap} showQueuePosition={false} />
      <Section title="Waitlist"            tone="warning" rows={waitlistRows}  approvedMap={approvedMap} showQueuePosition />
      <Section title="Approved · in pathway" tone="brand" rows={approvedRows}  approvedMap={approvedMap} showQueuePosition={false} />
      <Section title="Completed"           tone="success" rows={completedRows} approvedMap={approvedMap} showQueuePosition={false} />
      <Section title="Rejected · withdrawn" tone="neutral" rows={rejectedRows} approvedMap={approvedMap} showQueuePosition={false} />

      {/* Demo controls — same pattern as the /admin/enrollments dashboard.
          Spawns phantoms with pending pathway-enrollment requests so this
          page has something to show during a walkthrough. */}
      <DemoPhantomTray
        scenarios={[
          {
            kind: "pathway_enrollment_request",
            label: pathwayList.length === 0
              ? "Pending pathway request (no published pathways yet)"
              : "Pending pathway request",
            options: pathwayList.map((p) => ({ id: p.id, label: p.title })),
          } satisfies DemoScenario,
        ]}
        contextLabel="pathway requests"
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  tone: "amber" | "warning" | "brand" | "success" | "neutral";
  rows: Row[];
  approvedMap: Map<string, number>;
  showQueuePosition: boolean;
}

function Section({ title, tone, rows, approvedMap, showQueuePosition }: SectionProps) {
  if (rows.length === 0) return null;

  // Queue position is the row's index within the section + 1 (already
  // sorted by enrolledAt ascending across all rows; per-pathway grouping
  // gives accurate positions when mixed pathways are shown).
  const positionByPathway = new Map<string, number>();

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-semibold text-fg">{title}</h2>
        <Badge tone={tone}>{rows.length}</Badge>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
              {showQueuePosition && <th className="px-5 py-3 w-12">#</th>}
              <th className="px-5 py-3">Trainee</th>
              <th className="px-5 py-3">Pathway</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3">Submitted</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              let position: number | null = null;
              if (showQueuePosition) {
                position = (positionByPathway.get(r.pathwayId) ?? 0) + 1;
                positionByPathway.set(r.pathwayId, position);
              }
              const cap = approvedMap.get(r.pathwayId) ?? 0;
              const capLabel = r.pathway.capacity != null ? ` · ${cap}/${r.pathway.capacity}` : "";
              return (
                <tr key={r.id} className="hover:bg-elevated/50 align-top">
                  {showQueuePosition && (
                    <td className="px-5 py-3 text-fg font-mono">{position}</td>
                  )}
                  <td className="px-5 py-3">
                    <p className="font-medium text-fg">{r.user.name ?? "—"}</p>
                    <p className="text-xs text-subtle">{r.user.email}</p>
                    {(r.user.organization || r.user.jobTitle) && (
                      <p className="text-xs text-subtle mt-0.5">
                        {[r.user.jobTitle, r.user.organization].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/pathways/${r.pathwayId}`} className="text-fg hover:text-brand-700 font-medium truncate inline-block max-w-[200px]">
                      {r.pathway.title}
                    </Link>
                    <p className="text-xs text-subtle">{capLabel.replace(/^ · /, "")}</p>
                  </td>
                  <td className="px-5 py-3 text-muted text-xs max-w-[280px]">
                    <p className="line-clamp-3">{r.requestReason ?? "—"}</p>
                    {r.reviewerNote && (
                      <p className="text-subtle mt-1 italic line-clamp-2">Reviewer: {r.reviewerNote}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-subtle text-xs whitespace-nowrap">
                    {new Date(r.enrolledAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <PathwayEnrollmentDecideButtons id={r.id} status={r.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
