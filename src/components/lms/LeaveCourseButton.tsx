"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

/**
 * Inline "Leave" button shown on /my-courses for admin / superadmin
 * rows. Trainees go through the regular withdrawal flow elsewhere
 * (assessment-aware, support-flagged); admins routinely enrol into
 * courses to test the player and need a one-click way to remove
 * themselves afterwards. This is that one click.
 *
 * Behaviour: a single native confirm() keeps it lightweight (no modal
 * library, no toast plumbing) — the action is destructive but cheap
 * to undo (just re-enrol), so a heavyweight confirmation would feel
 * disproportionate. DELETE /api/courses/[id]/enroll marks the row
 * `withdrawn` (status flip — no row deletion, so audit history stays
 * intact). After success we router.refresh() so the page reflows.
 */
export function LeaveCourseButton({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function leave() {
    if (busy) return;
    if (!window.confirm(`Leave "${courseTitle}"? You can re-enrol any time.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "DELETE" });
      if (!res.ok) {
        window.alert("Couldn't leave the course. Please try again.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={leave}
      disabled={busy}
      title="Admin fast-leave — withdraws you from this course"
      className="admin-glow inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 hover:ring-rose-300 disabled:opacity-50 transition-colors"
    >
      <LogOut size={11} />
      {busy ? "Leaving…" : "Leave"}
    </button>
  );
}
