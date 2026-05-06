"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface User { id: string; name: string | null; email: string }
interface Course { id: string; title: string }

export function EnrollmentActions({ users, courses }: { users: User[]; courses: Course[] }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvResult, setCsvResult] = useState("");

  async function enroll(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, courseId, dueDate: dueDate || undefined }),
    });
    setShow(false);
    setUserId(""); setCourseId(""); setDueDate("");
    router.refresh();
    setLoading(false);
  }

  async function importCsv(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const lines = csvText.trim().split("\n").slice(1); // skip header
    let ok = 0, fail = 0;
    for (const line of lines) {
      const [email, courseTitle, dueDateStr] = line.split(",").map((s) => s.trim());
      const user = users.find((u) => u.email === email);
      const course = courses.find((c) => c.title === courseTitle);
      if (!user || !course) { fail++; continue; }
      const res = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, courseId: course.id, dueDate: dueDateStr || undefined }),
      });
      if (res.ok) ok++; else fail++;
    }
    setCsvResult(`Done: ${ok} enrolled, ${fail} failed.`);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setShowCsv(true)}
        className="border border-line text-muted text-sm px-4 py-2 rounded-lg hover:bg-elevated"
      >
        CSV Import
      </button>
      <button
        onClick={() => setShow(true)}
        className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700"
      >
        + Enroll User
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-fg mb-4">Manual Enrollment</h3>
            <form onSubmit={enroll} className="space-y-3">
              <select
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email} ({u.email})</option>
                ))}
              </select>
              <select
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select course…</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <div>
                <label className="text-xs text-muted block mb-1">Due Date (optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-line rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium"
                >
                  Enroll
                </button>
                <button type="button" onClick={() => setShow(false)} className="flex-1 border border-line rounded-lg py-2 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCsv && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-fg mb-2">CSV Bulk Import</h3>
            <p className="text-xs text-subtle mb-3">
              Header row: <code>email,course_title,due_date</code> (due_date optional, YYYY-MM-DD)
            </p>
            <form onSubmit={importCsv} className="space-y-3">
              <textarea
                rows={8}
                placeholder={"email,course_title,due_date\njohn@example.com,My Course,2025-12-31"}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm font-mono"
              />
              {csvResult && <p className="text-sm text-green-700">{csvResult}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !csvText.trim()}
                  className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
                >
                  {loading ? "Importing…" : "Import"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCsv(false); setCsvText(""); setCsvResult(""); }}
                  className="flex-1 border border-line rounded-lg py-2 text-sm"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
