"use client";

/**
 * RoleSwitchOverlay — a small centred "Switching to <role> view…"
 * panel that surfaces while a role switch is in flight. Sits on
 * top of everything (z-[9999]) and dismisses itself once the
 * server refresh completes.
 *
 * Without this overlay, hitting `x` to switch role looked like
 * nothing was happening: the keypress fires a fetch, then
 * `router.refresh()` re-renders every server component in the
 * dashboard chrome, which can take 500-1500 ms depending on the
 * destination's queries. The user perceived 1-2 s of dead time and
 * often double-tapped trying to "wake it up", landing on the wrong
 * role.
 *
 * Trigger surface: any code that wants to start a role switch
 * dispatches `bhn:role-switch-start` with `{ label }`. Examples:
 *   • `KeyboardShortcuts` (the x / xx shortcuts)
 *   • `RoleSwitcher` (the sidebar dropdown picks)
 *
 * Dismiss: the overlay listens for `bhn:role-switch-done` (fired
 * after fetch + router.refresh()), AND it auto-dismisses after a
 * 3 s safety timeout so a stuck refresh never leaves the overlay
 * hanging.
 */

import { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";

export const ROLE_SWITCH_START = "bhn:role-switch-start";
export const ROLE_SWITCH_DONE  = "bhn:role-switch-done";

export interface RoleSwitchStartDetail {
  /** Friendly label shown in the overlay, e.g. "Trainee", "Employer HR". */
  label: string;
}

/** Helper for triggers — keeps the event name + payload shape in
 *  one place. Call this just before the fetch + router.refresh()
 *  that performs the actual role switch. */
export function dispatchRoleSwitchStart(label: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<RoleSwitchStartDetail>(ROLE_SWITCH_START, {
      detail: { label },
    }),
  );
}

/** Helper for triggers — dismisses the overlay early (before the
 *  3 s safety timeout). Call after router.refresh() returns. The
 *  overlay also auto-dismisses on prop changes that indicate the
 *  refresh landed, so this is belt-and-suspenders. */
export function dispatchRoleSwitchDone() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ROLE_SWITCH_DONE));
}

export function RoleSwitchOverlay() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    function clear() {
      setLabel(null);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
    function onStart(e: Event) {
      const detail = (e as CustomEvent<RoleSwitchStartDetail>).detail;
      if (!detail?.label) return;
      setLabel(detail.label);
      // Safety net — auto-hide after 3 s even if the done event
      // never fires (e.g. a network error swallowed in the trigger).
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(clear, 3_000);
    }
    function onDone() {
      clear();
    }
    window.addEventListener(ROLE_SWITCH_START, onStart);
    window.addEventListener(ROLE_SWITCH_DONE, onDone);
    return () => {
      window.removeEventListener(ROLE_SWITCH_START, onStart);
      window.removeEventListener(ROLE_SWITCH_DONE, onDone);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!label) return null;

  return (
    <div
      // Full-screen scrim + centred panel. Pointer-events-none on
      // the wrapper so the overlay never blocks clicks if it lingers
      // a frame too long; the inner card uses pointer-events-auto so
      // it's still selectable for a screenshot.
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
      />
      <div className="relative pointer-events-auto inline-flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-card-solid border border-line shadow-elevated-heavy">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600 text-white"
        >
          <Eye size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-fg-subtle leading-none">
            Switching role
          </p>
          <p className="text-sm font-semibold text-fg leading-tight mt-1 inline-flex items-center gap-2">
            Now viewing as <span className="text-brand-700">{label}</span>
            <Loader2 size={13} className="animate-spin text-brand-600" />
          </p>
        </div>
      </div>
    </div>
  );
}
