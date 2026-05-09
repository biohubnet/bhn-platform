"use client";
/**
 * Star-icon toggle to bookmark a question for spaced review.
 * Optimistic UI; reverts on API failure. Stops event propagation so
 * clicking inside an outer link doesn't navigate.
 */
import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function BookmarkButton({
  questionId, initialBookmarked, size = 14,
}: {
  questionId: string;
  initialBookmarked: boolean;
  size?: number;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !bookmarked;
    setBookmarked(next);
    try {
      const res = next
        ? await fetch("/api/adaptive/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionId }),
          })
        : await fetch(`/api/adaptive/bookmarks?questionId=${encodeURIComponent(questionId)}`, {
            method: "DELETE",
          });
      if (!res.ok) throw new Error("toggle failed");
    } catch {
      setBookmarked(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={bookmarked}
      title={bookmarked ? "Remove from review" : "Save for review"}
      className={cn(
        "inline-flex items-center justify-center rounded-full border transition-colors",
        "h-7 w-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60",
        bookmarked
          ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
          : "bg-card border-line text-muted hover:text-amber-600 hover:border-amber-200",
      )}
    >
      <Star size={size} fill={bookmarked ? "currentColor" : "none"} />
    </button>
  );
}
