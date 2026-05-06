import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin } from "@/lib/auth";
import { trackServer } from "@/lib/analytics";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "user";

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.status !== "published") {
    return NextResponse.json({ error: "Course not available" }, { status: 404 });
  }

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing && existing.status === "active") {
    return NextResponse.json(existing);
  }

  // Deduct credits for regular users (admins/superadmins bypass)
  if (!isAdmin(role) && course.creditCost > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
    if (!user || user.credits < course.creditCost) {
      return NextResponse.json(
        { error: `Insufficient credits. Need ${course.creditCost}, have ${user?.credits ?? 0}.` },
        { status: 402 }
      );
    }

    const newBalance = user.credits - course.creditCost;
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { credits: newBalance } }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount: -course.creditCost,
          type: "debit",
          reason: "enrollment",
          courseId,
          balanceAfter: newBalance,
        },
      }),
    ]);
  }

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: { status: "active" },
    create: { userId, courseId, status: "active" },
  });

  await trackServer({
    userId,
    role,
    name: "enroll",
    props: { courseId, courseTitle: course.title, creditCost: course.creditCost },
  });

  return NextResponse.json(enrollment, { status: 201 });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  await prisma.enrollment.updateMany({
    where: { userId, courseId },
    data: { status: "withdrawn" },
  });

  return NextResponse.json({ ok: true });
}
