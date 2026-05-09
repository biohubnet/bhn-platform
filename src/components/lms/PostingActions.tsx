"use client";
/**
 * Header-row actions on a posting detail page: save / unsave + a
 * read-only "Applied" pill when the trainee has already marked this
 * posting as applied.
 *
 * The save toggle is optimistic — flips the icon immediately, then
 * reconciles with the server. On API failure we revert and surface
 * a tiny inline error.
 */
import { useState } from "react";
import { Heart, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PostingActions({
  postingId,
  initialSaved,
  initialApplied,
}: {
  postingId: string;
  initialSaved: boolean;
  initialApplied: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function toggleSave() {
    setBusy(true);
    setErr(null);
    const next = !saved;
    setSaved(next); // optimistic
    try {
      const res = await fetch(`/api/internships/${postingId}/save`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setSaved(!next); // revert
      setErr("Couldn't save — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {initialApplied && (
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 inline-flex items-center gap-1"
          title="You marked this posting as applied"
        >
          <CheckCircle2 size={11} /> Applied
        </span>
      )}
      <button
        type="button"
        onClick={toggleSave}
        disabled={busy}
        aria-pressed={saved}
        title={saved ? "Remove from saved" : "Save for later"}
        className={cn(
          "h-8 w-8 inline-flex items-center justify-center rounded-full border transition-colors",
          saved
            ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
            : "bg-card border-line text-muted hover:text-rose-600 hover:border-rose-200",
        )}
      >
        <Heart size={14} fill={saved ? "currentColor" : "none"} />
      </button>
      {err && <span className="text-xs text-rose-600">{err}</span>}
    </div>
  );
}
