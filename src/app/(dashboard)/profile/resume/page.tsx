/**
 * /profile/resume — structured-resume editor.
 *
 * Server shell: auth-gate, fetch (or scaffold) the trainee's
 * structured resume + the team-private comment thread, hand both
 * to the ResumeEditor client component.
 *
 * The page wires three flows in one surface:
 *   • Edit  — the trainee owns the tree (section/item/bullet edits,
 *             reorder, add, delete). Saves through PATCH
 *             /api/profile/resume/structure with revision snapshots.
 *   • Parse — when the trainee has uploaded a PDF/DOCX (resumeUrl)
 *             but the structure is empty, a one-click "AI parse"
 *             button populates the tree.
 *   • Review — mentors / instructors / admins comment via
 *             /api/resume/[userId]/comments; the trainee sees the
 *             comments inline next to the relevant bullet + can mark
 *             each one applied / resolved.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, Sparkles } from "lucide-react";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { emptyResumeContent } from "@/lib/resume/types";
import { ResumeEditor } from "@/components/profile/ResumeEditor";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";
import { getOrCreateActiveResume } from "@/lib/resume/active";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ResumeStructurePage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/profile/resume");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "trainee";
  const isStaff = checkIsStaff(role);

  const { id: requestedResumeId } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, resumeUrl: true },
  });
  if (!user) redirect("/login");

  // Resolve the resume the page should load — explicit ?id= takes
  // precedence; otherwise the user's most-recently-edited non-archived
  // resume. Auto-creates a "Main resume" on first ever visit so the
  // landing experience just works.
  let activeBasic;
  try {
    activeBasic = await getOrCreateActiveResume({
      userId,
      resumeId: requestedResumeId ?? null,
    });
  } catch {
    // The user passed a resumeId that doesn't belong to them — 404.
    notFound();
  }

  // Backfill the source-file URL on first scaffold so future re-parse
  // flows have something to read from. Cheap update; no-op when the
  // user has never uploaded a PDF.
  if (!activeBasic.sourceFileUrl && user.resumeUrl) {
    await prisma.resume.update({
      where: { id: activeBasic.id },
      data: { sourceFileUrl: user.resumeUrl },
    });
  }

  const resume = await prisma.resume.findUnique({
    where: { id: activeBasic.id },
    include: {
      comments: {
        include: { author: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      derivedFrom: { select: { id: true, name: true } },
    },
  });
  if (!resume) notFound();
  void emptyResumeContent; // referenced via getOrCreateActiveResume

  // Sibling resumes — every resume this user owns. Powers the picker
  // dropdown at the top of the editor. Archived rows excluded; we
  // surface them from /profile/resumes (the index) instead.
  const siblings = await prisma.resume.findMany({
    where: { userId, isArchived: false },
    select: { id: true, name: true, lastEditedAt: true, derivedForPostingId: true },
    orderBy: { lastEditedAt: "desc" },
  });

  const hasUploaded = !!user.resumeUrl;
  const hasParsed = !!resume.parsedAt;
  // First-time CTA banner — shown until the first parse. After
  // parsing the in-toolbar "Parse / Re-parse" button remains
  // available (canParse below) for re-parsing after a new PDF upload.
  const showParseCTA = hasUploaded && !hasParsed;
  // Toolbar button is enabled whenever an uploaded PDF exists, so a
  // user who uploads a fresh resume later can re-parse without
  // having to refresh state by deleting the row.
  const canParse = hasUploaded;

  // Postings the trainee can tailor against. Active postings only;
  // cap to a sensible number for the dropdown (trainees usually
  // tailor against postings they've already shortlisted via
  // /internships, but we don't gate on that here). Sorted by
  // most-recently-created so the picker matches what they last saw.
  const postings = await prisma.internshipPosting.findMany({
    where: { status: "active" },
    select: { id: true, title: true, companyName: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      {/* Top back affordance — the editor is a deep page; users land
          here from the resume index, from a sibling-switch, or from
          a "Tailor → Save as new" jump. A persistent back link at
          both ends of the page short-circuits the browser-back hop. */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-2">
        <Link
          href="/profile/resumes"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={13} /> All resumes
        </Link>
      </div>

      <PageHero
        eyebrow={<><FileText size={11} /> Profile · Structured resume</>}
        title="Your resume — structured"
        description="Edit your resume as a structured tree of sections, items, and bullets. Mentors, instructors, and admins can leave comments pinned to any line; you decide what to apply. Export back to PDF anytime."
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Admin-only demo seed/clear. Seed replaces the calling admin's
            Resume with a multi-section demo tree + 3 mentor comments;
            Clear deletes the admin's Resume row (cascades comments +
            revisions). Real trainee resumes are never touched — the
            tray is self-scoped to the viewing admin's own user id. */}
        {isStaff && (
          <div className="mb-5">
            <DemoSeedAndClearTray
              entity="user_resume"
              noun="demo resume"
              clearHelp="Delete your structured resume + cascade its comments and revisions. Other users' resumes are untouched. Re-seeding rebuilds the demo tree from scratch."
            />
          </div>
        )}

        {showParseCTA && (
          <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl border border-brand-200 bg-brand-50/60">
            <span className="mt-0.5 inline-flex w-7 h-7 rounded-md bg-brand-100 text-brand-700 items-center justify-center shrink-0">
              <Sparkles size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-900">
                You have an uploaded resume on file — AI-parse it into structure
              </p>
              <p className="text-xs text-brand-800/80 mt-0.5">
                Click below and we&apos;ll read your uploaded PDF/DOCX and seed every section + bullet automatically.
                You can then edit anything, accept comments from mentors, and re-export to PDF.
              </p>
            </div>
          </div>
        )}

        {/* `key` forces a remount whenever the server-side version or
            parsedAt changes — i.e. when an admin clicks "Seed demo
            resume" or "Clear demo", or the trainee runs AI parse.
            Without the key the editor's useState would keep showing
            stale content because React preserves state across prop
            updates. During normal typing the parent server component
            doesn't re-render so version stays the same → no remount,
            no lost typing in progress. */}
        <ResumeEditor
          key={`${resume.id}-${resume.version}-${resume.parsedAt?.toISOString() ?? ""}-${resume.comments.length}`}
          initialResume={{
            id: resume.id,
            content: resume.content as never,
            version: resume.version,
            parsedAt: resume.parsedAt ? resume.parsedAt.toISOString() : null,
            sourceFileUrl: resume.sourceFileUrl,
          }}
          initialComments={resume.comments.map((c) => ({
            id: c.id,
            authorId: c.authorId,
            authorRole: c.authorRole,
            authorName: c.author.name,
            authorEmail: c.author.email,
            body: c.body,
            status: c.status as "open" | "resolved" | "applied",
            anchorBulletId:  c.anchorBulletId,
            anchorItemId:    c.anchorItemId,
            anchorSectionId: c.anchorSectionId,
            createdAt: c.createdAt.toISOString(),
          }))}
          canParse={canParse}
          hasParsed={hasParsed}
          ownerId={userId}
          postings={postings}
          siblings={siblings.map((s) => ({
            id: s.id,
            name: s.name,
            lastEditedAt: s.lastEditedAt.toISOString(),
            derivedForPostingId: s.derivedForPostingId,
          }))}
          currentName={resume.name}
        />

        <p className="mt-6 text-[11px] text-fg-subtle text-center inline-flex items-center justify-center gap-1.5 w-full">
          Your edits save automatically and snapshot a revision. Mentors and admins can only comment — never edit.
          <ArrowRight size={11} />
        </p>

        {/* Bottom back affordance — paired with the top one. The
            editor can be long when multiple sections are expanded;
            scrolling all the way back up to leave the page is a
            paper-cut we don't need to inflict. */}
        <div className="mt-6 mb-4 flex justify-center">
          <Link
            href="/profile/resumes"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-fg-muted ring-1 ring-line bg-card-solid hover:bg-elevated hover:text-fg transition-colors"
          >
            <ArrowLeft size={14} /> Back to all resumes
          </Link>
        </div>
      </div>
    </div>
  );
}
