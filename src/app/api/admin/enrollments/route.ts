import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  await requireRole("admin");
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const userId = searchParams.get("userId");

  const enrollments = await prisma.enrollment.findMany({
    where: {
      ...(courseId ? { courseId } : {}),
      ...(userId ? { userId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
    orderBy: { enrolledAt: "desc" },
    take: 500,
  });

  return NextResponse.json(enrollments);
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin");
  const actorId = (session.user as { id?: string }).id!;
  const { userId, courseId, dueDate } = await req.json();

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: { status: "active", ...(dueDate ? { dueDate: new Date(dueDate) } : {}) },
    create: {
      userId,
      courseId,
      status: "active",
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
    },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "enrollment.create",
      targetType: "enrollment",
      targetId: enrollment.id,
      detail: JSON.stringify({ userId, courseId }),
    },
  });

  return NextResponse.json(enrollment, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await requireRole("admin");
  const actorId = (session.user as { id?: string }).id!;
  const { userId, courseId } = await req.json();

  await prisma.enrollment.updateMany({
    where: { userId, courseId },
    data: { status: "withdrawn" },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "enrollment.delete",
      targetType: "enrollment",
      detail: JSON.stringify({ userId, courseId }),
    },
  });

  return NextResponse.json({ ok: true });
}
