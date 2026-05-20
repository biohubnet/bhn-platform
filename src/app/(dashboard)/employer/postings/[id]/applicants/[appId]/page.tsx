import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft, User, Mail, Building2, Star, FileText, Briefcase, Calendar,
  GraduationCap, Lightbulb, ClipboardList,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUserEligibleForEmployers } from "@/lib/talent-pool/eligibility";
import { STAGE_LABELS, legalNextStages, type Stage } from "@/lib/hiring/stages";
import { ApplicantActions } from "@/components/hiring/ApplicantActions";
import { scoreFitForTrainee } from "@/lib/matching/fit";
import { FitExplain } from "@/components/matching/FitExplain";

/**
 * /employer/postings/[id]/applicants/[appId] — per-applicant ATS view.
 *
 * Pulls every related row in one shot — interviews, scores, offer —
 * and hands them to the client component that owns the action
 * surface (status transitions, interview scheduling, scoring,
 * offer creation/send).
 *
 * Auth: employer (own posting only), admin, superadmin.
 */
export const dynamic = "force-dynamic";

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string; appId: string }>;
}) {
  const { id, appId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id ?? null;
  const role = (session.user as { role?: string }).role ?? "";
  if (!userId) redirect("/login");
  if (!["employer", "admin", "superadmin"].includes(role)) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This view is for employer accounts.</p>
      </div>
    );
  }

  const app = await prisma.applicationStatus.findUnique({
    where: { id: appId },
    include: {
      posting: {
        select: {
          id: true,
          title: true,
          companyName: true,
          createdById: true,
          keySkills: true,
          skills: { select: { skill: { select: { id: true, name: true } }, required: true } },
        },
      },
      applicant: {
        select: {
          id: true,
          name: true,
          email: true,
          organization: true,
          jobTitle: true,
          bio: true,
          elevatorPitch: true,
          resumeUrl: true,
          videoIntroUrl: true,
        },
      },
      offer: true,
    },
  });
  if (!app || app.postingId !== id) notFound();
  if (role === "employer" && app.posting.createdById !== userId) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This posting belongs to another employer.</p>
      </div>
    );
  }

  // Eligibility gate — even though the URL is direct, employers
  // must not see an applicant whose talent-pool eligibility has
  // not been admin-approved (or has been revoked). Admins keep
  // full visibility so they can investigate flagged applications.
  if (role === "employer") {
    const eligible = await isUserEligibleForEmployers(app.applicantId);
    if (!eligible) {
      return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <Link
            href={`/employer/postings/${id}/applicants`}
            className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-4"
          >
            <ArrowLeft size={12} /> Back to applicants
          </Link>
          <div className="bg-rose-50 ring-1 ring-rose-200 rounded-2xl p-8 text-center">
            <p className="text-sm font-semibold text-rose-800 mb-1">
              This applicant isn&apos;t eligible for employer view yet.
            </p>
            <p className="text-[12.5px] text-rose-700 leading-relaxed max-w-[58ch] mx-auto">
              Their talent-application is in the pool but awaiting an admin&apos;s eligibility approval.
              The platform&apos;s admin team will notify you once they&apos;re cleared to be reviewed.
            </p>
          </div>
        </div>
      );
    }
  }

  const interviews = await prisma.interview.findMany({
    where: { postingId: id, applicantId: app.applicantId },
    orderBy: { createdAt: "desc" },
    include: {
      scheduledBy: { select: { id: true, name: true } },
    },
  });
  const interviewIds = interviews.map((i) => i.id);
  const scores =
    interviewIds.length > 0
      ? await prisma.interviewScore.findMany({
          where: { interviewId: { in: interviewIds } },
          include: { scorer: { select: { id: true, name: true } } },
        })
      : [];

  // Trainee context: skills + completed pathways + AI fit score
  // for THIS posting. All loaded in parallel.
  const [skills, completedPathways, fit, talentAppForm] = await Promise.all([
    prisma.userSkill.findMany({
      where: { userId: app.applicantId },
      select: {
        level: true,
        source: true,
        skill: { select: { id: true, name: true, category: true } },
      },
      orderBy: { level: "desc" },
      take: 30,
    }),
    prisma.pathwayEnrollment.findMany({
      where: { userId: app.applicantId, status: "completed" },
      select: {
        pathway: { select: { id: true, title: true } },
        completedAt: true,
      },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),
    scoreFitForTrainee(app.applicantId, id),
    // Talent application — global form submission cross-link.
    prisma.eventForm.findUnique({
      where: { slug: "talent-application" },
      select: { id: true },
    }),
  ]);
  const talentAppSubmission = talentAppForm
    ? await prisma.eventFormSubmission.findFirst({
        where: { formId: talentAppForm.id, userId: app.applicantId },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const stage = (app.status as Stage) ?? "new";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link
        href={`/employer/postings/${app.postingId}/pipeline`}
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> Back to pipeline
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            {app.posting.companyName} · {app.posting.title}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2 flex-wrap">
            <User size={22} className="text-brand-600" />
            {app.applicant.name ?? <span className="italic text-muted">No name</span>}
            <StageChip stage={stage} />
          </h1>
          <p className="text-sm text-muted mt-2 inline-flex items-center gap-2 flex-wrap">
            <Mail size={12} />
            <a href={`mailto:${app.applicant.email}`} className="hover:text-fg">{app.applicant.email}</a>
            {app.applicant.organization && (
              <>
                <span>·</span>
                <Building2 size={12} />
                {app.applicant.organization}
              </>
            )}
          </p>
          {app.applicant.jobTitle && (
            <p className="text-xs text-muted mt-1">{app.applicant.jobTitle}</p>
          )}
        </div>
      </header>

      {/* ── AI fit score for this posting ───────────────────────── */}
      <FitExplain fit={fit} variant="panel" heading="Fit for this posting" />

      {/* ── Cover letter (employer-visible, from apply time) ───── */}
      {app.coverLetter && (
        <section className="rounded-2xl border border-line bg-card p-5 surface-shadow">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-1.5">
            <ClipboardList size={11} />
            Cover letter
          </p>
          <p className="text-sm text-fg leading-relaxed whitespace-pre-line mt-2">
            {app.coverLetter}
          </p>
        </section>
      )}

      {/* ── Applicant materials ────────────────────────────────── */}
      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-4">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          Applicant materials
        </p>
        {app.applicant.elevatorPitch && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle mb-1">
              Elevator pitch
            </p>
            <p className="text-sm text-fg leading-relaxed whitespace-pre-line">
              {app.applicant.elevatorPitch}
            </p>
          </div>
        )}
        {app.applicant.bio && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle mb-1">
              Bio
            </p>
            <p className="text-sm text-fg leading-relaxed whitespace-pre-line">
              {app.applicant.bio}
            </p>
          </div>
        )}
        {!app.applicant.elevatorPitch && !app.applicant.bio && (
          <p className="text-sm text-muted italic">No pitch or bio on file.</p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {app.applicant.resumeUrl && (
            <a
              href={app.applicant.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg border border-line bg-card text-fg hover:bg-elevated px-3 py-1.5"
            >
              <FileText size={11} /> Resume
            </a>
          )}
          {app.applicant.videoIntroUrl && (
            <a
              href={app.applicant.videoIntroUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg border border-line bg-card text-fg hover:bg-elevated px-3 py-1.5"
            >
              📹 Video intro
            </a>
          )}
          {talentAppSubmission && (
            <Link
              href={`/employer/applicants#${talentAppSubmission.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-100 px-3 py-1.5"
              title={`Submitted ${new Date(talentAppSubmission.createdAt).toLocaleDateString("en-CA")}`}
            >
              <ClipboardList size={11} /> Talent application on file
            </Link>
          )}
        </div>
      </section>

      {/* ── Skills + Training ──────────────────────────────────── */}
      {(skills.length > 0 || completedPathways.length > 0) && (
        <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-4">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            Skills &amp; training
          </p>
          {skills.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle mb-2 inline-flex items-center gap-1.5">
                <Lightbulb size={11} />
                Skills on file ({skills.length})
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <li
                    key={s.skill.id}
                    className="text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-1 rounded-full bg-elevated text-fg ring-1 ring-inset ring-line"
                    title={`Level ${(s.level * 5).toFixed(1)}/5 · source: ${s.source}`}
                  >
                    {s.skill.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {completedPathways.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle mb-2 inline-flex items-center gap-1.5">
                <GraduationCap size={11} />
                Completed BHN pathways ({completedPathways.length})
              </p>
              <ul className="space-y-1">
                {completedPathways.map((p) => (
                  <li
                    key={p.pathway.id}
                    className="text-sm text-fg flex items-center justify-between gap-2"
                  >
                    <span className="font-semibold">{p.pathway.title}</span>
                    {p.completedAt && (
                      <span className="text-[10px] text-subtle font-mono">
                        {new Date(p.completedAt).toLocaleDateString("en-CA", { dateStyle: "medium" })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Action surface — client component */}
      <ApplicantActions
        applicationStatusId={app.id}
        currentStage={stage}
        legalNextStages={legalNextStages(stage)}
        postingSkills={app.posting.skills.map((ps) => ({
          id: ps.skill.id,
          name: ps.skill.name,
          required: ps.required ?? false,
        }))}
        applicantName={app.applicant.name ?? app.applicant.email}
        companyName={app.posting.companyName}
        postingTitle={app.posting.title}
        existingOffer={
          app.offer
            ? {
                id: app.offer.id,
                status: app.offer.status,
                body: app.offer.body,
                templateKey: app.offer.templateKey,
                compensation: app.offer.compensation,
                startDate: app.offer.startDate?.toISOString() ?? null,
                endDate: app.offer.endDate?.toISOString() ?? null,
                hoursPerWeek: app.offer.hoursPerWeek,
                location: app.offer.location,
                acceptDeadline: app.offer.acceptDeadline?.toISOString() ?? null,
                sentAt: app.offer.sentAt?.toISOString() ?? null,
                respondedAt: app.offer.respondedAt?.toISOString() ?? null,
                declineReason: app.offer.declineReason,
              }
            : null
        }
        interviews={interviews.map((i) => ({
          id: i.id,
          status: i.status,
          format: i.format,
          location: i.location,
          notes: i.notes,
          proposedSlots: Array.isArray(i.proposedSlots) ? (i.proposedSlots as string[]) : [],
          acceptedSlot: i.acceptedSlot?.toISOString() ?? null,
          scheduledByName: i.scheduledBy?.name ?? null,
          createdAt: i.createdAt.toISOString(),
          scores: scores
            .filter((s) => s.interviewId === i.id)
            .map((s) => ({
              id: s.id,
              scorerName: s.scorer.name,
              overallScore: s.overallScore,
              recommendation: s.recommendation,
              strengths: s.strengths,
              concerns: s.concerns,
            })),
        }))}
        currentScorerUserId={userId}
        employerNote={app.employerNote}
        rejectionReason={app.rejectionReason}
        rating={app.rating}
      />

      {/* Footer meta */}
      <footer className="rounded-2xl border border-dashed border-line bg-card p-4 text-xs text-muted leading-relaxed flex items-start gap-2">
        <Calendar size={11} className="shrink-0 mt-0.5" />
        <span>
          Applied {new Date(app.createdAt).toLocaleString("en-CA", { dateStyle: "medium" })}.
          In <strong>{STAGE_LABELS[stage] ?? stage}</strong> since{" "}
          {new Date(app.stageEnteredAt).toLocaleString("en-CA", { dateStyle: "medium" })}.
        </span>
      </footer>
    </div>
  );
}

function StageChip({ stage }: { stage: Stage }) {
  const tints: Record<string, string> = {
    new: "bg-slate-100 text-slate-700 ring-slate-200",
    reviewing: "bg-blue-100 text-blue-800 ring-blue-200",
    shortlisted: "bg-violet-100 text-violet-800 ring-violet-200",
    interview_scheduled: "bg-amber-100 text-amber-800 ring-amber-200",
    interviewed: "bg-amber-100 text-amber-800 ring-amber-200",
    offer: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    hired: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    passed: "bg-rose-100 text-rose-800 ring-rose-200",
    withdrawn: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${tints[stage] ?? tints.new}`}
    >
      <Briefcase size={9} className="mr-0.5" /> {STAGE_LABELS[stage] ?? stage}
      <Star size={9} className="hidden" />
    </span>
  );
}
