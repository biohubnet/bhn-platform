"use client";
/**
 * "Today's Reviews" dashboard card. Shows N due bookmarks; click
 * opens a modal that walks through one at a time. Each card lets
 * the trainee reveal the answer + self-grade with two buttons.
 *
 * Server-friendly: the parent server component fetches the initial
 * count + first batch and passes them down. Subsequent reviews
 * mutate via /api/adaptive/bookmarks/[id]/review.
 *
 * Hidden when there are zero due bookmarks — no point taking
 * dashboard real estate for an empty state.
 */
import { useState } from "react";
import Link from "next/link";
import { Star, Check, AlertCircle, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReviewQuestion {
  bookmarkId: string;
  question: {
    id: string;
    text: string;
    type: string;
    options: string | null; // JSON-encoded string[] when type === "multiple_choice"
    correctAnswer: string | null;
    explanation: string | null;
    topic: string | null;
    assessment: { id: string; title: string; courseId: string };
  };
}

export function TodaysReviewsCard({ initial }: { initial: ReviewQuestion[] }) {
  const [queue, setQueue] = useState<ReviewQuestion[]>(initial);
  const [open, setOpen] = useState(false);

  if (queue.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full text-left rounded-2xl border border-amber-200 bg-amber-50/60 hover:border-amber-300 p-4 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Star size={16} fill="currentColor" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {queue.length} review{queue.length === 1 ? "" : "s"} ready
            </p>
            <p className="text-xs text-amber-800/80 mt-0.5">
              Quick recall — keeps the things you bookmarked from slipping. Click to start.
            </p>
          </div>
          <ArrowRight size={14} className="text-amber-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>

      {open && queue.length > 0 && (
        <ReviewModal
          queue={queue}
          onClose={() => setOpen(false)}
          onAnswered={(remaining) => setQueue(remaining)}
        />
      )}
    </>
  );
}

function ReviewModal({
  queue, onClose, onAnswered,
}: {
  queue: ReviewQuestion[];
  onClose: () => void;
  onAnswered: (remaining: ReviewQuestion[]) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = queue[idx];

  async function grade(quality: "got_it" | "still_tricky") {
    if (!current || busy) return;
    setBusy(true);
    try {
      await fetch(`/api/adaptive/bookmarks/${current.bookmarkId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
      });
    } catch { /* best-effort; UI advances anyway */ }
    setBusy(false);
    setRevealed(false);
    if (idx + 1 >= queue.length) {
      // Done — drain queue and close.
      onAnswered([]);
      onClose();
    } else {
      onAnswered(queue.slice(idx + 1));
      setIdx(idx + 1);
    }
  }

  if (!current) return null;

  let optionList: string[] = [];
  if (current.question.type === "multiple_choice" && current.question.options) {
    try {
      const parsed = JSON.parse(current.question.options);
      if (Array.isArray(parsed)) optionList = parsed.filter((s) => typeof s === "string");
    } catch { /* leave empty */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="w-full max-w-lg bg-card border border-line rounded-2xl shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-amber-700">
              Review · {idx + 1} / {queue.length}
            </p>
            <p id="review-modal-title" className="text-sm font-semibold text-fg mt-0.5 leading-snug">
              {current.question.topic ?? current.question.assessment.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-subtle hover:text-fg hover:bg-elevated"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm text-fg leading-relaxed">{current.question.text}</p>

          {optionList.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-sm text-muted">
              {optionList.map((opt, i) => (
                <li
                  key={i}
                  className={cn(
                    "rounded-lg px-3 py-2 ring-1 ring-inset ring-line",
                    revealed && opt === current.question.correctAnswer
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-200 font-medium"
                      : "bg-elevated/40",
                  )}
                >
                  {opt}
                </li>
              ))}
            </ul>
          )}

          {revealed && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-3">
              <p className="text-xs font-semibold text-emerald-800 inline-flex items-center gap-1">
                <Check size={11} /> Answer
              </p>
              <p className="text-sm text-emerald-900 mt-0.5">
                {current.question.correctAnswer ?? "(no canonical answer set)"}
              </p>
              {current.question.explanation && (
                <p className="text-xs text-emerald-800/80 mt-1.5 leading-relaxed">
                  {current.question.explanation}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-line flex items-center justify-end gap-2">
          {!revealed ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white"
            >
              Show answer
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => grade("still_tricky")}
                disabled={busy}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100"
              >
                <AlertCircle size={11} /> Still tricky
              </button>
              <button
                type="button"
                onClick={() => grade("got_it")}
                disabled={busy}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100"
              >
                <Check size={11} /> Got it
              </button>
            </>
          )}
        </div>

        <p className="px-5 pb-3 text-[11px] text-subtle text-center">
          See all your bookmarks on{" "}
          <Link href="/profile/applications" className="underline hover:no-underline">
            your profile
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
