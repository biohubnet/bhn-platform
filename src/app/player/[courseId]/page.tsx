import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { canAccessCourseContent } from "@/lib/courses/enrollment-status";
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
  // Learner identity — passed to ScormPlayer so the loader can seed
  // cmi.core.student_name / cmi.learner_name synchronously. Authoring-
  // tool packages (Articulate, Captivate, iSpring) read these on init
  // and abort if blank.
  const userName = (session.user as { name?: string }).name ?? null;

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  const role = (session.user as { role?: string }).role ?? "learner";
  const isStaff = checkIsStaff(role);

  // Status, not row existence. A `pending` request has not been
  // approved (and for a gated course has not been charged), and a
  // `withdrawn` row covers both leaving and being DECLINED by an
  // admin — none of which should open the course. This must stay
  // above the ScormSession create below: loading the page mints an
  // attempt row, so a gate placed after it still leaks a write.
  if (!isStaff && !canAccessCourseContent(enrollment?.status)) {
    redirect(`/courses/${courseId}`);
  }

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
      learnerId={userId}
      learnerName={userName}
    />
  );
}
