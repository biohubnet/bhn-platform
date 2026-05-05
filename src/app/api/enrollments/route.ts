import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id!;
  const userRole = (session.user as { role?: string }).role;
  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");
  const courseId = searchParams.get("courseId");

  const filterUserId =
    (userRole === "admin" || userRole === "instructor") && targetUserId
      ? targetUserId
      : userId;

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: filterUserId,
      ...(courseId ? { courseId } : {}),
    },
    include: {
      course: {
        include: {
          scormPackage: { select: { id: true, version: true } },
          _count: { select: { modules: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  return NextResponse.json(enrollments);
}
