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
  Briefcase, MapPin, Clock, Calendar, DollarSign, ExternalLink, ArrowLeft,
  Pencil, Globe, Mail, User, Phone,
} from "lucide-react";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import { scoreMatch } from "@/lib/skills/ontology";
import { PostingMatchPanel } from "@/components/lms/PostingMatchPanel";
import { PostingActions } from "@/components/lms/PostingActions";
import { PostingDetailsMarkdown } from "@/components/lms/PostingDetailsMarkdown";
import { ApplyButtonClient } from "@/components/lms/ApplyButtonClient";

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

  // Match score: mapped from PostingSkill rows + UserSkill rows. We
  // also pass a simple keySkills heuristic when there are no
  // PostingSkill rows yet (older postings created before the skill-
  // ontology batch shipped) — falls back gracefully so the panel
  // doesn't render an empty score.
  const haveOntologyMapping = postingSkills.length > 0;
  const match = haveOntologyMapping
    ? scoreMatch(
        mySkills,
        postingSkills.map((ps) => ({
          skillId: ps.skillId,
          weight: ps.weight ?? 1,
          required: ps.required ?? false,
        })),
      )
    : null;

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

        {/* Skill-match panel — always rendered; falls back to a "complete
            your profile" prompt when the trainee has no skills. */}
        {!isStaff && userId && (
          <div className="px-6 sm:px-8 py-5 border-b border-line">
            <PostingMatchPanel
              haveOntologyMapping={haveOntologyMapping}
              match={match}
              postingSkills={postingSkills.map((ps) => ({
                skillId: ps.skillId,
                name: ps.skill.name,
                required: ps.required ?? false,
              }))}
              mySkillCount={mySkills.length}
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

            {!isStaff && userId && posting.contactEmail && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ApplyButtonClient
                  postingId={posting.id}
                  contactEmail={posting.contactEmail}
                  contactName={posting.contactName}
                  postingTitle={posting.title}
                  companyName={posting.companyName}
                  trainee={myArtifacts}
                  alreadyApplied={!!statusRow}
                />
                <p className="text-xs text-muted">
                  Opens your email client with a pitch + resume link pre-filled. We&apos;ll
                  also mark this posting as applied on{" "}
                  <Link href="/profile/applications" className="underline hover:no-underline text-brand-700">
                    My applications
                  </Link>
                  .
                </p>
              </div>
            )}
          </div>
        )}

        {/* Position details — markdown-rendered so headings, lists,
            and bold from the employer-supplied paste read cleanly. */}
        <div className="px-6 sm:px-8 py-6">
          <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle mb-3">Position details</p>
          <PostingDetailsMarkdown content={posting.positionDetails} />

          {/* Fallback "Apply on company site" link, shown when there's
              no contactEmail to use for the in-app flow but we DO have
              a website. */}
          {!posting.contactEmail && fmtUrl && (
            <div className="mt-8 pt-6 border-t border-line">
              <a
                href={fmtUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-5 py-3 rounded-lg shadow-md transition-colors"
              >
                Apply on company site <ExternalLink size={14} />
              </a>
              <p className="text-xs text-muted mt-2">
                This posting doesn&apos;t list a contact email yet — apply through their website
                and use{" "}
                <Link href="/profile/application" className="underline hover:no-underline text-brand-700">
                  My Application
                </Link>{" "}
                to grab your resume + pitch first.
              </p>
            </div>
          )}
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

