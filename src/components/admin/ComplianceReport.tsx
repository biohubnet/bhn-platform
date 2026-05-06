"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Course { id: string; title: string }
interface ReportRow {
  userId: string; name: string; email: string; status: string;
  score: number | null; progress: number;
  enrolledAt: string; completedAt: string | null; dueDate: string | null;
}
interface CourseReport {
  courseId: string; courseTitle: string;
  total: number; completed: number; inProgress: number;
  rows: ReportRow[];
}

export function ComplianceReport({ courses }: { courses: Course[] }) {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [report, setReport] = useState<CourseReport[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const url = `/api/admin/reports/compliance${selectedCourse ? `?courseId=${selectedCourse}` : ""}`;
    const res = await fetch(url);
    setReport(await res.json());
    setLoading(false);
  }

  function exportCsv() {
    const url = `/api/admin/reports/compliance?format=csv${selectedCourse ? `&courseId=${selectedCourse}` : ""}`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedCourse}
          onChange={(e) => { setSelectedCourse(e.target.value); setReport(null); }}
          className="border border-line rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All published courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Generate Report"}
        </button>
        {report && (
          <button
            onClick={exportCsv}
            className="border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg hover:bg-green-50"
          >
            Export CSV
          </button>
        )}
      </div>

      {report && report.map((cr) => (
        <div key={cr.courseId} className="bg-card rounded-xl border border-line overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-fg">{cr.courseTitle}</h2>
            <div className="flex items-center gap-4 text-sm text-muted">
              <span>{cr.total} enrolled</span>
              <span className="text-green-600 font-medium">{cr.completed} completed</span>
              <span className="text-brand-600">{cr.inProgress} in progress</span>
              <span className="text-subtle">
                {cr.total > 0 ? Math.round((cr.completed / cr.total) * 100) : 0}% completion rate
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-left text-xs text-subtle uppercase tracking-wide">
                  <th className="px-5 py-2">User</th>
                  <th className="px-5 py-2">Status</th>
                  <th className="px-5 py-2">Progress</th>
                  <th className="px-5 py-2">Score</th>
                  <th className="px-5 py-2">Enrolled</th>
                  <th className="px-5 py-2">Due</th>
                  <th className="px-5 py-2">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cr.rows.map((row) => (
                  <tr key={row.userId} className="hover:bg-elevated">
                    <td className="px-5 py-2">
                      <p className="text-fg">{row.name || "—"}</p>
                      <p className="text-xs text-subtle">{row.email}</p>
                    </td>
                    <td className="px-5 py-2">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        row.status === "completed" ? "bg-green-50 text-green-700" :
                        row.status === "active" ? "bg-brand-50 text-brand-600" :
                        "bg-raised text-muted"
                      )}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-2 text-muted text-xs">{Math.round(row.progress)}%</td>
                    <td className="px-5 py-2 text-muted text-xs">
                      {row.score != null ? `${row.score}%` : "—"}
                    </td>
                    <td className="px-5 py-2 text-subtle text-xs">
                      {new Date(row.enrolledAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-2 text-xs">
                      {row.dueDate ? (
                        <span className={cn(
                          new Date(row.dueDate) < new Date() && row.status !== "completed"
                            ? "text-red-500 font-medium"
                            : "text-subtle"
                        )}>
                          {new Date(row.dueDate).toLocaleDateString()}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-2 text-subtle text-xs">
                      {row.completedAt ? new Date(row.completedAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
