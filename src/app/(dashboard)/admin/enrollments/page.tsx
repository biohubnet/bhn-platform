import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cn, statusColor } from "@/lib/utils";
import { EnrollmentActions } from "@/components/admin/EnrollmentActions";

interface EnrollmentRow {
  id: string;
  status: string;
  progress: number;
  score: number | null;
  enrolledAt: Date;
  completedAt: Date | null;
  dueDate: Date | null;
  user: { id: string; name: string | null; email: string };
  course: { id: string; title: string };
}

export default async function AdminEnrollmentsPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const [enrollments, users, courses] = await Promise.all([
    prisma.enrollment.findMany({
      take: 200,
      orderBy: { enrolledAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      select: { id: true, title: true },
      where: { status: "published" },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Enrollment Management</h1>
          <p className="text-muted text-sm mt-1">{enrollments.length} recent enrollments shown</p>
        </div>
        <EnrollmentActions users={users} courses={courses} />
      </div>

      <div className="bg-card rounded-xl border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Progress</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Enrolled</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(enrollments as EnrollmentRow[]).map((e: EnrollmentRow) => (
                <tr key={e.id} className="hover:bg-elevated">
                  <td className="px-5 py-3">
                    <p className="font-medium text-fg">{e.user.name ?? "—"}</p>
                    <p className="text-xs text-subtle">{e.user.email}</p>
                  </td>
                  <td className="px-5 py-3 text-muted">{e.course.title}</td>
                  <td className="px-5 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", statusColor(e.status))}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-raised rounded-full h-1.5 w-16">
                        <div
                          className="bg-brand-500 h-1.5 rounded-full"
                          style={{ width: `${e.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted">{Math.round(e.progress)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted text-xs">
                    {e.score != null ? `${e.score}%` : "—"}
                  </td>
                  <td className="px-5 py-3 text-subtle text-xs">
                    {new Date(e.enrolledAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {e.dueDate ? (
                      <span className={cn(
                        "px-2 py-0.5 rounded-full",
                        new Date(e.dueDate) < new Date() && e.status !== "completed"
                          ? "bg-red-50 text-red-600"
                          : "text-subtle"
                      )}>
                        {new Date(e.dueDate).toLocaleDateString()}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3 text-subtle text-xs">
                    {e.completedAt ? new Date(e.completedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
