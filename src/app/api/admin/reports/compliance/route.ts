import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  await requireRole("admin");
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const format = searchParams.get("format");

  const courses = courseId
    ? await prisma.course.findMany({ where: { id: courseId } })
    : await prisma.course.findMany({ where: { status: "published" } });

  const report = await Promise.all(
    courses.map(async (course) => {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: course.id },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return {
        courseId: course.id,
        courseTitle: course.title,
        total: enrollments.length,
        completed: enrollments.filter((e) => e.status === "completed").length,
        inProgress: enrollments.filter((e) => e.status === "active").length,
        rows: enrollments.map((e) => ({
          userId: e.userId,
          name: e.user.name ?? "",
          email: e.user.email,
          status: e.status,
          score: e.score,
          progress: e.progress,
          enrolledAt: e.enrolledAt,
          completedAt: e.completedAt,
          dueDate: e.dueDate,
        })),
      };
    })
  );

  if (format === "csv") {
    const lines = ["Course,User,Email,Status,Score,Progress,Enrolled,Completed,Due Date"];
    for (const c of report) {
      for (const row of c.rows) {
        lines.push(
          [
            `"${c.courseTitle}"`,
            `"${row.name}"`,
            row.email,
            row.status,
            row.score ?? "",
            row.progress,
            new Date(row.enrolledAt).toISOString().split("T")[0],
            row.completedAt ? new Date(row.completedAt).toISOString().split("T")[0] : "",
            row.dueDate ? new Date(row.dueDate).toISOString().split("T")[0] : "",
          ].join(",")
        );
      }
    }
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="compliance-report.csv"`,
      },
    });
  }

  return NextResponse.json(report);
}
