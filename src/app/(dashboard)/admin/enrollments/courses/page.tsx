import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus, ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn, statusColor } from "@/lib/utils";

/**
 * /admin/enrollments/courses — the per-row list of course enrollments.
 *
 * This used to be the body of /admin/enrollments. It moved here when
 * /admin/enrollments was re-cast as a Courses + Pathways overview
 * dashboard. The list still supports the same data shape; the
 * "Enroll user" action now lives on its own page at
 * /admin/enrollments/new (a proper page, not a popup modal).
 */
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

export default async function AdminCourseEnrollmentsListPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const enrollments = await prisma.enrollment.findMany({
    take: 200,
    orderBy: { enrolledAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link
        href="/admin/enrollments"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> Enrollment overview
      </Link>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            Admin · Engage · Course enrollments
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
            <ClipboardList size={22} className="text-brand-600" />
            Course enrollments
            <span className="text-xs font-mono tabular-nums text-subtle">{enrollments.length}</span>
          </h1>
          <p className="text-sm text-muted mt-2 leading-snug max-w-3xl">
            Latest 200 enrollments across every published course. Per-row status,
            progress, score, due date, and completion. Use the actions above to
            create new enrollments or import in bulk.
          </p>
        </div>
        <Link
          href="/admin/enrollments/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-bold hover:bg-brand-700"
        >
          <Plus size={14} /> New enrollment
        </Link>
      </header>

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
                <th className="px-5 py-3">Due</th>
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
