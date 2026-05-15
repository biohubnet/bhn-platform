/**
 * Trainee-facing posting detail page.
 *
 * What the page does end-to-end:
 *   1. Loads the posting + the trainee's skill profile + posting skill
 *      requirements + any existing ApplicationStatus + saved-bookmark
 *      state — all in one Promise.all so the page renders in a single
 *      DB round-trip's worth of latency.
 *   2. Computes the trainee's match score against the posting via
 *      the existing scoreMatch() helper (lib/skills/ontology). Surfaces
 *      it inline so the trainee doesn't have to bounce back to the
 *      dashboard widget to see how they fit.
 *   3. Renders apply-direct contact info (the schema's contactEmail /
 *      contactName / contactPhone), with a one-click "Send my
 *      application" button that builds a `mailto:` pre-filled with the
 *      trainee's elevator pitch + resume URL + video URL from
 *      /profile/application. The same button POSTs to
 *      /api/internships/[id]/apply so BHN keeps an ApplicationStatus
 *      record (visible at /profile/applications).
 *   4. Save / unsave toggle (heart icon) for bookmarking.
 *   5. Status guard — closed / draft postings are 404 to non-staff,
 *      so stale links don't render an applyable shell.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Briefcase, MapPin, Clock, Calendar, DollarSign, ArrowLeft,
  Pencil, Globe, Mail, User, Phone, Sparkles,
} from "lucide-react";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import { scoreFitForTrainee } from "@/lib/matching/fit";
import { FitExplain } from "@/components/matching/FitExplain";
import { PostingActions } from "@/components/lms/PostingActions";
import { PostingDetailsMarkdown } from "@/components/lms/PostingDetailsMarkdown";
import { ApplyDialog } from "@/components/lms/ApplyDialog";

export const dynamic = "force-dynamic";

export default async function InternshipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "trainee";
  const userId = (session!.user as { id?: string }).id ?? null;
  const isStaff = checkIsStaff(role);

  const [posting, mySkills, postingSkills, savedRow, statusRow] = await Promise.all([
    prisma.internshipPosting.findUnique({ where: { id } }),
    userId
      ? prisma.userSkill.findMany({
          where: { userId },
          select: { skillId: true, level: true },
        })
      : Promise.resolve([]),
    prisma.postingSkill.findMany({
      where: { postingId: id },
      include: { skill: { select: { id: true, name: true } } },
    }),
    userId
      ? prisma.userSavedPosting.findUnique({
          where: { userId_postingId: { userId, postingId: id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    userId
      ? prisma.applicationStatus.findUnique({
          where: { postingId_applicantId: { postingId: id, applicantId: userId } },
          select: { status: true, updatedAt: true },
        })
      : Promise.resolve(null),
  ]);

  if (!posting) notFound();
  // Status guard — non-staff trainees never see closed or draft
  // postings, even when they hit the URL directly. Stale links from
  // emails / bookmarks now 404 instead of rendering an applyable shell.
  if (!isStaff && posting.status !== "active") notFound();

  // Pull resume / video / pitch in parallel where possible (these
  // power the apply CTA's mailto: pre-fill).
  const myArtifacts = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          resumeUrl: true,
          videoIntroUrl: true,
          elevatorPitch: true,
          name: true,
          email: true,
        },
      })
    : null;

  const fmtUrl = posting.website
    ? posting.website.startsWith("http")
      ? posting.website
      : `https://${posting.website}`
    : null;

  // Match: switched 2026-05-14 from the simpler scoreMatch helper to
  // the richer scoreFitForTrainee from src/lib/matching/fit.ts. The
  // new pipeline adds semantic-similarity (pgvector cosine) and
  // pathway-alignment subscores, plus explainability data (bridges,
  // gaps, caveats) the FitExplain panel renders. Only computed for
  // signed-in trainees (skipped for staff who are viewing the page).
  const fit =
    !isStaff && userId ? await scoreFitForTrainee(userId, posting.id) : null;

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/internships"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft size={12} /> All postings
      </Link>

      <article className="bg-card border border-line rounded-2xl overflow-hidden">
        {/* Header band */}
        <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-line bg-elevated/40">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-subtle">
                {posting.companyName}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-fg leading-tight mt-1.5">
                {posting.title}
              </h1>
              {fmtUrl && (
                <a
                  href={fmtUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 mt-2 text-sm text-brand-700 hover:underline"
                >
                  <Globe size={13} /> {posting.website?.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {posting.status === "draft" && <Badge tone="warning">Draft</Badge>}
              {posting.status === "closed" && <Badge tone="neutral">Closed</Badge>}
              {/* Always-visible primary Apply CTA — surfaces the
                  apply path the moment the trainee lands on the
                  page, regardless of whether the posting has a
                  contactEmail, a website, or neither. */}
              {!isStaff && userId && posting.status === "active" && (
                <>
                  {/* Prepare-with-AI CTA — pairs with the primary Apply
                      action. Sits next to Apply rather than below the
                      JD because the trainee's intent at this point is
                      almost always "should I apply, and am I ready?" */}
                  <Link
                    href={`/internships/${posting.id}/tailor`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-100 px-3 py-2 text-xs font-bold"
                    title="Gap-by-gap AI tailor: parse JD requirements, score your evidence, close each gap, get a hiring-manager verdict."
                  >
                    <Sparkles size={12} /> Tailor application
                  </Link>
                  <Link
                    href={`/internships/${posting.id}/prepare`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200 hover:bg-violet-100 px-3 py-2 text-xs font-bold"
                    title="4-step AI coach: resume comparison + gap closure + interview prep + STAR story builder"
                  >
                    <Sparkles size={12} /> Prep coach
                  </Link>
                  <ApplyDialog
                    postingId={posting.id}
                    postingTitle={posting.title}
                    companyName={posting.companyName}
                    contactEmail={posting.contactEmail}
                    contactName={posting.contactName}
                    websiteUrl={fmtUrl}
                    trainee={myArtifacts}
                    alreadyApplied={!!statusRow}
                  />
                </>
              )}
              {!isStaff && userId && (
                <PostingActions
                  postingId={posting.id}
                  initialSaved={!!savedRow}
                  initialApplied={!!statusRow}
                />
              )}
              {isStaff && (
                <Link
                  href={`/admin/internships/${posting.id}/edit`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 inline-flex items-center gap-1.5 font-medium"
                >
                  <Pencil size={13} /> Edit
                </Link>
              )}
            </div>
          </div>

          {/* Quick facts row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Fact icon={MapPin}      label="Location"     value={posting.location} />
            <Fact icon={Briefcase}   label="Type"         value={posting.type} />
            <Fact icon={Clock}       label="Duration"     value={posting.duration} />
            <Fact icon={DollarSign}  label="Compensation" value={posting.compensation} />
            <Fact icon={Clock}       label="Hours"        value={posting.hours} />
            <Fact
              icon={Calendar}
              label="Application deadline"
              value={posting.deadline ? posting.deadline.toLocaleDateString() : null}
            />
          </div>
        </div>

        {/* Skill-match panel — replaces the older lightweight match
            chip with the full FitExplain panel from
            src/components/matching/FitExplain.tsx. Always-expanded
            ("panel" variant) on the detail page because trainees
            land here with intent to evaluate, so hiding evidence
            behind a "Why this score?" toggle isn't right here. */}
        {fit && (
          <div className="px-6 sm:px-8 py-5 border-b border-line">
            <FitExplain
              fit={fit}
              variant="panel"
              heading="Why this match for you"
            />
          </div>
        )}

        {/* Skills */}
        {posting.keySkills.length > 0 && (
          <div className="px-6 sm:px-8 py-5 border-b border-line">
            <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle mb-2">Key skills</p>
            <div className="flex flex-wrap gap-2">
              {posting.keySkills.map((s) => (
                <span
                  key={s}
                  className="text-xs px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Apply contact box — only when we have an email to display.
            Older postings without contact info fall back to the
            external-website link below. */}
        {(posting.contactEmail || posting.contactName || posting.contactPhone) && (
          <div className="px-6 sm:px-8 py-5 border-b border-line bg-brand-50/30">
            <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle mb-3">
              Apply directly
            </p>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              {posting.contactName && (
                <ContactRow icon={User} label="Hiring contact" value={posting.contactName} />
              )}
              {posting.contactEmail && (
                <ContactRow
                  icon={Mail}
                  label="Email"
                  value={posting.contactEmail}
                  href={`mailto:${posting.contactEmail}`}
                />
              )}
              {posting.contactPhone && (
                <ContactRow
                  icon={Phone}
                  label="Phone"
                  value={posting.contactPhone}
                  href={`tel:${posting.contactPhone.replace(/[^+0-9]/g, "")}`}
                />
              )}
            </div>

            {/* The Apply CTA lives in the page header so it's the
                first thing the trainee sees. This contact box stays
                read-only — name / email / phone for direct outreach
                if the trainee prefers to skip the prefilled flow. */}
          </div>
        )}

        {/* Position details — markdown-rendered so headings, lists,
            and bold from the employer-supplied paste read cleanly. */}
        <div className="px-6 sm:px-8 py-6">
          <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle mb-3">Position details</p>
          <PostingDetailsMarkdown content={posting.positionDetails} />

          {/* No standalone fallback CTA here — the unified
              ApplyDialog in the page header handles every case
              (email / website-only / no-contact-at-all) through one
              modal flow. */}
        </div>
      </article>
    </div>
  );
}

function Fact({
  icon: Icon, label, value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-lg bg-card-solid border border-line text-brand-600 flex items-center justify-center shrink-0">
        <Icon size={13} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-subtle">{label}</p>
        <p className="text-sm font-medium text-fg break-words">{value}</p>
      </div>
    </div>
  );
}

function ContactRow({
  icon: Icon, label, value, href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="w-8 h-8 rounded-lg bg-card-solid border border-line text-brand-600 flex items-center justify-center shrink-0">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-subtle">{label}</p>
        <p className="text-sm font-medium text-fg break-words">{value}</p>
      </div>
    </>
  );
  if (href) {
    return (
      <a href={href} className="flex items-start gap-2 hover:bg-card rounded-lg p-1 -m-1 transition-colors">
        {inner}
      </a>
    );
  }
  return <div className="flex items-start gap-2">{inner}</div>;
}

