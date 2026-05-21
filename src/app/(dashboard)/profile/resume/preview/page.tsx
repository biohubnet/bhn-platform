/**
 * /profile/resume/preview — print-styled preview of the trainee's
 * structured resume.
 *
 * Server shell: auth-gate, fetch the user's Resume row, hand the
 * content to ResumePrintView. The print component owns the page
 * chrome (only a thin "back to editor" + "Save as PDF" toolbar,
 * hidden from the printed output).
 *
 * Browser-driven PDF export — clicking "Save as PDF" opens the
 * native print dialog where the user picks "Save as PDF" as the
 * destination. No server-side PDF library, no new dependency. The
 * trade-off is light browser-to-browser variation in the output;
 * the gain is zero infra cost and zero extra deploy surface.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emptyResumeContent, type ResumeContent } from "@/lib/resume/types";
import { ResumePrintView } from "@/components/profile/ResumePrintView";
import { getActiveResume } from "@/lib/resume/active";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ResumePreviewPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/profile/resume/preview");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const { id: requestedResumeId } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  // Resolve which resume to render — explicit ?id= (e.g. from the
  // index page's "Preview" action on a tailored copy) or fall back
  // to the most-recently-edited one.
  const target = await getActiveResume({
    userId,
    resumeId: requestedResumeId ?? null,
  });
  const resume = target
    ? await prisma.resume.findUnique({
        where: { id: target.id },
        select: { content: true, name: true },
      })
    : null;

  const content = (resume?.content as unknown as ResumeContent) ?? emptyResumeContent();

  return (
    <ResumePrintView
      content={content}
      fallbackName={user?.name ?? null}
      fallbackEmail={user?.email ?? null}
    />
  );
}
