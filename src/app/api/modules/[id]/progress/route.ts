import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCourseContent } from "@/lib/courses/enrollment-status";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: moduleId } = await params;
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const { status } = await req.json();

  // The module belongs to a course; recording progress against it
  // requires an active enrolment in that course.
  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { courseId: true },
  });
  if (!mod) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const enrolForAuth = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: mod.courseId } },
    select: { status: true },
  });
  if (!canAccessCourseContent(enrolForAuth?.status)) {
    return NextResponse.json(
      { error: "Your enrolment in this course is not active.", code: "enrollment_not_active" },
      { status: 403 },
    );
  }

  const progress = await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    update: {
      status,
      completedAt: status === "completed" ? new Date() : undefined,
    },
    create: {
      userId,
      moduleId,
      status,
      completedAt: status === "completed" ? new Date() : null,
    },
  });

  return NextResponse.json(progress);
}
