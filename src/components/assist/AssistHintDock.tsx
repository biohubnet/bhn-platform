"use client";
/**
 * Chip-style hint dock. Mount-once component that polls the
 * /api/assist/hints endpoint on page navigation + on a low-
 * frequency timer, and renders the highest-confidence pending hint
 * as a single dismissible chip in the bottom-right.
 *
 * Principles (see plan):
 *   • One hint at a time. Never overlay critical actions.
 *   • Auto-dismiss after 30s of no interaction = "ignored".
 *   • Explicit dismiss (✕) = "dismissed" + soft-mute for 10 min.
 *   • CTA click = "clicked", takes the user to the help target.
 *   • Respects prefers-reduced-motion (no fade-in animation).
 *
 * Nothing renders for unconsented / un-opted-in users — the GET
 * endpoint short-circuits to `{hint: null}` for them.
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, Sparkles, ArrowRight } from "lucide-react";
import type { AssistHintPayload } from "@/lib/assist/types";

const POLL_INTERVAL_MS = 60_000;
const AUTO_IGNORE_MS = 30_000;

export function AssistHintDock() {
  const pathname = usePathname();
  const [hint, setHint] = useState<AssistHintPayload | null>(null);
  const [hidden, setHidden] = useState(false);

  async function fetchHint() {
    try {
      const res = await fetch("/api/assist/hints", { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as { hint: AssistHintPayload | null };
      if (j.hint) {
        setHint(j.hint);
        setHidden(false);
        void recordFeedback(j.hint.id, "shown");
      }
    } catch { /* */ }
  }

  async function recordFeedback(hintId: string, kind: "shown" | "clicked" | "dismissed" | "ignored") {
    try {
      await fetch("/api/assist/hints/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hintId, kind }),
        keepalive: true,
      });
    } catch { /* */ }
  }

  // Poll on mount + on every navigation + every minute.
  useEffect(() => {
    void fetchHint();
    const t = setInterval(fetchHint, POLL_INTERVAL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Auto-ignore after AUTO_IGNORE_MS if the user takes no action.
  useEffect(() => {
    if (!hint || hidden) return;
    const t = setTimeout(() => {
      void recordFeedback(hint.id, "ignored");
      setHidden(true);
    }, AUTO_IGNORE_MS);
    return () => clearTimeout(t);
  }, [hint, hidden]);

  // Surface-scoped hints: only show when the user is actually on
  // the matching surface. (Hints with no scoped surface show
  // anywhere.)
  if (!hint || hidden) return null;
  if (hint.scopedSurface && !pathname.startsWith(hint.scopedSurface)) return null;

  function dismiss() {
    if (!hint) return;
    void recordFeedback(hint.id, "dismissed");
    setHidden(true);
  }

  function clicked() {
    if (!hint) return;
    void recordFeedback(hint.id, "clicked");
    setHidden(true);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 max-w-sm rounded-2xl border border-line bg-card-solid shadow-xl shadow-slate-900/15 animate-fade-in"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
          <Sparkles size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-fg leading-tight">{hint.title}</p>
          <p className="text-xs text-muted mt-1 leading-snug">{hint.body}</p>
          {hint.ctaLabel && hint.ctaHref && (
            <Link
              href={hint.ctaHref}
              onClick={clicked}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800"
            >
              {hint.ctaLabel} <ArrowRight size={11} />
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss hint"
          className="shrink-0 w-7 h-7 rounded-lg text-muted hover:text-fg hover:bg-elevated flex items-center justify-center transition-colors"
        >
          <X size={13} />
        </button>
      </div>
      <div className="px-4 pb-3">
        <p className="text-[10px] text-subtle leading-snug">
          AutoPipette ·{" "}
          <Link href="/profile/assist-history" className="underline hover:text-fg">
            why am I seeing this?
          </Link>
        </p>
      </div>
    </div>
  );
}
