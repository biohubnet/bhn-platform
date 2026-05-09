"use client";
/**
 * Smaller variant of PostingActions used on listing-page cards. Just
 * the heart icon — no "Applied" pill (the cards don't show that to
 * keep them tidy; trainees see status on /profile/applications).
 *
 * Stops event propagation so clicking the heart inside a parent
 * <Link> doesn't navigate to the detail page.
 */
import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function PostingSaveButton({
  postingId,
  initialSaved,
}: {
  postingId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    try {
      const res = await fetch(`/api/internships/${postingId}/save`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      title={saved ? "Remove from saved" : "Save for later"}
      className={cn(
        "h-7 w-7 inline-flex items-center justify-center rounded-full border transition-colors",
        saved
          ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
          : "bg-card border-line text-muted hover:text-rose-600 hover:border-rose-200",
      )}
    >
      <Heart size={12} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
