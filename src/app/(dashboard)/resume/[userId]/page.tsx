/**
 * /resume/[userId] — mentor / instructor / admin / employer view of a
 * trainee's structured resume.
 *
 * Server shell: gate via canViewResume() (which encapsulates the
 * employer-eligibility + posting-pipeline check), load the resume +
 * its comment thread, hand both to ResumeViewer (read-only tree +
 * per-bullet comment composer).
 *
 * Editing is owner-only — this page never mutates Resume.content.
 * The only writes available from this surface are:
 *   • POST  /api/resume/[userId]/comments   (new comment)
 *   • PATCH /api/resume/[userId]/comments/[id]  (update status — staff
 *                                                can resolve / reopen)
 */
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { canViewResume, canCommentOnResume } from "@/lib/resume/permissions";
import type { ResumeContent } from "@/lib/resume/types";
import { ResumeViewer } from "@/components/resume/ResumeViewer";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function MentorResumePage({ params }: PageProps) {
  const { userId: ownerId } = await params;

  const session = await getSession();
  if (!session) redirect(`/login?callbackUrl=/resume/${ownerId}`);
  const viewerId = (session.user as { id?: string }).id;
  if (!viewerId) redirect("/login");
  const viewerRole = (session.user as { role?: string }).role ?? "trainee";

  // If the viewer is the owner, bounce to their own editor so they
  // don't see a read-only view of their own resume.
  if (viewerId === ownerId) redirect("/profile/resume");

  const allowed = await canViewResume({
    viewerId, viewerRole, resumeOwnerId: ownerId,
  });
  if (!allowed) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h1 className="text-base font-semibold text-rose-900">You don&apos;t have access to this resume.</h1>
          <p className="text-sm text-rose-800/80 mt-2">
            Resumes are visible to staff (admin / instructor / industrial mentor)
            and to employers who have an eligible applicant in their pipeline.
            Ask your admin if you think this is wrong.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-rose-900 hover:underline"
          >
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { id: true, name: true, email: true, role: true, resumeUrl: true },
  });
  if (!owner) notFound();

  const resume = await prisma.resume.findUnique({
    where: { userId: ownerId },
    include: {
      comments: {
        include: { author: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const canComment = await canCommentOnResume({
    viewerId, viewerRole, resumeOwnerId: ownerId,
  });

  // Empty resume → still render the page so the mentor can drop a
  // resume-wide comment that the trainee will see on first visit.
  const content: ResumeContent = resume
    ? (resume.content as unknown as ResumeContent)
    : { sections: [] };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><FileText size={11} /> Mentor view · Read-only resume</>}
        title={owner.name ?? owner.email ?? "Trainee resume"}
        description={
          resume
            ? "Comment on any bullet, item, or section. The trainee chooses what to apply — you can't edit their resume directly."
            : "This trainee hasn't started their structured resume yet. You can still leave a resume-wide comment they'll see on first visit."
        }
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card-solid ring-1 ring-line text-fg-muted">
            <UserRound size={12} /> {owner.name ?? owner.email}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card-solid ring-1 ring-line text-fg-muted">
            <ShieldCheck size={12} /> Viewing as {viewerRole}
          </span>
          {owner.resumeUrl && (
            <a
              href={owner.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-50 ring-1 ring-inset ring-brand-200 text-brand-900 font-medium hover:bg-brand-100 transition-colors"
            >
              <FileText size={12} /> Open uploaded file
            </a>
          )}
        </div>

        <ResumeViewer
          ownerId={ownerId}
          content={content}
          canComment={canComment}
          viewerId={viewerId}
          viewerRole={viewerRole}
          initialComments={(resume?.comments ?? []).map((c) => ({
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
        />
      </div>
    </div>
  );
}
