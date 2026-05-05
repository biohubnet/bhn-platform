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
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All published courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
        <div key={cr.courseId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-gray-900">{cr.courseTitle}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{cr.total} enrolled</span>
              <span className="text-green-600 font-medium">{cr.completed} completed</span>
              <span className="text-blue-600">{cr.inProgress} in progress</span>
              <span className="text-gray-400">
                {cr.total > 0 ? Math.round((cr.completed / cr.total) * 100) : 0}% completion rate
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-left text-xs text-gray-400 uppercase tracking-wide">
                  <th className="px-5 py-2">User</th>
                  <th className="px-5 py-2">Status</th>
                  <th className="px-5 py-2">Progress</th>
                  <th className="px-5 py-2">Score</th>
                  <th className="px-5 py-2">Enrolled</th>
                  <th className="px-5 py-2">Due</th>
                  <th className="px-5 py-2">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cr.rows.map((row) => (
                  <tr key={row.userId} className="hover:bg-gray-50">
                    <td className="px-5 py-2">
                      <p className="text-gray-900">{row.name || "—"}</p>
                      <p className="text-xs text-gray-400">{row.email}</p>
                    </td>
                    <td className="px-5 py-2">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        row.status === "completed" ? "bg-green-50 text-green-700" :
                        row.status === "active" ? "bg-blue-50 text-blue-600" :
                        "bg-gray-100 text-gray-500"
                      )}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-2 text-gray-500 text-xs">{Math.round(row.progress)}%</td>
                    <td className="px-5 py-2 text-gray-500 text-xs">
                      {row.score != null ? `${row.score}%` : "—"}
                    </td>
                    <td className="px-5 py-2 text-gray-400 text-xs">
                      {new Date(row.enrolledAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-2 text-xs">
                      {row.dueDate ? (
                        <span className={cn(
                          new Date(row.dueDate) < new Date() && row.status !== "completed"
                            ? "text-red-500 font-medium"
                            : "text-gray-400"
                        )}>
                          {new Date(row.dueDate).toLocaleDateString()}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-2 text-gray-400 text-xs">
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
