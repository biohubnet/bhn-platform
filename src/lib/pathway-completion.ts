import { prisma } from "@/lib/prisma";

/**
 * Check whether a user has finished every required course in a pathway.
 * If yes, mark pathway enrollment completed and issue a pathway certificate.
 * Idempotent — safe to call repeatedly.
 */
export async function checkPathwayCompletion(userId: string, pathwayId: string) {
  const enrollment = await prisma.pathwayEnrollment.findUnique({
    where: { userId_pathwayId: { userId, pathwayId } },
  });
  if (!enrollment || enrollment.status === "completed") return;

  const pathway = await prisma.pathway.findUnique({
    where: { id: pathwayId },
    include: { courses: { where: { required: true } } },
  });
  if (!pathway) return;
  if (pathway.courses.length === 0) return;

  const courseIds = pathway.courses.map((c) => c.courseId);
  const completed = await prisma.enrollment.count({
    where: {
      userId,
      courseId: { in: courseIds },
      status: "completed",
    },
  });

  if (completed < courseIds.length) return;

  // All courses complete — finalize pathway enrollment + issue certificate
  await prisma.$transaction(async (tx) => {
    await tx.pathwayEnrollment.update({
      where: { userId_pathwayId: { userId, pathwayId } },
      data: { status: "completed", completedAt: new Date() },
    });

    const existing = await tx.certificate.findUnique({
      where: { userId_pathwayId: { userId, pathwayId } },
    });
    if (!existing) {
      await tx.certificate.create({
        data: {
          userId,
          pathwayId,
          kind: "pathway",
          metadata: JSON.stringify({ pathwayTitle: pathway.title, courseCount: courseIds.length }),
        },
      });
    }
  });
}

/** Trigger after any course enrollment becomes "completed" — sweep all pathways the user is in. */
export async function onCourseCompleted(userId: string, courseId: string) {
  // Find pathways that include this course AND that the user is enrolled in.
  const memberships = await prisma.pathwayEnrollment.findMany({
    where: {
      userId,
      status: "active",
      pathway: { courses: { some: { courseId } } },
    },
    select: { pathwayId: true },
  });
  for (const m of memberships) {
    await checkPathwayCompletion(userId, m.pathwayId);
  }
}
