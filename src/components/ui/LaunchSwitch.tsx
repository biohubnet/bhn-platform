"use client";

/**
 * LaunchSwitch — clear-cover delete switch.
 *
 * A pulsing, glowing red **DELETE** button sits at all times under
 * a transparent glass cover. The glow is visible through the
 * cover, so the affordance reads as "warning, but protected." The
 * gesture:
 *
 *   1. CLOSED  — Glass cover sits over the glowing DELETE button.
 *                The text glow pulses gently so the user knows the
 *                surface is interactive. Click the cover → it
 *                hinges up on its top edge (animated, ~450ms).
 *
 *   2. ARMED   — Cover hinged ~82°, DELETE button fully exposed +
 *                clickable. Click DELETE to commit; click the
 *                lifted cover (or its hinge area) to bail.
 *
 *   3. LAUNCHING — Button transforms into a panel showing
 *                  "DELETING IN 10" with a flashing LED, counting
 *                  down once per second. User can hit the × to
 *                  abort, or close the cover, at any point during
 *                  the countdown. When the count hits 0, onFire()
 *                  fires exactly once.
 *
 * No military jargon, no hazard stripes — the cover is glass; the
 * warning comes from the glow + the deliberate flip-then-press
 * gesture + the 10-second cooling-off window.
 *
 * Sized small by default (~92×28 in sm, ~140×42 in md). Saved to
 * the design system at /admin/design-system as the canonical
 * irreversible-destructive control.
 */

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type State = "closed" | "armed" | "launching";

export interface LaunchSwitchProps {
  /** Called once after the countdown completes. Caller does the
   *  actual delete. Never fires if the user aborts. */
  onFire: () => void;
  /** Optional — fires when the user starts arming (opens cover). */
  onArm?: () => void;
  /** Optional — fires when the user aborts before firing. */
  onAbort?: () => void;
  /** Countdown seconds. Default 10. */
  countdownSeconds?: number;
  /** Visible label on the button. Default "DELETE". */
  label?: string;
  /** Footprint. "sm" (default, ~92×28) fits inline action rows;
   *  "md" (~140×42) is for emphasised destructive panels. */
  size?: "sm" | "md";
  /** Optional aria-label for screen readers. */
  ariaLabel?: string;
  /** Verb used during the countdown — "Deleting", "Wiping",
   *  "Resetting". Default "Deleting". The button label ("DELETE")
   *  is set via the `label` prop above. */
  actionVerb?: string;
}

export function LaunchSwitch({
  onFire, onArm, onAbort, countdownSeconds = 10, label = "DELETE",
  size = "sm", ariaLabel, actionVerb = "Deleting",
}: LaunchSwitchProps) {
  const [state, setState] = useState<State>("closed");
  const [remaining, setRemaining] = useState(countdownSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset countdown when leaving the launching state. A fresh arm
  // always starts from the full countdown.
  useEffect(() => {
    if (state !== "launching") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setRemaining(countdownSeconds);
      return;
    }
    // Real-time tick — Date.now diff stays honest even if the tab
    // is throttled.
    const startedAt = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = countdownSeconds - elapsed;
      if (left <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRemaining(0);
        onFire();
        setState("closed");
        return;
      }
      setRemaining(left);
    }, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, countdownSeconds]);

  function openCover() {
    setState("armed");
    onArm?.();
  }
  function closeCover() {
    const wasArmed = state !== "closed";
    setState("closed");
    if (wasArmed) onAbort?.();
  }
  function fire() {
    setState("launching");
  }

  const dims = size === "md"
    ? { w: 140, h: 42, font: 11, labelFont: 11 }
    : { w: 92,  h: 28, font: 9,  labelFont: 9.5 };
  const launching = state === "launching";
  const coverFlipped = state !== "closed";

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? `${label} switch`}
      className="relative inline-block select-none font-mono align-middle"
      style={{ width: dims.w, height: dims.h, perspective: "260px" }}
    >
      {/* Base layer — the glowing DELETE button. Visible at all
          times (through the glass cover when closed; directly when
          armed; replaced by the countdown panel when launching). */}
      <div
        className="absolute inset-0 rounded-md overflow-hidden ring-1 ring-rose-900/60 bg-gradient-to-b from-rose-700 to-rose-900"
        style={{
          boxShadow: "inset 0 0 6px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* DELETING + countdown panel. Renders only while launching. */}
        {launching ? (
          <div className="absolute inset-0 flex items-center justify-between px-2">
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-300 shadow-[0_0_4px_2px_rgba(253,224,71,0.75)] animate-[ls_pulse_0.5s_ease-in-out_infinite] shrink-0"
            />
            <span
              className="font-bold tracking-[0.12em] uppercase text-white tabular-nums truncate"
              style={{ fontSize: dims.font }}
            >
              {actionVerb} in {remaining}
            </span>
            <button
              type="button"
              onClick={closeCover}
              aria-label="Abort countdown"
              title="Abort — close the cover to cancel"
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded text-white/95 hover:text-white hover:bg-white/20 shrink-0"
            >
              <X size={dims.font} />
            </button>
          </div>
        ) : (
          // Pulsing glowing DELETE label. Visible through the cover
          // when closed, fully exposed + clickable when armed.
          <button
            type="button"
            onClick={state === "armed" ? fire : undefined}
            // Don't intercept clicks while closed — the cover layer
            // sits on top and owns the open-gesture. tabIndex=-1 in
            // closed state keeps it out of the focus chain so the
            // user tabs onto the cover, not this.
            tabIndex={state === "armed" ? 0 : -1}
            aria-label={`${label} — start ${countdownSeconds}-second countdown`}
            className={
              "absolute inset-0 flex items-center justify-center font-bold uppercase " +
              "text-rose-100 active:translate-y-[1px] focus:outline-none " +
              (state === "armed"
                ? "cursor-pointer hover:text-white"
                : "cursor-default")
            }
            style={{
              fontSize: dims.labelFont,
              letterSpacing: "0.18em",
              // Pulsing text-glow + a subtle inset highlight. The
              // glow comes from `text-shadow` layers stacked so the
              // halo around the letters reads as neon, not a flat
              // colour shift.
              animation: "ls_glow 1.6s ease-in-out infinite",
              pointerEvents: state === "armed" ? "auto" : "none",
            }}
          >
            {label}
          </button>
        )}
      </div>

      {/* COVER — transparent glass that hinges up on click. Sits
          ABOVE the base so it captures the open-gesture click; when
          flipped up it leaves the base exposed. */}
      <button
        type="button"
        onClick={state === "closed" ? openCover : closeCover}
        aria-label={state === "closed" ? `Lift cover to ${label.toLowerCase()}` : "Close cover"}
        aria-pressed={coverFlipped}
        // Cover sits above the base. When closed it's clickable
        // (lifts on click); when flipped, it's still clickable
        // (closes the cover / aborts) but the base button is now
        // the visual focus.
        className="absolute inset-0 rounded-md overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        style={{
          // Glass — very faint frosted plastic, mostly transparent.
          background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
          // A thin rim on the edges so the cover reads as a discrete
          // object rather than vanishing entirely.
          boxShadow: coverFlipped
            ? "0 8px 14px -8px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.18)"
            : "inset 0 0 0 1px rgba(255,255,255,0.18), inset 0 1px 0 0 rgba(255,255,255,0.25)",
          // backdrop-filter blurs whatever's behind the cover (the
          // base DELETE button). 1.5px keeps the glow visible but
          // softens it slightly, giving a "you can almost touch
          // the button" feel.
          backdropFilter: coverFlipped ? "none" : "blur(1px)",
          WebkitBackdropFilter: coverFlipped ? "none" : "blur(1px)",
          backfaceVisibility: "hidden",
          transformOrigin: "top center",
          transform: coverFlipped ? "rotateX(-82deg)" : "rotateX(0deg)",
          transition: coverFlipped
            ? "transform 320ms ease-out, box-shadow 320ms ease-out, backdrop-filter 200ms ease-out"
            : "transform 450ms cubic-bezier(0.34, 1.42, 0.64, 1), box-shadow 450ms ease-out, backdrop-filter 200ms ease-out 200ms",
        }}
      >
        {/* A faint top-edge "hinge" highlight when closed so the
            user can tell which edge the cover lifts from. */}
        <span
          aria-hidden
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-md"
          style={{
            background: "linear-gradient(to bottom, rgba(255,255,255,0.45), transparent)",
            opacity: coverFlipped ? 0 : 1,
            transition: "opacity 200ms ease-out",
          }}
        />
      </button>

      {/* Keyframes — kept inline so the component is self-contained
          and you can drop a LaunchSwitch anywhere without touching
          globals.css. */}
      <style jsx global>{`
        @keyframes ls_pulse {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%      { transform: scale(0.6); opacity: 0.35; }
        }
        @keyframes ls_glow {
          0%, 100% {
            text-shadow:
              0 0 3px rgba(255, 100, 100, 0.55),
              0 0 6px rgba(255, 60, 60, 0.45);
            color: rgb(255, 220, 220);
          }
          50% {
            text-shadow:
              0 0 5px rgba(255, 120, 120, 0.95),
              0 0 12px rgba(255, 60, 60, 0.85),
              0 0 22px rgba(255, 30, 30, 0.55);
            color: rgb(255, 240, 240);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-no-anim, [class*="ls_glow"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
