"use client";

/**
 * InputDialog — a polished replacement for window.prompt().
 *
 * The browser-native prompt is functional but looks like 1998 — flat,
 * unstyled, unbranded, can't accept a description, can't validate.
 * This component gives the same primitive (ask for one short string,
 * with optional default, OK / Cancel) inside the platform's own
 * surface language: rounded card, brand-tinted icon disc, soft
 * gradient header, line + flat aesthetic.
 *
 * Imperative API mirrors window.prompt so call-sites read naturally:
 *
 *   const value = await inputDialog({
 *     title: "Name this snapshot",
 *     description: "Optional. Defaults to 'Manual snapshot'.",
 *     placeholder: "Before restructuring",
 *     defaultValue: "",
 *     confirmLabel: "Snapshot",
 *   });
 *   if (value === null) return; // user cancelled
 *
 * The hook variant (`useInputDialog`) returns the same async function
 * plus a portal you render once per page. For one-off use the
 * standalone `<InputDialogPortal />` mounted in app root would let
 * any client call `inputDialog(...)` — for now we keep it hook-based
 * so opt-in is explicit.
 *
 * Saved to `/admin/design-system` as the canonical replacement for
 * `window.prompt()`. New code should reach for this; only the
 * lowest-stakes "you sure?" dialogs still warrant the native confirm.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Pencil, X, CheckCircle2 } from "lucide-react";

export interface InputDialogOptions {
  /** Bold heading at the top of the dialog. Short imperative noun-
   *  phrase: "Name this snapshot", "Rename resume", "New job folder". */
  title: string;
  /** Optional one-sentence subhead under the title. Use to set
   *  expectations: "Optional. Defaults to 'Manual snapshot'." */
  description?: string;
  /** Label above the input. Title-Case. Default "Name". */
  label?: string;
  /** Placeholder inside the input. Default empty. */
  placeholder?: string;
  /** Pre-populated value when the dialog opens. Default empty. */
  defaultValue?: string;
  /** Text on the confirm button. Default "Save". */
  confirmLabel?: string;
  /** Text on the cancel button. Default "Cancel". */
  cancelLabel?: string;
  /** When true, an empty trimmed value is allowed. Default false. */
  allowEmpty?: boolean;
  /** Optional max length. Default 200. */
  maxLength?: number;
  /** Optional icon override. Defaults to Pencil. */
  icon?: React.ElementType;
}

interface OpenState extends InputDialogOptions {
  open: true;
  resolve: (value: string | null) => void;
}
interface ClosedState {
  open: false;
}
type State = OpenState | ClosedState;

/** Hook variant — call once per page; returns a function that opens
 *  the dialog and an element to render somewhere. */
export function useInputDialog() {
  const [state, setState] = useState<State>({ open: false });

  const inputDialog = useCallback((opts: InputDialogOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setState({ open: true, resolve, ...opts });
    });
  }, []);

  function close(value: string | null) {
    if (state.open) {
      state.resolve(value);
      setState({ open: false });
    }
  }

  const node = state.open ? <Dialog opts={state} onClose={close} /> : null;
  return { inputDialog, node };
}

// ── Internals ───────────────────────────────────────────────────

function Dialog({
  opts, onClose,
}: {
  opts: OpenState;
  onClose: (value: string | null) => void;
}) {
  const {
    title, description, label = "Name", placeholder = "", defaultValue = "",
    confirmLabel = "Save", cancelLabel = "Cancel", allowEmpty = false,
    maxLength = 200, icon: Icon = Pencil,
  } = opts;

  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const descriptionId = useId();

  // Autofocus + select on open so the user can type immediately.
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Close on Escape, confirm on Enter (when valid).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const trimmed = value.trim();
  const isValid = allowEmpty || trimmed.length > 0;

  function confirm() {
    if (!isValid) return;
    onClose(allowEmpty ? value : trimmed);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      aria-describedby={description ? descriptionId : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop — solid black at low opacity to dim the page but
          not the modal. Clicking dismisses without saving. */}
      <button
        type="button"
        aria-label="Cancel"
        onClick={() => onClose(null)}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      {/* Card. Centered, max-width caps so it doesn't stretch on
          big screens. Brand-tinted icon + soft gradient header strip
          give it the platform's flat + line + gradient aesthetic. */}
      <div className="relative bg-card-solid rounded-2xl border border-line shadow-2xl ring-1 ring-line/40 w-full max-w-md overflow-hidden">
        {/* Gradient header strip — same treatment used on group
            cards in the preferences switchboard. Sets the tone
            without dominating. */}
        <div className="bg-gradient-to-r from-brand-100/60 via-brand-50/40 to-transparent px-5 py-4 flex items-start gap-3 border-b border-line">
          <span className="inline-flex w-9 h-9 rounded-xl bg-brand-600 text-white items-center justify-center shrink-0">
            <Icon size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="text-base font-semibold text-fg leading-tight">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-[12px] text-fg-muted mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onClose(null)}
            aria-label="Cancel"
            className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded text-fg-muted hover:text-fg hover:bg-elevated"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-fg-subtle">
              {label}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid) {
                  e.preventDefault();
                  confirm();
                }
              }}
              placeholder={placeholder}
              maxLength={maxLength}
              className="mt-1 w-full bg-card-solid border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>

        {/* Footer — buttons right-aligned. Cancel is secondary
            (ghost), Confirm is primary (brand). */}
        <div className="px-5 py-3 border-t border-line bg-background/30 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-fg-muted hover:bg-elevated"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!isValid}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 size={12} /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
