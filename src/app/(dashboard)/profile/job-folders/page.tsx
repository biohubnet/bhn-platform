/**
 * /profile/job-folders — index of the user's job folders.
 *
 * Each folder bundles a JD + tailored resume + cover letter +
 * interview prep into one application-shaped workspace. The
 * server shell renders cards; the client component handles
 * create / archive / restore / delete.
 */
import { redirect } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { JobFoldersIndexClient } from "@/components/profile/JobFoldersIndexClient";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";

export const dynamic = "force-dynamic";

export default async function JobFoldersIndexPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/profile/job-folders");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");
  const role   = (session.user as { role?: string }).role ?? "trainee";
  const isStaff = checkIsStaff(role);

  const folders = await prisma.jobFolder.findMany({
    where: { userId },
    orderBy: [{ isArchived: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      jdSnippet: true,
      status: true,
      isArchived: true,
      postingId: true,
      resumeId: true,
      coverLetter: true,
      interviewPrep: true,
      updatedAt: true,
      resume: { select: { id: true, name: true } },
    },
  });
  const postingIds = Array.from(
    new Set(folders.map((f) => f.postingId).filter((id): id is string => !!id)),
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
        eyebrow={<><FolderOpen size={11} /> Profile · Job folders</>}
        title="Your job folders"
        description="One folder per role you're pursuing. Each holds the JD, your tailored resume, a cover letter, and an interview prep guide — generated, tailored, and stored together."
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-5">
        {/* Admin / staff demo tray — seeds four fully-populated demo
            folders (drafting → submitted → interviewing → offer) onto
            the calling staff member's own account, with every title
            prefixed "[demo]". Clear targets that prefix exactly so it
            can't reach a real folder on the same user. Lives ABOVE the
            client index, never above the PageHero (hero is the top of
            every page — project rule). */}
        {isStaff && (
          <DemoSeedAndClearTray
            entity="user_job_folder"
            noun="demo job folders"
            clearHelp="Delete every JobFolder on your account whose title starts with [demo]. Real folders you've created are not touched."
          />
        )}
        <JobFoldersIndexClient
          initialFolders={folders.map((f) => ({
            id: f.id,
            title: f.title,
            jdSnippet: f.jdSnippet,
            status: f.status,
            isArchived: f.isArchived,
            updatedAt: f.updatedAt.toISOString(),
            resume: f.resume,
            posting: f.postingId ? (postingById.get(f.postingId) ?? null) : null,
            hasCoverLetter: f.coverLetter.trim().length > 0,
            hasInterviewPrep: f.interviewPrep.trim().length > 0,
          }))}
        />
      </div>
    </div>
  );
}
