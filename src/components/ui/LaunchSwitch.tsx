"use client";

/**
 * LaunchSwitch — military "rocket-launch cover" button.
 *
 * Inspired by the protected red switches on a jet's weapons panel.
 * Three states:
 *
 *   1. CLOSED  — striped cover sits over the button. Click to flip.
 *   2. ARMED   — cover hinges up, red "FIRE" button exposed. Click
 *                to commit; click the cover (or anywhere) to bail.
 *   3. LAUNCHING — red LED flashes, T-minus countdown ticks down
 *                  (default 5 seconds). User can hit ABORT (or the
 *                  cover) to cancel anytime during the countdown.
 *                  When the countdown hits zero, onFire() fires.
 *
 * Use this for irreversible destructive actions — hard-delete a row,
 * wipe a workspace, abandon a draft. The flip-cover + countdown
 * gesture costs the user three deliberate clicks (and grants 5
 * seconds to think) so accidental triggers are essentially
 * impossible.
 *
 * Visual language: military stencil typography, hazard stripes when
 * armed, LED-glow during launch. Sharp corners. Red metallic cover.
 * Small footprint — defaults to ~96×30 px so the switch fits in a
 * card's action row without dominating.
 *
 * Saved to the design system at /admin/design-system; reuse anywhere
 * a one-step Delete button is too cheap.
 */

import { useEffect, useRef, useState } from "react";
import { Zap, X } from "lucide-react";

type State = "closed" | "armed" | "launching";

export interface LaunchSwitchProps {
  /** Called once after the countdown completes. The caller is
   *  responsible for actually deleting / executing whatever.
   *  When ABORT is hit during countdown this never fires. */
  onFire: () => void;
  /** Optional — fires when the user starts arming the switch (open
   *  cover). Lets the host card flash a warning border, etc. */
  onArm?: () => void;
  /** Optional — fires when the user aborts before firing. */
  onAbort?: () => void;
  /** Countdown seconds. Default 5. */
  countdownSeconds?: number;
  /** Visible label on the closed cover. Default "DELETE". */
  label?: string;
  /** Footprint. "sm" (default, ~96×30) fits inline action rows;
   *  "md" (~140×44) is for emphasised destructive panels. */
  size?: "sm" | "md";
  /** Optional aria-label for screen readers. */
  ariaLabel?: string;
}

export function LaunchSwitch({
  onFire, onArm, onAbort, countdownSeconds = 5, label = "DELETE", size = "sm", ariaLabel,
}: LaunchSwitchProps) {
  const [state, setState] = useState<State>("closed");
  const [remaining, setRemaining] = useState(countdownSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset countdown whenever we leave the launching state. Means a
  // fresh arm always starts from the full countdown, not whatever
  // residue is in `remaining`.
  useEffect(() => {
    if (state !== "launching") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setRemaining(countdownSeconds);
      return;
    }
    // launching → start the tick. We use real-time (Date.now diff)
    // so the countdown stays honest even if the tab is throttled.
    const startedAt = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = countdownSeconds - elapsed;
      if (left <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRemaining(0);
        // setState to closed AFTER onFire so the visual lingers on
        // "T-0" for a frame; the host typically navigates away
        // immediately so this doesn't matter in practice.
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
    ? { w: 140, h: 44, font: 11, labelFont: 10 }
    : { w: 96,  h: 30, font: 9,  labelFont: 9  };
  const launching = state === "launching";

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? `${label} switch`}
      // Outer chassis: dark metallic frame the cover hinges off.
      className="relative inline-block select-none font-mono"
      style={{ width: dims.w, height: dims.h, perspective: "240px" }}
    >
      {/* Base — the always-visible foundation. When the cover is up
          (armed or launching), the FIRE button shows through here. */}
      <div
        className={
          "absolute inset-0 rounded-[3px] overflow-hidden " +
          (launching
            ? "bg-rose-700 ring-1 ring-rose-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.4)]"
            : "bg-zinc-900 ring-1 ring-zinc-700 shadow-[inset_0_0_4px_rgba(0,0,0,0.5)]")
        }
      >
        {/* Subtle screw "rivets" at the four corners for the metal-
            panel feel. Tiny dots, not real interactives. */}
        <Rivet style={{ top: 2,  left: 2  }} />
        <Rivet style={{ top: 2,  right: 2 }} />
        <Rivet style={{ bottom: 2, left: 2  }} />
        <Rivet style={{ bottom: 2, right: 2 }} />

        {/* ARMED — "FIRE" button visible under the cover. Clickable
            when armed; ignored when launching (the cover is still
            visually flipped up but the button has been replaced by
            the countdown). */}
        {state === "armed" && (
          <button
            type="button"
            onClick={fire}
            className="absolute inset-[3px] rounded-[2px] bg-gradient-to-b from-rose-500 to-rose-700 ring-1 ring-rose-900 text-white font-bold tracking-[0.18em] uppercase active:translate-y-[1px] active:from-rose-600 active:to-rose-800 hover:from-rose-400 hover:to-rose-600 transition-colors"
            style={{ fontSize: dims.font }}
            aria-label="Fire — initiate countdown"
          >
            <span className="inline-flex items-center justify-center gap-1">
              <Zap size={dims.font} className="-rotate-12" /> FIRE
            </span>
          </button>
        )}

        {/* LAUNCHING — flashing red LED with countdown. ABORT below. */}
        {launching && (
          <div className="absolute inset-[3px] flex items-center justify-between px-1.5 rounded-[2px] bg-gradient-to-b from-rose-600 to-rose-800 ring-1 ring-rose-900">
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-300 shadow-[0_0_4px_2px_rgba(253,224,71,0.7)] animate-[ls_pulse_0.5s_ease-in-out_infinite]"
            />
            <span
              className="font-bold tracking-[0.18em] uppercase text-white tabular-nums"
              style={{ fontSize: dims.font }}
            >
              T-{remaining}
            </span>
            <button
              type="button"
              onClick={closeCover}
              aria-label="Abort countdown"
              title="ABORT — close the cover to cancel"
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded text-white/90 hover:text-white hover:bg-white/20"
            >
              <X size={dims.font} />
            </button>
          </div>
        )}
      </div>

      {/* COVER — flips up on click. position: absolute on top of
          the base; uses transform-origin: top to hinge along its
          top edge. */}
      <button
        type="button"
        onClick={state === "closed" ? openCover : closeCover}
        aria-label={state === "closed" ? `Lift cover to ${label.toLowerCase()}` : "Close cover"}
        aria-pressed={state !== "closed"}
        className={
          "absolute inset-0 rounded-[3px] overflow-hidden ring-1 ring-amber-900/70 " +
          "transition-transform duration-300 ease-out origin-top " +
          // Closed = cover sits flat over base.
          // Open  = cover hinged ~75 deg up; we leave a sliver so it
          //         reads as "lifted, not removed" + so clicking it
          //         again closes it.
          (state === "closed"
            ? "rotate-x-0"
            : "[transform:rotateX(-78deg)] shadow-[0_8px_12px_-8px_rgba(0,0,0,0.4)]")
        }
        style={{
          // Hazard stripes — diagonal yellow/black, the universal
          // "watch out" pattern on military panels. Slightly muted
          // amber + onyx for a less garish, more refined look.
          backgroundImage:
            "repeating-linear-gradient(45deg, #f59e0b 0 6px, #18181b 6px 12px)",
          // Make sure the hidden face doesn't show through the back.
          backfaceVisibility: "hidden",
          // Click target stays at the cover's footprint while it's
          // flipped, so the user can grab it to close.
          pointerEvents: "auto",
        }}
      >
        {/* Stencilled label — only visible on the closed cover. The
            text rides on top of the hazard stripes via a darker
            inset stencil panel so it stays legible at small sizes. */}
        <span
          className={
            "absolute inset-1 inline-flex items-center justify-center rounded-sm " +
            "bg-zinc-900/85 text-amber-200 ring-1 ring-amber-700/70 font-bold uppercase " +
            "transition-opacity " +
            (state === "closed" ? "opacity-100" : "opacity-0")
          }
          style={{ fontSize: dims.labelFont, letterSpacing: "0.16em" }}
        >
          {label}
        </span>
      </button>

      {/* Keyframes for the LED pulse. Inline so the component is
          self-contained without touching globals.css. */}
      <style jsx global>{`
        @keyframes ls_pulse {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%      { transform: scale(0.6); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}

function Rivet({ style }: { style: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      className="absolute w-[3px] h-[3px] rounded-full bg-zinc-600 shadow-[inset_0_0_1px_rgba(0,0,0,0.5)]"
      style={style}
    />
  );
}
