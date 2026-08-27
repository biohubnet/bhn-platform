import { NextResponse } from "next/server";
import { guardRole } from "@/lib/api/guard";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const _guard = await guardRole("admin");
  if (_guard instanceof NextResponse) return _guard;

  const [
    totalUsers,
    totalCourses,
    totalEnrollments,
    completedEnrollments,
    totalCertificates,
    recentEnrollments,
  ] = await Promise.all([
    prisma.user.count({ where: { accountKind: "real" } }),
    prisma.course.count({ where: { status: "published" } }),
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { status: "completed" } }),
    prisma.certificate.count(),
    prisma.enrollment.findMany({
      take: 10,
      orderBy: { enrolledAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
    }),
  ]);

  const completionRate = totalEnrollments > 0
    ? Math.round((completedEnrollments / totalEnrollments) * 100)
    : 0;

  return NextResponse.json({
    totalUsers,
    totalCourses,
    totalEnrollments,
    completedEnrollments,
    completionRate,
    totalCertificates,
    recentEnrollments,
  });
}
