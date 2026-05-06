"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface UserBasic { id: string; name: string | null; email: string }
interface CourseBasic { id: string; title: string }

export function CertificateActions({
  users,
  courses,
}: {
  users: UserBasic[];
  courses: CourseBasic[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, courseId, expiryDate: expiryDate || undefined }),
    });
    setShow(false);
    setUserId(""); setCourseId(""); setExpiryDate("");
    router.refresh();
    setLoading(false);
  }

  return (
    <div>
      <button
        onClick={() => setShow(true)}
        className="bg-purple-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-purple-700"
      >
        + Issue Certificate
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-fg mb-4">Issue Certificate</h3>
            <form onSubmit={issue} className="space-y-3">
              <select
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
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
                <label className="text-xs text-muted block mb-1">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full border border-line rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm font-medium"
                >
                  Issue
                </button>
                <button type="button" onClick={() => setShow(false)} className="flex-1 border border-line rounded-lg py-2 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
