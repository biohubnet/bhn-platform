"use client";

/**
 * PreferredNameEditor — two modes in one component.
 *
 *   mode="pencil"  — a tiny ✎ button rendered inline next to a
 *                    greeting ("Welcome back, X ✎"). Clicking it
 *                    opens an inline popover with smart name chips
 *                    + custom field + Save / Cancel.
 *
 *   mode="modal"   — the same prompt, but as a dialog over the page.
 *                    Asking someone's name is a question, and a
 *                    question is better put in front of the reader
 *                    than parked in the flow where it competes with
 *                    everything else and gets scrolled past. Same
 *                    dismissal key as the card, so skipping it is
 *                    remembered per user.
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

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Pencil, Check, X, Sparkles } from "lucide-react";
import { suggestDisplayNames, HONORIFIC_SUGGESTIONS } from "@/lib/user/display-name";

type Mode = "pencil" | "card" | "modal";

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
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const fieldRef = useRef<HTMLInputElement | null>(null);

  // Read the local-storage dismissal once on mount. Both the card and
  // the modal are dismissible, and a modal that reappears on every
  // navigation after being skipped is worse than the card ever was.
  useEffect(() => {
    if ((mode !== "card" && mode !== "modal") || !dismissKey) return;
    try {
      const v = localStorage.getItem(`bhn:pname-dismiss:${dismissKey}`);
      if (v === "1") setDismissed(true);
    } catch { /* swallow — private mode etc. */ }
  }, [mode, dismissKey]);

  // Click-outside closes the popover (pencil mode).
  useEffect(() => {
    if (mode !== "pencil" || !open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [mode, open]);

  // The panel is a fixed layer next to the pencil, not a child of the
  // hero: the hero clips its overflow, so an in-flow popover was cut off
  // and focusing the field scrolled the whole page. Measured after paint,
  // and it flips to the left / above when it would leave the viewport.
  useLayoutEffect(() => {
    if (mode !== "pencil" || !open) return;
    // Written straight onto the node rather than held in state: this runs
    // on every scroll and resize, and a setState there would re-render the
    // whole panel each frame.
    const place = () => {
      const panel = popoverRef.current;
      const b = buttonRef.current?.getBoundingClientRect();
      if (!panel || !b) return;
      const gap = 8;
      const { offsetWidth: w, offsetHeight: h } = panel;
      panel.style.left = `${Math.max(gap, Math.min(b.right + gap, window.innerWidth - w - gap))}px`;
      panel.style.top = `${b.bottom + gap + h > window.innerHeight ? Math.max(gap, b.top - h - gap) : b.bottom + gap}px`;
    };
    place();
    fieldRef.current?.focus({ preventScroll: true });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
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

  if ((mode === "card" || mode === "modal") && (initial?.trim() || dismissed)) {
    // Already set or dismissed — nothing to ask.
    return null;
  }

  // ─── Card mode ──────────────────────────────────────────────
  if (mode === "modal") {
    return (
      <Modal open onClose={dismiss} title="How should we address you?">
        <p className="text-[13px] text-muted">
          We&apos;ll use this in greetings across the platform — your records and
          certificates still use{" "}
          <span className="font-semibold text-fg">{fullName ?? "your full name"}</span>.
        </p>
        <ChipRow
          suggestions={suggestions}
          value={value}
          setValue={setValue}
          disabled={busy}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Or type your own…"
            maxLength={80}
            disabled={busy}
            className="text-[13px] px-2.5 py-1.5 rounded-md border border-line bg-card-solid text-fg focus:outline-none focus:ring-2 focus:ring-brand-400 flex-1 min-w-[10rem]"
          />
          <button
            type="button"
            onClick={() => save(value.trim() || null)}
            disabled={busy || !value.trim()}
            className="inline-flex items-center gap-1 text-[13px] px-3.5 py-1.5 rounded-md bg-brand-600 text-white font-semibold disabled:opacity-50 hover:bg-brand-700 transition-colors"
          >
            <Check size={12} /> Save
          </button>
          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            className="text-[12.5px] text-muted hover:text-fg px-2 py-1.5 rounded-md"
          >
            Skip for now
          </button>
        </div>
        {error && <p className="mt-2 text-[12px] text-rose-700">{error}</p>}
      </Modal>
    );
  }

  if (mode === "card") {
    return (
      <div className="rounded-2xl border border-line/70 bg-card-solid px-4 py-3 sm:px-5 sm:py-4 flex flex-wrap items-start gap-3 shadow-card-rest">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-700 shrink-0">
          <Sparkles size={14} />
        </div>
        <div className="flex-1 min-w-[14rem]">
          <p className="text-[13.5px] font-semibold text-fg">How should we address you?</p>
          <p className="text-[11.5px] text-muted mt-0.5">
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
              className="text-[12px] px-2 py-1 rounded-md border border-line bg-card-solid text-fg focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-[10rem]"
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
              className="text-[11.5px] text-muted hover:text-fg px-2 py-1 rounded-md"
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
        ref={buttonRef}
        type="button"
        onClick={() => { setValue(initial?.trim() ?? ""); setOpen((v) => !v); }}
        title="Change how you're addressed"
        aria-label="Edit preferred name"
        aria-expanded={open}
        className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-md text-white/70 hover:text-white hover:bg-white/15"
      >
        <Pencil size={11} />
      </button>
      {open && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="How should we address you?"
          style={{ top: -9999, left: -9999 }}
          /* Reset the type it would otherwise inherit from the hero's
             italic, letter-spaced, gradient-filled name. */
          className="fixed z-50 w-[22rem] max-w-[calc(100vw-1rem)] rounded-xl border border-line bg-card-solid p-3 font-sans not-italic normal-case tracking-normal text-fg shadow-elevated [-webkit-text-fill-color:currentColor]"
        >
          <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-muted mb-2">
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
              ref={fieldRef}
              className="flex-1 text-[12px] px-2 py-1 rounded-md border border-line bg-card-solid text-fg focus:outline-none focus:ring-2 focus:ring-brand-400"
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
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-subtle hover:text-fg hover:bg-elevated"
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
              className="mt-2 text-[11px] text-muted hover:text-fg underline disabled:opacity-50"
            >
              Reset (use my full name)
            </button>
          )}
          {error && (
            <p className="mt-2 text-[11.5px] text-rose-700">{error}</p>
          )}
        </div>,
        document.body,
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
                : "bg-brand-50 text-brand-700 font-medium hover:bg-brand-100")
            }
          >
            {honorific ? <span className="opacity-90 mr-0.5">{honorific}</span> : null}
            <span>{honorific ? s.slice(honorific.length + 1) : s}</span>
          </button>
        );
      })}
    </div>
  );
}
