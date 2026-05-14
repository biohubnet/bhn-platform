/**
 * Employer-facing talent applicants page.
 *
 * Reads every talent-application EventFormSubmission, scores each
 * applicant against the viewing employer's active postings via
 * lib/matching/fit, and hands a structured summary to the
 * TalentApplicantCard client component (which owns the resume /
 * video / comments drawers).
 *
 * Match-score scope:
 *   • employer → only their own active postings
 *   • admin / superadmin → all active postings
 * That way the chip a recruiter sees ("Strong fit · 78/100 — best
 * fit · Lab Tech I") is grounded in roles they actually own.
 */
import Link from "next/link";
import { ArrowLeft, Users2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";
import { scoreFitForTrainee } from "@/lib/matching/fit";
import { TalentApplicantCard, type TalentApplicantSummary } from "@/components/hiring/TalentApplicantCard";

export const dynamic = "force-dynamic";

export default async function EmployerApplicants() {
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "trainee";
  const viewerId = (session!.user as { id?: string }).id;
  if (role !== "employer" && !["admin", "superadmin"].includes(role)) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This portal is for employer accounts.</p>
      </div>
    );
  }
  const isAdminLike = role === "admin" || role === "superadmin";

  // Postings the viewer can match applicants against. Employers see
  // their own; admins see everything active so they can broker fit
  // across the platform.
  const postings = await prisma.internshipPosting.findMany({
    where: {
      status: "active",
      skills: { some: {} },
      ...(isAdminLike ? {} : { createdById: viewerId }),
    },
    select: { id: true, title: true },
  });

  const form = await prisma.eventForm.findUnique({
    where: { slug: "talent-application" },
    select: { id: true },
  });
  const submissions = form
    ? await prisma.eventFormSubmission.findMany({
        where: { formId: form.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];

  // Comment counts in one query — used for the badge before the
  // drawer opens. We don't include the comment bodies on the initial
  // page load (privacy + payload size); the drawer fetches them on
  // open.
  const commentCounts = submissions.length
    ? await prisma.applicationComment.groupBy({
        by: ["submissionId"],
        where: { submissionId: { in: submissions.map((s) => s.id) } },
        _count: { submissionId: true },
      })
    : [];
  const commentCountBySubmission = new Map<string, number>(
    commentCounts.map((c) => [c.submissionId, c._count.submissionId]),
  );

  // Score every (linked applicant × posting) pair once, in parallel.
  // Phase-1 volumes are sub-100 applicants × sub-20 postings so this
  // is well under a second; if volumes grow we'll cache per
  // (userId, postingId) on a short TTL.
  type Best = { postingId: string; postingTitle: string; score: number; band: "high" | "medium" | "low"; confidence: number } | null;
  const bestByUser = new Map<string, Best>();
  if (postings.length > 0) {
    const userIds = Array.from(
      new Set(submissions.map((s) => s.userId).filter((id): id is string => !!id)),
    );
    await Promise.all(
      userIds.map(async (uid) => {
        const fits = await Promise.all(
          postings.map(async (p) => {
            const fit = await scoreFitForTrainee(uid, p.id);
            return { postingId: p.id, postingTitle: p.title, fit };
          }),
        );
        fits.sort((a, b) => b.fit.score - a.fit.score);
        const top = fits[0];
        bestByUser.set(
          uid,
          top
            ? {
                postingId: top.postingId,
                postingTitle: top.postingTitle,
                score: top.fit.score,
                band: top.fit.band,
                confidence: top.fit.confidence,
              }
            : null,
        );
      }),
    );
  }

  const applicants: TalentApplicantSummary[] = submissions.map((s) => {
    const data = s.data as Record<string, unknown>;
    const firstName = String(data.first_name ?? "").trim();
    const lastName = String(data.last_name ?? "").trim();
    const initials = ((firstName[0] ?? "?") + (lastName[0] ?? "")).toUpperCase();
    const roleField = String(data.title_position ?? data.current_position ?? "").trim();
    const skills = Array.isArray(data.locations)
      ? (data.locations as unknown[]).map(String)
      : [];
    const pitch = String(data.pitch ?? "").trim();
    const resumeUrl = typeof data.resume === "string" && data.resume.length > 0 ? (data.resume as string) : null;
    const videoUrl = typeof data.video === "string" && data.video.length > 0 ? (data.video as string) : null;
    return {
      submissionId: s.id,
      email: s.email,
      createdAt: s.createdAt.toISOString(),
      firstName,
      lastName,
      initials,
      role: roleField,
      skills,
      pitch,
      resumeUrl,
      videoUrl,
      userId: s.userId,
      match: s.userId ? bestByUser.get(s.userId) ?? null : null,
      commentCount: commentCountBySubmission.get(s.id) ?? 0,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/employer"
          className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft size={12} /> Employer overview
        </Link>
        <h1 className="text-2xl font-bold text-fg">Talent applicants</h1>
        <p className="text-sm text-muted mt-0.5">
          {applicants.length} {applicants.length === 1 ? "applicant" : "applicants"} · sorted by most recent
          {postings.length > 0 && (
            <>
              {" "}
              · AI-matched against {postings.length}{" "}
              {postings.length === 1 ? "active posting" : "active postings"}
              {isAdminLike && " (platform-wide)"}
            </>
          )}
        </p>
      </div>

      {/* Admin-only seed/clear tray on the HR-facing applicants view.
          Lets admins (and admins acting-as employer) populate the
          page with demo applicants or wipe back to a fresh slate. */}
      {isAdminLike && (
        <div className="mb-4">
          <DemoSeedAndClearTray
            entity="form_submission"
            scope={{ formSlug: "talent-application" }}
            noun="demo applicants"
            clearHelp="Delete every talent-application submission from demo accounts. The submitters themselves stay (reusable for other tests). Real applicants are not touched."
          />
        </div>
      )}

      {applicants.length === 0 ? (
        <div className="bg-card border border-line rounded-2xl p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-elevated text-muted flex items-center justify-center mb-3">
            <Users2 size={20} />
          </div>
          <p className="font-medium text-muted">No applications yet</p>
          <p className="text-sm text-muted mt-1">
            Once candidates submit the talent application, they&apos;ll show up here for review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applicants.map((a) => (
            <TalentApplicantCard key={a.submissionId} applicant={a} />
          ))}
        </div>
      )}

      <div className="mt-8 bg-elevated/50 border border-dashed border-line rounded-2xl p-6 text-sm text-muted">
        <p className="font-semibold text-fg mb-1">Pipeline tooling</p>
        <p>
          Move applicants to interview / offer / hired from a posting&apos;s pipeline view
          (<Link href="/employer/postings" className="text-brand-700 hover:underline">/employer/postings</Link>{" "}
          → pick a posting → Pipeline). This view is the top-of-funnel: review materials,
          score fit, leave team-private comments, then route promising candidates to the
          posting they best match.
        </p>
      </div>
    </div>
  );
}
