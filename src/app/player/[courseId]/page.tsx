import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { ScormPlayer } from "@/components/lms/ScormPlayer";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id!;

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  const role = (session.user as { role?: string }).role ?? "learner";
  const isStaff = checkIsStaff(role);

  if (!enrollment && !isStaff) redirect(`/courses/${courseId}`);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { scormPackage: true },
  });

  if (!course?.scormPackage) notFound();

  // Get or create session
  const existing = await prisma.scormSession.findFirst({
    where: { userId, packageId: course.scormPackage.id },
    orderBy: { attemptNumber: "desc" },
  });

  let scormSessionId: string;
  if (!existing || existing.status === "completed" || existing.status === "passed" || existing.status === "failed") {
    const last = existing?.attemptNumber ?? 0;
    const newSession = await prisma.scormSession.create({
      data: {
        userId,
        packageId: course.scormPackage.id,
        attemptNumber: last + 1,
        status: "not attempted",
      },
    });
    scormSessionId = newSession.id;
  } else {
    scormSessionId = existing.id;
  }

  return (
    <ScormPlayer
      courseId={courseId}
      courseTitle={course.title}
      packageId={course.scormPackage.id}
      scormVersion={course.scormPackage.version}
      entryPoint={`${course.scormPackage.uploadPath}/${course.scormPackage.entryPoint}`}
      sessionId={scormSessionId}
      suspendData={existing?.suspendData ?? null}
      location={existing?.location ?? null}
      completionStatus={existing?.status ?? "not attempted"}
    />
  );
}
