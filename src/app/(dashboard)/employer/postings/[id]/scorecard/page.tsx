/**
 * /employer/postings/[id]/scorecard — per-posting interview scorecard
 * builder and submission review surface.
 *
 * Gated: employer (must own the posting's company) or admin.
 */

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Lock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/employer/company";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { ScorecardBuilder } from "@/components/employer/scorecard/ScorecardBuilder";
import { SubmissionsPanel } from "@/components/employer/scorecard/SubmissionsPanel";

export const dynamic = "force-dynamic";

export default async function ScorecardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");

  const userId   = (session.user as { id: string }).id;
  const userRole = (session.user as { role?: string }).role ?? "trainee";
  const isAdmin  = userRole === "admin" || userRole === "superadmin";

  if (userRole !== "employer" && !isAdmin) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This page is for employer accounts.</p>
      </div>
    );
  }

  // Fetch the posting
  const posting = await prisma.internshipPosting.findUnique({
    where:  { id },
    select: { id: true, title: true, companyName: true, companyId: true, createdById: true },
  });

  if (!posting) notFound();

  // Access check: admin bypasses; employers must belong to the company
  if (!isAdmin) {
    const companyId = await getActiveCompanyId(userId).catch(() => null);
    const isMember  = companyId && posting.companyId === companyId;
    const isCreator = posting.createdById === userId;
    if (!isMember && !isCreator) {
      return (
        <div className="bg-card border border-line rounded-2xl p-12 text-center">
          <p className="font-medium text-muted">You don't have access to this posting.</p>
        </div>
      );
    }
  }

  // Fetch scorecard (nullable) and submissions
  const scorecard = await prisma.interviewScorecard.findUnique({
    where:  { postingId: id },
    select: {
      id:       true,
      criteria: true,
      locked:   true,
    },
  });

  // Serialise scorecard for the client
  const scorecardData = scorecard
    ? {
        id:       scorecard.id,
        criteria: scorecard.criteria as Array<{
          id:           string;
          label:        string;
          description?: string;
          scale:        4 | 5;
        }>,
        locked:   scorecard.locked,
      }
    : null;

  // Fetch submitted (not draft) submissions if scorecard exists
  const submissionsRaw = scorecard
    ? await prisma.scorecardSubmission.findMany({
        where:   { scorecardId: scorecard.id, status: "submitted" },
        select: {
          id:                  true,
          applicationStatusId: true,
          interviewerId:       true,
          scores:              true,
          recommendation:      true,
          summary:             true,
          status:              true,
          submittedAt:         true,
          interviewer: { select: { name: true } },
        },
        orderBy: { submittedAt: "desc" },
      })
    : [];

  const submissions = submissionsRaw.map((s) => ({
    id:                  s.id,
    applicationStatusId: s.applicationStatusId,
    interviewerId:       s.interviewerId,
    interviewerName:     s.interviewer.name,
    scores:              s.scores as Record<string, { score: number; note?: string }>,
    recommendation:      s.recommendation ?? "",
    summary:             s.summary,
    status:              s.status,
    submittedAt:         s.submittedAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-5">
      <Link
        href="/employer/postings"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
      >
        <ArrowLeft size={12} /> Back to postings
      </Link>

      <DSPageHeader
        eyebrow="Hiring tools"
        icon={<ClipboardList size={20} />}
        title={`Scorecard — ${posting.title}`}
        description="Define evaluation criteria for this role and review interviewer submissions."
      />

      {!scorecardData?.locked && (
        <ScorecardBuilder postingId={id} scorecard={scorecardData} />
      )}

      {scorecardData?.locked && (
        <div className="rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 p-4 flex items-start gap-3">
          <Lock size={14} className="text-emerald-700 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-900">
            Scorecard locked — criteria are final. Interviewers can still submit evaluations.
          </p>
        </div>
      )}

      <SubmissionsPanel
        postingId={id}
        submissions={submissions}
        scorecard={scorecardData}
      />
    </div>
  );
}
