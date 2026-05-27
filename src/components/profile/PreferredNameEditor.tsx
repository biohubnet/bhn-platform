"use client";

/**
 * PreferredNameEditor — two modes in one component.
 *
 *   mode="pencil"  — a tiny ✎ button rendered inline next to a
 *                    greeting ("Welcome back, X ✎"). Clicking it
 *                    opens an inline popover with smart name chips
 *                    + custom field + Save / Cancel.
 *
 *   mode="card"    — a small dismissible card shown at the top of
 *                    the dashboard for users who haven't set a
 *                    preferred name yet ("How should we address
 *                    you? [First] [First Last] [Dr. Last] [Skip]").
 *                    Same chips & custom field, just laid out as a
 *                    card instead of a popover.
 *
 * Both modes hit the same PATCH /api/profile/preferred-name. On
 * success they call `router.refresh()` so the greeting on the
 * current page picks up the new value immediately.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Sparkles } from "lucide-react";
import { suggestDisplayNames, HONORIFIC_SUGGESTIONS } from "@/lib/user/display-name";

type Mode = "pencil" | "card";

interface Props {
  mode: Mode;
  /** The user's full / legal name. Used to generate the chip suggestions. */
  fullName: string | null;
  /** Current preferred name (null if never set). */
  initial: string | null;
  /** Optional persisted-dismissal key for the card mode. When set,
   *  the user can dismiss the card and we remember that locally so
   *  it doesn't reappear on every navigation. Pass the user's id. */
  dismissKey?: string;
}

export function PreferredNameEditor({ mode, fullName, initial, dismissKey }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial?.trim() ?? "");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Read the local-storage dismissal once on mount (card mode only).
  useEffect(() => {
    if (mode !== "card" || !dismissKey) return;
    try {
      const v = localStorage.getItem(`bhn:pname-dismiss:${dismissKey}`);
      if (v === "1") setDismissed(true);
    } catch { /* swallow — private mode etc. */ }
  }, [mode, dismissKey]);

  // Click-outside closes the popover (pencil mode).
  useEffect(() => {
    if (mode !== "pencil" || !open) return;
    function onDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [mode, open]);

  const suggestions = suggestDisplayNames(fullName);

  function save(next: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/profile/preferred-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredName: next }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Couldn't save. Try again.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function dismiss() {
    if (dismissKey) {
      try { localStorage.setItem(`bhn:pname-dismiss:${dismissKey}`, "1"); } catch {}
    }
    setDismissed(true);
  }

  if (mode === "card" && (initial?.trim() || dismissed)) {
    // Already set or dismissed — card mode renders nothing.
    return null;
  }

  // ─── Card mode ──────────────────────────────────────────────
  if (mode === "card") {
    return (
      <div className="rounded-2xl border border-line/70 bg-card-solid px-4 py-3 sm:px-5 sm:py-4 flex flex-wrap items-start gap-3 shadow-card-rest">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-700 shrink-0">
          <Sparkles size={14} />
        </div>
        <div className="flex-1 min-w-[14rem]">
          <p className="text-[13.5px] font-semibold text-fg">How should we address you?</p>
          <p className="text-[11.5px] text-fg-muted mt-0.5">
            We&apos;ll use this in greetings across the platform — your records and certificates still use <span className="font-semibold">{fullName ?? "your full name"}</span>.
          </p>
          <ChipRow
            suggestions={suggestions}
            value={value}
            setValue={setValue}
            disabled={busy}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Or type your own…"
              maxLength={80}
              disabled={busy}
              className="text-[12px] px-2 py-1 rounded-md border border-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-[10rem]"
            />
            <button
              type="button"
              onClick={() => save(value.trim() || null)}
              disabled={busy || !value.trim()}
              className="inline-flex items-center gap-1 text-[12px] px-3 py-1 rounded-md bg-brand-600 text-white font-semibold disabled:opacity-50 hover:bg-brand-700 transition-colors"
            >
              <Check size={11} /> Save
            </button>
            <button
              type="button"
              onClick={dismiss}
              disabled={busy}
              className="text-[11.5px] text-fg-muted hover:text-fg px-2 py-1 rounded-md"
            >
              Skip for now
            </button>
          </div>
          {error && (
            <p className="mt-2 text-[11.5px] text-rose-700">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // ─── Pencil mode ─────────────────────────────────────────────
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => { setValue(initial?.trim() ?? ""); setOpen((v) => !v); }}
        title="Change how you're addressed"
        aria-label="Edit preferred name"
        className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-md text-fg-subtle hover:text-fg hover:bg-elevated"
      >
        <Pencil size={11} />
      </button>
      {open && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 mt-1 z-30 w-[22rem] rounded-xl border border-line bg-card-solid shadow-elevated p-3 popover"
        >
          <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-2">
            How should we address you?
          </p>
          <ChipRow
            suggestions={suggestions}
            value={value}
            setValue={setValue}
            disabled={busy}
          />
          <div className="mt-2 flex items-center gap-1.5">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Or type your own…"
              maxLength={80}
              disabled={busy}
              autoFocus
              className="flex-1 text-[12px] px-2 py-1 rounded-md border border-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button
              type="button"
              onClick={() => save(value.trim() || null)}
              disabled={busy || !value.trim()}
              className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-md bg-brand-600 text-white font-semibold disabled:opacity-50 hover:bg-brand-700"
            >
              <Check size={11} /> Save
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-fg-subtle hover:text-fg hover:bg-elevated"
              aria-label="Cancel"
            >
              <X size={12} />
            </button>
          </div>
          {initial && (
            <button
              type="button"
              onClick={() => save(null)}
              disabled={busy}
              className="mt-2 text-[11px] text-fg-subtle hover:text-fg underline disabled:opacity-50"
            >
              Reset (use my full name)
            </button>
          )}
          {error && (
            <p className="mt-2 text-[11.5px] text-rose-700">{error}</p>
          )}
        </div>
      )}
    </span>
  );
}

function ChipRow({
  suggestions, value, setValue, disabled,
}: {
  suggestions: string[];
  value: string;
  setValue: (s: string) => void;
  disabled: boolean;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {suggestions.map((s) => {
        const honorific = HONORIFIC_SUGGESTIONS.find((h) => s.startsWith(h + " "));
        const isPicked = value.trim() === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => setValue(s)}
            disabled={disabled}
            className={
              "text-[11.5px] px-2 py-1 rounded-md transition-colors disabled:opacity-50 " +
              (isPicked
                ? "bg-brand-600 text-white font-semibold"
                : "bg-elevated text-fg-muted hover:text-fg hover:bg-raised")
            }
          >
            {honorific ? <span className="opacity-70 mr-0.5">{honorific}</span> : null}
            <span>{honorific ? s.slice(honorific.length + 1) : s}</span>
          </button>
        );
      })}
    </div>
  );
}
