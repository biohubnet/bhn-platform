"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, AlertCircle } from "lucide-react";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Inline "Leave" button shown on /progress for admin / superadmin
 * rows. Trainees go through the regular withdrawal flow elsewhere
 * (assessment-aware, support-flagged); admins routinely enrol into
 * courses to test the player and need a one-click way to remove
 * themselves afterwards. This is that one click.
 *
 * Behaviour: a single branded ConfirmDialog keeps the action cheap
 * but on-brand — leaving is reversible (just re-enrol), so the
 * warning tone (not destructive) is the right level. DELETE
 * /api/courses/[id]/enroll marks the row `withdrawn` (status flip —
 * no row deletion, so audit history stays intact). After success we
 * router.refresh() so the page reflows. Failures surface as an
 * inline chip beneath the button.
 */
export function LeaveCourseButton({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirmDialog, node: confirmNode } = useConfirmDialog();

  async function leave() {
    if (busy) return;
    const ok = await confirmDialog({
      title: `Leave "${courseTitle}"?`,
      description: "You'll lose your spot, but you can re-enrol any time. Your progress is preserved on the audit trail.",
      confirmLabel: "Leave course",
      cancelLabel: "Stay enrolled",
      tone: "warning",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "DELETE" });
      if (!res.ok) {
        setError("Couldn't leave the course. Please try again.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
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
      {error && (
        <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-1 inline-flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
      {confirmNode}
    </div>
  );
}
