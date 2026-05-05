"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pin, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  body: string;
  courseId: string | null;
  pinned: boolean;
  createdAt: Date;
}

interface Course { id: string; title: string }

export function AnnouncementsClient({
  announcements: initial,
  courses,
}: {
  announcements: Announcement[];
  courses: Course[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [courseId, setCourseId] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, courseId: courseId || null, pinned }),
    });
    setTitle(""); setBody(""); setCourseId(""); setPinned(false);
    setShowForm(false);
    router.refresh();
    setLoading(false);
  }

  async function togglePin(id: string, current: boolean) {
    await fetch(`/api/admin/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !current }),
    });
    router.refresh();
  }

  async function del(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Announcement
        </button>
      </div>

      <div className="space-y-3">
        {initial.map((a) => (
          <div
            key={a.id}
            className={cn(
              "bg-white rounded-xl border p-5",
              a.pinned ? "border-amber-300 bg-amber-50" : "border-gray-200"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {a.pinned && <Pin size={12} className="text-amber-500" />}
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  {a.courseId && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      {courses.find((c) => c.id === a.courseId)?.title ?? "Course"}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{a.body}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => togglePin(a.id, a.pinned)}
                  className={cn(
                    "p-1.5 rounded hover:bg-gray-100",
                    a.pinned ? "text-amber-500" : "text-gray-400"
                  )}
                  title={a.pinned ? "Unpin" : "Pin"}
                >
                  <Pin size={14} />
                </button>
                <button
                  onClick={() => del(a.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {initial.length === 0 && (
          <div className="text-center py-12 text-gray-400">No announcements yet.</div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">New Announcement</h3>
            <form onSubmit={create} className="space-y-3">
              <input
                placeholder="Title *"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Body *"
                required
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Platform-wide (no course)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="rounded"
                />
                Pin to top
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium"
                >
                  Post
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">
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
