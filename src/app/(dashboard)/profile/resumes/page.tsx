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
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { ResumesIndexClient } from "@/components/profile/ResumesIndexClient";

export const dynamic = "force-dynamic";

export default async function ResumesIndexPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/profile/resumes");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

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
        <ResumesIndexClient
          initialResumes={resumes.map((r) => ({
            id: r.id,
            name: r.name,
            isArchived: r.isArchived,
            lastEditedAt: r.lastEditedAt.toISOString(),
            version: r.version,
            hasParsed: !!r.parsedAt,
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
