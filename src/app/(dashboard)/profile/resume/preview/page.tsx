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

export const dynamic = "force-dynamic";

export default async function ResumePreviewPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/profile/resume/preview");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const resume = await prisma.resume.findUnique({
    where: { userId },
    select: { content: true },
  });

  const content = (resume?.content as unknown as ResumeContent) ?? emptyResumeContent();

  return (
    <ResumePrintView
      content={content}
      fallbackName={user?.name ?? null}
      fallbackEmail={user?.email ?? null}
    />
  );
}
