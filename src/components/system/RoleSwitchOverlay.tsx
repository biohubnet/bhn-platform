"use client";

/**
 * RoleSwitchOverlay — a small centred "Trainee → Employer HR" panel
 * that surfaces while a role switch is in flight. Sits on top of
 * everything (z-[9999]) and dismisses itself once the server refresh
 * completes — but never sooner than `MIN_DISPLAY_MS` (1.5 s) so the
 * user actually has time to read what just happened.
 *
 * Without this overlay, hitting `x` to switch role looked like
 * nothing was happening: the keypress fires a fetch, then
 * `router.refresh()` re-renders every server component in the
 * dashboard chrome. The user perceived 1-2 s of dead time and often
 * double-tapped trying to "wake it up", landing on the wrong role.
 *
 * Trigger surface: any code that wants to start a role switch
 * dispatches `bhn:role-switch-start` with `{ from, to }`. Examples:
 *   • `KeyboardShortcuts` (the x / xx shortcuts)
 *   • `RoleSwitcher`     (the sidebar dropdown picks)
 *
 * Display timing:
 *   • Min display: 1500 ms — the overlay never disappears faster
 *     than this even if the server refresh returns in 300 ms. Was
 *     reported as "too short-lived" before.
 *   • Max display: 3000 ms — safety net if the done event never
 *     fires (e.g. a network error that the trigger swallowed).
 *   • When `done` fires earlier than 1.5 s, the spinner flips to a
 *     check so the user can see the switch completed — but the
 *     overlay STAYS until the 1.5 s floor is met.
 */

import { useEffect, useRef, useState } from "react";
import { Eye, Loader2, ArrowRight, Check } from "lucide-react";

export const ROLE_SWITCH_START = "bhn:role-switch-start";
export const ROLE_SWITCH_DONE  = "bhn:role-switch-done";

const MIN_DISPLAY_MS = 1500;
const MAX_DISPLAY_MS = 3000;

export interface RoleSwitchStartDetail {
  /** The role the user is leaving, e.g. "Trainee" or "Your real seat". */
  from: string;
  /** The role the user is arriving at, e.g. "Employer HR". */
  to: string;
}

/** Helper for triggers — keeps the event name + payload shape in
 *  one place. Call this just before the fetch + router.refresh()
 *  that performs the actual role switch. */
export function dispatchRoleSwitchStart(from: string, to: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<RoleSwitchStartDetail>(ROLE_SWITCH_START, {
      detail: { from, to },
    }),
  );
}

/** Helper for triggers — signals that the server refresh has
 *  returned. The overlay won't actually dismiss until the
 *  MIN_DISPLAY_MS floor has been met, so calling this earlier than
 *  1.5 s just transitions the panel from "switching…" to "done" but
 *  doesn't hide it yet. */
export function dispatchRoleSwitchDone() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ROLE_SWITCH_DONE));
}

export function RoleSwitchOverlay() {
  const [data, setData] = useState<RoleSwitchStartDetail | null>(null);
  const [phase, setPhase] = useState<"switching" | "done">("switching");
  const startedAtRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clear() {
      setData(null);
      setPhase("switching");
      startedAtRef.current = null;
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }

    function onStart(e: Event) {
      const detail = (e as CustomEvent<RoleSwitchStartDetail>).detail;
      if (!detail?.to) return;
      setData(detail);
      setPhase("switching");
      startedAtRef.current = Date.now();
      // Safety-net dismissal — protects against done never firing.
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(clear, MAX_DISPLAY_MS);
    }

    function onDone() {
      // Flip the indicator to "done" right away so the user can see
      // the switch completed, but DON'T dismiss until MIN_DISPLAY_MS
      // has elapsed since start. If `done` arrives after 1.5 s the
      // remaining wait collapses to zero and the panel dismisses
      // immediately.
      setPhase("done");
      const elapsed = startedAtRef.current
        ? Date.now() - startedAtRef.current
        : MIN_DISPLAY_MS;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(clear, remaining);
    }

    window.addEventListener(ROLE_SWITCH_START, onStart);
    window.addEventListener(ROLE_SWITCH_DONE, onDone);
    return () => {
      window.removeEventListener(ROLE_SWITCH_START, onStart);
      window.removeEventListener(ROLE_SWITCH_DONE, onDone);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!data) return null;

  const isDone = phase === "done";

  return (
    <div
      // Full-screen scrim + centred panel. Pointer-events-none on
      // the wrapper so the overlay never blocks clicks if it lingers
      // a frame too long; the inner card uses pointer-events-auto so
      // it's still selectable for a screenshot.
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label={`Switching role from ${data.from} to ${data.to}`}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
      />

      {/* Card — substantially bigger than the old compact pill so
          the transition feels like an announcement, not a passing
          toast. Brand-tinted glow + pop-in animation announce it
          confidently; the staggered "from → to" text reinforces the
          directional read. */}
      <div
        className="animate-role-switch-card-pop relative pointer-events-auto flex items-center gap-5 px-7 py-5 rounded-3xl bg-card-solid border border-line min-w-[340px] max-w-[520px]"
        style={{
          boxShadow: isDone
            ? "0 0 0 8px color-mix(in srgb, var(--color-emerald-500, #10b981) 14%, transparent), 0 24px 60px rgba(0,0,0,0.30), 0 8px 24px rgba(0,0,0,0.20)"
            : "0 0 0 8px color-mix(in srgb, var(--color-brand-500, #3b6cef) 16%, transparent), 0 24px 60px rgba(0,0,0,0.30), 0 8px 24px rgba(0,0,0,0.20)",
          transition: "box-shadow 360ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Icon — bigger square with a soft brand gradient. Switches
            to a subtle emerald wash when the switch lands. */}
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl shrink-0 text-white relative overflow-hidden"
          style={{
            background: isDone
              ? "linear-gradient(135deg, var(--color-emerald-500, #10b981), var(--color-emerald-700, #047857))"
              : "linear-gradient(135deg, var(--color-brand-500, #3b6cef), var(--color-brand-700, #2d4cb8))",
            transition: "background 360ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Done state: pop-in check. Switching state: eye icon
              that gently breathes. */}
          {isDone ? (
            <Check size={26} className="animate-role-switch-done relative z-10" strokeWidth={2.6} />
          ) : (
            <Eye size={22} className="relative z-10" />
          )}
        </span>

        {/* Text stack. From + arrow + to are each animated separately
            so the sequence reads visually as a movement from left to
            right. */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.24em] font-bold text-fg-subtle leading-none">
            {isDone ? "Role switched" : "Switching role"}
          </p>
          <div className="mt-2 flex items-center gap-2.5 flex-wrap text-base leading-tight">
            <span className="animate-role-switch-from text-fg-muted font-medium">
              {data.from}
            </span>
            <ArrowRight
              size={18}
              className="animate-role-switch-arrow text-fg-subtle shrink-0"
              strokeWidth={2.4}
            />
            <span className="animate-role-switch-to font-bold text-brand-700 text-lg">
              {data.to}
            </span>
          </div>
          {/* Status indicator on its own line so it doesn't compete
              with the from→to read. Spinner during switching, a small
              "Done." line in emerald once the refresh lands. */}
          <p className="mt-2.5 text-[11px] inline-flex items-center gap-1.5 leading-none">
            {isDone ? (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-emerald-700">Done.</span>
              </>
            ) : (
              <>
                <Loader2 size={12} className="animate-spin text-brand-600" />
                <span className="font-medium text-fg-subtle">Updating your view…</span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
