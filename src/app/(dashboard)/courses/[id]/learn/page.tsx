import { getSession, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { ModuleReader } from "@/components/lms/ModuleReader";

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ module?: string }>;
}) {
  const { id: courseId } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "learner";
  const isStaff = isAdmin(role);

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment && !isStaff) redirect(`/courses/${courseId}`);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: { orderBy: { order: "asc" } },
      assessments: {
        include: {
          questions: { orderBy: { order: "asc" } },
          attempts: { where: { userId }, orderBy: { startedAt: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!course) notFound();

  const progress = await prisma.moduleProgress.findMany({
    where: { userId, moduleId: { in: course.modules.map((m) => m.id) } },
  });
  const progressMap = Object.fromEntries(progress.map((p) => [p.moduleId, p]));

  const activeModuleId = sp.module ?? course.modules[0]?.id;

  return (
    <ModuleReader
      course={course}
      userId={userId}
      activeModuleId={activeModuleId}
      progressMap={progressMap}
    />
  );
}
