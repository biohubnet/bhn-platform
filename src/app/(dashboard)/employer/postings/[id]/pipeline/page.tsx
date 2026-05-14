import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Users2, Clock, Inbox } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KANBAN_COLUMNS, STAGE_LABELS, type Stage } from "@/lib/hiring/transitions";
import { PipelineKanban } from "@/components/hiring/PipelineKanban";

/**
 * /employer/postings/[id]/pipeline — the Kanban hiring pipeline.
 *
 * Six columns, derived from KANBAN_COLUMNS in the service: Applied,
 * Reviewing, Interview, Offer, Hired, Passed. Each application card
 * is draggable between adjacent columns; the underlying service
 * validates legal transitions, so dropping somewhere illegal bounces
 * back with a friendly error.
 *
 * Auth: employer (own posting only), admin, superadmin.
 */
export const dynamic = "force-dynamic";

export default async function PipelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/employer/postings/${id}/pipeline`)}`);
  const userId = (session.user as { id?: string }).id ?? null;
  const role = (session.user as { role?: string }).role ?? "";
  if (!userId) redirect(`/login?callbackUrl=${encodeURIComponent(`/employer/postings/${id}/pipeline`)}`);
  if (!["employer", "admin", "superadmin"].includes(role)) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This view is for employer accounts.</p>
      </div>
    );
  }

  const posting = await prisma.internshipPosting.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      companyName: true,
      status: true,
      createdById: true,
    },
  });
  if (!posting) notFound();
  if (role === "employer" && posting.createdById !== userId) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This posting belongs to another employer.</p>
      </div>
    );
  }

  // Load every ApplicationStatus row for this posting, plus the
  // applicant's basic info + the offer status (if any).
  const apps = await prisma.applicationStatus.findMany({
    where: { postingId: id },
    include: {
      applicant: {
        select: { id: true, name: true, email: true, organization: true },
      },
      offer: { select: { id: true, status: true } },
    },
    orderBy: { stageEnteredAt: "desc" },
  });

  // Group by Kanban column.
  const stageToColumn = new Map<string, string>();
  for (const c of KANBAN_COLUMNS) {
    for (const s of c.stages) stageToColumn.set(s, c.id);
  }
  const byColumn = new Map<string, typeof apps>();
  for (const col of KANBAN_COLUMNS) byColumn.set(col.id, []);
  for (const a of apps) {
    const colId = stageToColumn.get(a.status) ?? "passed";
    byColumn.get(colId)!.push(a);
  }

  return (
    <div className="space-y-5">
      <Link
        href="/employer/postings"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> All postings
      </Link>

      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Employer · {posting.companyName}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
          <Users2 size={22} className="text-brand-600" />
          {posting.title} · Pipeline
        </h1>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          Drag a candidate between columns to move them through the pipeline.
          The platform validates legal transitions, writes an audit row,
          and emails the candidate when their stage changes.
        </p>
      </header>

      {/* Summary chips */}
      <ul className="flex flex-wrap gap-2">
        {KANBAN_COLUMNS.map((col) => (
          <li
            key={col.id}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-1.5"
          >
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">
              {col.label}
            </span>
            <span className="text-sm font-bold font-mono tabular-nums text-fg">
              {byColumn.get(col.id)!.length}
            </span>
          </li>
        ))}
      </ul>

      {apps.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-12 text-center">
          <Inbox size={20} className="text-subtle mx-auto" />
          <p className="font-medium text-fg mt-2">No applications yet</p>
          <p className="text-xs text-muted mt-1">
            Applications will appear here as trainees apply.
          </p>
        </div>
      ) : (
        <PipelineKanban
          postingId={posting.id}
          columns={KANBAN_COLUMNS.map((c) => ({
            ...c,
            apps: byColumn.get(c.id)!.map((a) => ({
              id: a.id,
              applicantName: a.applicant.name ?? a.applicant.email,
              applicantEmail: a.applicant.email,
              applicantOrg: a.applicant.organization,
              status: a.status,
              stageLabel: STAGE_LABELS[a.status as Stage] ?? a.status,
              stageEnteredAt: a.stageEnteredAt.toISOString(),
              rating: a.rating,
              offerStatus: a.offer?.status ?? null,
            })),
          }))}
        />
      )}

      {/* Source-of-truth footer */}
      <p className="text-[11px] text-muted mt-6 inline-flex items-center gap-1.5">
        <Clock size={11} />
        Time-in-stage analytics:{" "}
        <Link href="/admin/pipeline-analytics" className="text-brand-700 font-semibold hover:underline">
          /admin/pipeline-analytics
        </Link>
      </p>
    </div>
  );
}
