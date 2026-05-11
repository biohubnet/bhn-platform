"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreakoutSession {
  id: string;
  title: string;
  description: string | null;
  room: string | null;
  speakerNames: string[];
}

interface Props {
  slug: string;
  groupId: string;
  /** All concurrent sessions sharing this breakoutGroupId — the user
   *  picks one. */
  sessions: BreakoutSession[];
  /** The user's current pick within this group, if any. */
  pickedId: string | null;
}

/**
 * Pick-one breakout selector. Tappable cards for each session in
 * a breakoutGroupId; picking one swaps any previous pick atomically
 * (the API handles that — we just send POST with the new sessionId).
 *
 * Optimistic UI; reverts on API failure. Picking the already-picked
 * session is a no-op (idempotent on the server).
 */
export function BreakoutPicker({ slug, groupId, sessions, pickedId }: Props) {
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(pickedId);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(sessionId: string) {
    if (picked === sessionId) return; // already picked
    setBusy(sessionId);
    setError(null);
    const prev = picked;
    setPicked(sessionId); // optimistic
    try {
      const res = await fetch(`/api/events/${slug}/agenda/${sessionId}`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Pick failed");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPicked(prev);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div data-breakout-group={groupId}>
      {error && (
        <div className="mb-3 inline-flex items-start gap-2 text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2">
          <AlertCircle size={11} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sessions.map((s) => {
          const isPicked = picked === s.id;
          const isBusy = busy === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s.id)}
              disabled={busy !== null}
              aria-pressed={isPicked}
              className={cn(
                "text-left rounded-xl p-4 transition-all border-2 disabled:opacity-60",
                isPicked
                  ? "border-brand-500 bg-brand-50 ring-1 ring-brand-300"
                  : "border-line bg-card hover:bg-elevated hover:border-brand-300",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className={cn("text-sm font-bold tracking-tight leading-tight", isPicked ? "text-brand-800" : "text-fg")}>
                  {s.title}
                </p>
                {isBusy ? (
                  <Loader2 size={14} className="animate-spin text-brand-600 shrink-0 mt-0.5" />
                ) : isPicked ? (
                  <CheckCircle2 size={14} className="text-brand-600 shrink-0 mt-0.5" />
                ) : null}
              </div>
              {s.description && (
                <p className={cn("text-xs leading-snug", isPicked ? "text-brand-700/80" : "text-muted")}>
                  {s.description}
                </p>
              )}
              {s.room && (
                <p className="text-[11px] font-mono text-subtle mt-2">{s.room}</p>
              )}
              {s.speakerNames.length > 0 && (
                <p className="text-[11px] text-muted mt-2">
                  with {s.speakerNames.join(" · ")}
                </p>
              )}
              <div className="mt-3">
                <span
                  className={cn(
                    "inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset",
                    isPicked
                      ? "bg-brand-100 text-brand-800 ring-brand-300"
                      : "bg-elevated text-subtle ring-line",
                  )}
                >
                  {isPicked ? "Picked ✓" : "Tap to pick"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
