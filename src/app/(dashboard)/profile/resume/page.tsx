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
import { redirect } from "next/navigation";
import { ArrowRight, FileText, Sparkles } from "lucide-react";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { emptyResumeContent } from "@/lib/resume/types";
import { ResumeEditor } from "@/components/profile/ResumeEditor";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";

export const dynamic = "force-dynamic";

export default async function ResumeStructurePage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/profile/resume");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "trainee";
  const isStaff = checkIsStaff(role);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, resumeUrl: true },
  });
  if (!user) redirect("/login");

  // Scaffold a resume row on first visit so comments + revisions
  // have something to attach to. Idempotent — second visit reads it.
  const resume = await prisma.resume.upsert({
    where: { userId },
    create: {
      userId,
      sourceFileUrl: user.resumeUrl ?? null,
      content: emptyResumeContent() as unknown as object,
    },
    update: {},
    include: {
      comments: {
        include: { author: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const hasUploaded = !!user.resumeUrl;
  const hasParsed = !!resume.parsedAt;
  const showParseCTA = hasUploaded && !hasParsed;

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

        <ResumeEditor
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
          canParse={showParseCTA}
          ownerId={userId}
          postings={postings}
        />

        <p className="mt-6 text-[11px] text-fg-subtle text-center inline-flex items-center justify-center gap-1.5 w-full">
          Your edits save automatically and snapshot a revision. Mentors and admins can only comment — never edit.
          <ArrowRight size={11} />
        </p>
      </div>
    </div>
  );
}
