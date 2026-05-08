/**
 * Trainee "My Application" — manage the artifacts that follow you
 * across talent-application submissions: resume, 1-minute video
 * introduction, elevator pitch.
 *
 * These are stored on the User row (not on a single submission) so a
 * trainee builds them once and any later employer-facing form can
 * reference them. Employers see whatever is current at the moment a
 * submission is made; subsequent edits don't rewrite history.
 */
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApplicationClient } from "@/components/lms/ApplicationClient";

export const dynamic = "force-dynamic";

export default async function MyApplicationPage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      resumeUrl: true,
      videoIntroUrl: true,
      elevatorPitch: true,
      applicationUpdatedAt: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="My application"
        description="Build your resume, 1-minute video, and elevator pitch once — every form you submit pulls from here."
      />
      <ApplicationClient initial={{
        resumeUrl: user.resumeUrl,
        videoIntroUrl: user.videoIntroUrl,
        elevatorPitch: user.elevatorPitch,
        applicationUpdatedAt: user.applicationUpdatedAt
          ? user.applicationUpdatedAt.toISOString()
          : null,
      }} />
    </div>
  );
}
