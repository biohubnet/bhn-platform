import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin");
  const actorId = (session.user as { id?: string }).id!;
  const { id: groupId } = await params;
  const { userIds, courseIds } = await req.json();

  const results: { members?: number; enrollments?: number } = {};

  if (userIds?.length) {
    const creates = userIds.map((userId: string) =>
      prisma.groupMembership.upsert({
        where: { groupId_userId: { groupId, userId } },
        update: {},
        create: { groupId, userId },
      })
    );
    await prisma.$transaction(creates);
    results.members = userIds.length;

    // Auto-enroll members in group courses
    const groupCourses = await prisma.groupCourse.findMany({ where: { groupId } });
    for (const gc of groupCourses) {
      for (const userId of userIds) {
        await prisma.enrollment.upsert({
          where: { userId_courseId: { userId, courseId: gc.courseId } },
          update: { status: "active" },
          create: { userId, courseId: gc.courseId, status: "active" },
        });
      }
    }
  }

  if (courseIds?.length) {
    const creates = courseIds.map((courseId: string) =>
      prisma.groupCourse.upsert({
        where: { groupId_courseId: { groupId, courseId } },
        update: {},
        create: { groupId, courseId },
      })
    );
    await prisma.$transaction(creates);
    results.enrollments = courseIds.length;

    // Auto-enroll existing group members in new courses
    const members = await prisma.groupMembership.findMany({ where: { groupId } });
    for (const courseId of courseIds) {
      for (const m of members) {
        await prisma.enrollment.upsert({
          where: { userId_courseId: { userId: m.userId, courseId } },
          update: { status: "active" },
          create: { userId: m.userId, courseId, status: "active" },
        });
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "group.update",
      targetType: "group",
      targetId: groupId,
      detail: JSON.stringify({ added: results }),
    },
  });

  return NextResponse.json(results);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id: groupId } = await params;
  const { userId, courseId } = await req.json();

  if (userId) {
    await prisma.groupMembership.deleteMany({ where: { groupId, userId } });
  }
  if (courseId) {
    await prisma.groupCourse.deleteMany({ where: { groupId, courseId } });
  }

  return NextResponse.json({ ok: true });
}
