/**
 * /profile/resumes — index of every resume the user owns.
 *
 * Server shell: auth-gate, fetch the user's resumes (active +
 * archived), hand them to the client list. The client list owns the
 * mutations (rename / archive / restore / duplicate / new) so the
 * page can stay in-flight without full reloads.
 *
 * Multi-resume support landed in the 20260706 migration; see
 * src/lib/resume/active.ts for the lookup helper and
 * /api/profile/resumes for the CRUD endpoints this page consumes.
 */
import { redirect } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { ResumesIndexClient } from "@/components/profile/ResumesIndexClient";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";

export const dynamic = "force-dynamic";

export default async function ResumesIndexPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/profile/resumes");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "trainee";
  const isStaff = checkIsStaff(role);

  // When the user has uploaded a PDF via the Application Builder
  // (User.resumeUrl is set) AND they don't yet have a Resume row
  // pointing at that URL, scaffold one. Two ways the prior flow
  // missed this:
  //   1. New user who uploaded a PDF but never visited /profile/resume
  //      → no Resume row exists at all
  //   2. Existing user who uploaded a FRESH PDF after their first
  //      Resume row was created → the new URL never made it onto
  //      any Resume.sourceFileUrl
  // Either way, after this block runs there's at least one Resume
  // row referencing the latest uploaded PDF, so the user sees it
  // on this index + can re-parse from it.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { resumeUrl: true },
  });
  if (user?.resumeUrl) {
    const existingWithSameSource = await prisma.resume.findFirst({
      where: { userId, sourceFileUrl: user.resumeUrl },
      select: { id: true },
    });
    if (!existingWithSameSource) {
      // First check if the user has ANY resume at all.
      const anyResume = await prisma.resume.findFirst({
        where: { userId },
        select: { id: true, sourceFileUrl: true, isArchived: true },
        orderBy: { lastEditedAt: "desc" },
      });
      if (!anyResume) {
        // No resumes yet → create a Main resume pointing at the upload.
        const { emptyResumeContent } = await import("@/lib/resume/types");
        await prisma.resume.create({
          data: {
            userId,
            name: "Main resume",
            sourceFileUrl: user.resumeUrl,
            content: emptyResumeContent() as unknown as object,
          },
        });
      } else if (!anyResume.sourceFileUrl && !anyResume.isArchived) {
        // Existing main resume without a source → backfill it.
        await prisma.resume.update({
          where: { id: anyResume.id },
          data: { sourceFileUrl: user.resumeUrl },
        });
      } else {
        // User has a resume with a DIFFERENT source URL. The new
        // upload is a fresh PDF — give it its own row so they can
        // pick which to parse from.
        const { emptyResumeContent } = await import("@/lib/resume/types");
        await prisma.resume.create({
          data: {
            userId,
            name: "From uploaded PDF",
            sourceFileUrl: user.resumeUrl,
            content: emptyResumeContent() as unknown as object,
          },
        });
      }
    }
  }

  // We pull `content` here so the index can render a paper-style
  // thumbnail per row. Resume.content is a JSON blob containing the
  // structured tree; the thumbnail component only reads
  // header.name + sections[].title + items[].title + bullet counts,
  // which is cheap. For users with many resumes this is still a
  // bounded payload (~few KB each) so the overhead's fine.
  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: [{ isArchived: "asc" }, { lastEditedAt: "desc" }],
    select: {
      id: true,
      name: true,
      isArchived: true,
      lastEditedAt: true,
      version: true,
      parsedAt: true,
      sourceFileUrl: true,
      content: true,
      derivedFromId: true,
      derivedForPostingId: true,
      derivedFrom: { select: { id: true, name: true } },
      _count: { select: { comments: true, revisions: true } },
    },
  });

  // Resolve derived-from posting titles in a single secondary query.
  const postingIds = Array.from(
    new Set(
      resumes
        .map((r) => r.derivedForPostingId)
        .filter((id): id is string => !!id),
    ),
  );
  const postings = postingIds.length
    ? await prisma.internshipPosting.findMany({
        where: { id: { in: postingIds } },
        select: { id: true, title: true, companyName: true },
      })
    : [];
  const postingById = new Map(postings.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><FileText size={11} /> Profile · Your resumes</>}
        title="Your resumes"
        description="Maintain one master resume plus tailored copies per role. Each resume has its own version history, mentor comments, and PDF export."
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Admin-only seed/clear tray. Seed plants 10 demo resumes on
            the calling admin's account so the index page has real
            content to lay out against — useful when iterating on
            card design, batch operations, etc. Clear wipes ALL of
            the calling admin's resumes (self-scoped — never touches
            a real trainee's data). */}
        {isStaff && (
          <div className="mb-5">
            <DemoSeedAndClearTray
              entity="user_resumes_10"
              noun="10 demo resumes"
              clearHelp="Delete every resume on YOUR own account (cascades to comments + revisions). Self-scoped — other users' resumes are untouched. Re-seeding plants ten fresh demo rows."
            />
          </div>
        )}

        <ResumesIndexClient
          initialResumes={resumes.map((r) => ({
            id: r.id,
            name: r.name,
            isArchived: r.isArchived,
            lastEditedAt: r.lastEditedAt.toISOString(),
            version: r.version,
            hasParsed: !!r.parsedAt,
            sourceFileUrl: r.sourceFileUrl,
            content: r.content as never,
            derivedFrom: r.derivedFrom,
            derivedForPosting: r.derivedForPostingId
              ? (postingById.get(r.derivedForPostingId) ?? null)
              : null,
            commentCount: r._count.comments,
            revisionCount: r._count.revisions,
          }))}
        />

        <p className="mt-6 text-[11px] text-fg-subtle text-center inline-flex items-center justify-center gap-1.5 w-full">
          Archived resumes stay recoverable from here. Hard-delete is not exposed; ask an admin if you really need a row removed.
          <ArrowRight size={11} />
        </p>
      </div>
    </div>
  );
}
