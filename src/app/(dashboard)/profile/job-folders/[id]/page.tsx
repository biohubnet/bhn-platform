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
      resume: { select: { id: true, name: true, version: true, content: true } },
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
      events: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, kind: true, body: true, createdAt: true },
      },
    },
  });
  if (!folder || folder.userId !== userId) notFound();

  // Past folders' cover letters → fuel the "Pull from past" sidebar
  // on the cover-letter tab. Cap at 10 most-recent with non-empty
  // letters so we don't ship hundreds of strings to the client.
  const pastCoverLetters = await prisma.jobFolder.findMany({
    where: {
      userId,
      id: { not: folder.id },
      coverLetter: { not: "" },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: { id: true, title: true, coverLetter: true, updatedAt: true },
  });

  // STAR stories from the trainee's Story Bank → fuel the cross-link
  // sidebar on the interview-prep tab. Just titles + situation +
  // skill tags so the panel can render previews without shipping the
  // whole story body.
  const starStories = await prisma.starStory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      skills: { include: { skill: { select: { name: true } } } },
    },
  });

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
            notes: folder.notes,
            status: folder.status,
            resumeId: folder.resumeId,
            postingId: folder.postingId,
            resume: folder.resume,
            posting,
            applicationUrl: folder.applicationUrl,
            appliedAt: folder.appliedAt?.toISOString() ?? null,
            deadline: folder.deadline?.toISOString() ?? null,
            recruiterName: folder.recruiterName,
            recruiterEmail: folder.recruiterEmail,
            referredBy: folder.referredBy,
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
            events: folder.events.map((e) => ({
              id: e.id,
              kind: e.kind,
              body: e.body,
              createdAt: e.createdAt.toISOString(),
            })),
            // Skill-match reads JD body + the linked resume's
            // structured content. Threading the raw payload through
            // so the client-side scorer can run on every JD edit
            // without a server round-trip.
            resumeContent: (folder.resume?.content ?? null) as unknown,
            pastCoverLetters: pastCoverLetters.map((p) => ({
              id: p.id,
              title: p.title,
              coverLetter: p.coverLetter,
              updatedAt: p.updatedAt.toISOString(),
            })),
            starStories: starStories.map((s) => ({
              id: s.id,
              title: s.title,
              situation: s.situation,
              skills: s.skills.map((ss) => ss.skill.name),
            })),
          }}
          resumes={resumes.map((r) => ({ id: r.id, name: r.name }))}
        />
      </div>
    </div>
  );
}
