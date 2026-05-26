/**
 * /profile/job-folders/[id] — detail editor for a single job folder.
 *
 * Tabs: JD · Resume · Cover letter · Interview prep. Each tab owns
 * its own editor; auto-saves to the folder via PATCH.
 *
 * Cover letter + interview prep have an "AI generate" button that
 * uses the JD + linked resume content to draft text. Preview before
 * applying.
 */
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FolderOpen } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { JobFolderEditor } from "@/components/profile/JobFolderEditor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JobFolderDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const { id } = await params;

  const folder = await prisma.jobFolder.findUnique({
    where: { id },
    include: {
      resume: { select: { id: true, name: true, version: true } },
      simulationRequest: {
        select: {
          id: true,
          status: true,
          adminNotes: true,
          createdAt: true,
          simulationId: true,
          simulation: {
            select: { id: true, jobTitle: true, companyName: true },
          },
        },
      },
    },
  });
  if (!folder || folder.userId !== userId) notFound();

  // If the linked request has been fulfilled, resolve the user's most
  // recent attempt against the produced simulation so the "Play"
  // button on the Role-play tab can deep-link to the right attempt.
  let simAttemptId: string | null = null;
  if (
    folder.simulationRequest?.status === "ready" &&
    folder.simulationRequest.simulationId
  ) {
    const attempt = await prisma.simulationAttempt.findFirst({
      where: {
        userId,
        simulationId: folder.simulationRequest.simulationId,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, finished: true, week: true },
    });
    simAttemptId = attempt?.id ?? null;
  }

  // Sibling resumes for the resume-picker on the detail page.
  const resumes = await prisma.resume.findMany({
    where: { userId, isArchived: false },
    select: { id: true, name: true, derivedForPostingId: true },
    orderBy: { lastEditedAt: "desc" },
  });

  // Posting (if linked).
  const posting = folder.postingId
    ? await prisma.internshipPosting.findUnique({
        where: { id: folder.postingId },
        select: { id: true, title: true, companyName: true, positionDetails: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={
          <>
            <Link href="/profile/job-folders" className="inline-flex items-center gap-1 text-fg-muted hover:text-fg">
              <ArrowLeft size={11} /> All folders
            </Link>
            <span className="mx-1">·</span>
            <FolderOpen size={11} /> Folder
          </>
        }
        title={folder.title}
        description="Your bundled workspace for this role — job description, the resume you tailored, your cover letter, and the interview prep guide."
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <JobFolderEditor
          initialFolder={{
            id: folder.id,
            title: folder.title,
            jdSnippet: folder.jdSnippet,
            coverLetter: folder.coverLetter,
            interviewPrep: folder.interviewPrep,
            status: folder.status,
            resumeId: folder.resumeId,
            postingId: folder.postingId,
            resume: folder.resume,
            posting,
            simulationRequest: folder.simulationRequest
              ? {
                  id: folder.simulationRequest.id,
                  status: folder.simulationRequest.status,
                  adminNotes: folder.simulationRequest.adminNotes,
                  createdAt: folder.simulationRequest.createdAt.toISOString(),
                  simulation: folder.simulationRequest.simulation,
                  attemptId: simAttemptId,
                }
              : null,
          }}
          resumes={resumes.map((r) => ({ id: r.id, name: r.name }))}
        />
      </div>
    </div>
  );
}
