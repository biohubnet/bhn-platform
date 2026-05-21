"use client";

/**
 * ResumeCreatingOverlay — full-viewport transition shown while a new
 * resume is being created (or duplicated). The "click → blank
 * editor" jump used to feel abrupt; this gives the create flow a
 * tiny piece of theatre that maps to what's actually happening:
 *
 *   1. A blank paper sheet folds up out of the bottom of the
 *      viewport and lands centred.
 *   2. Horizontal "section lines" draw themselves across the sheet
 *      one by one (header → experience → skills → education).
 *   3. The resume's name rises under the sheet.
 *   4. The caption ticks from "Creating resume…" → "Opening editor…"
 *
 * The whole thing runs in ~1.6s, then onFinish() fires and the
 * parent navigates. All motion is pure CSS — no rAF loop, nothing
 * to clean up. Respects `prefers-reduced-motion: reduce` by
 * skipping the animation timeline and going straight to the final
 * state.
 */
import { useEffect, useRef } from "react";

export interface ResumeCreatingOverlayProps {
  /** Whether the overlay should be shown. */
  open: boolean;
  /** The name of the resume being created — surfaces under the
   *  paper sheet so the user sees the title they typed. */
  name: string;
  /** Verb shown in the caption. "Creating" for a fresh resume,
   *  "Duplicating" when cloning from an existing one. */
  verb?: "Creating" | "Duplicating";
  /** Called once the animation timeline completes. The parent
   *  should navigate to the new editor here. */
  onFinish: () => void;
}

export function ResumeCreatingOverlay({
  open, name, verb = "Creating", onFinish,
}: ResumeCreatingOverlayProps) {
  // Auto-finish after the timeline runs. The parent kicks off the
  // API call in parallel; the overlay handles the visual minimum
  // duration. ~1700ms is enough for the paper to land + section
  // lines to draw + caption to swap, without dragging on so long
  // the user feels they're waiting.
  //
  // We route onFinish through a ref so the timeout schedules ONCE
  // (on `open` transition) and always calls the latest callback at
  // fire time. If we listed onFinish in the dep array directly, the
  // parent re-rendering with new state (e.g. when pendingHref is
  // set) would clear + re-schedule the timer, doubling the wait.
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);
  useEffect(() => {
    if (!open) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => onFinishRef.current(), reduce ? 200 : 1700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${verb} resume`}
      className="rc-overlay"
    >
      <div className="rc-card">
        <div className="rc-sheet">
          {/* The "header" stripe — name + a contact line under it.
              Drawn first so it looks like the first thing typed. */}
          <span className="rc-line rc-line-head" />
          <span className="rc-line rc-line-contact" />
          {/* Three section blocks. Each block has a heading line
              and two body lines. Stagger via animation-delay. */}
          {[0, 1, 2].map((i) => (
            <div key={i} className="rc-block" style={{ animationDelay: `${0.55 + i * 0.18}s` }}>
              <span className="rc-line rc-line-heading" />
              <span className="rc-line rc-line-body" />
              <span className="rc-line rc-line-body short" />
            </div>
          ))}
        </div>

        <p className="rc-name" title={name}>{name}</p>
        <p className="rc-caption">
          <span className="rc-caption-now">{verb} resume…</span>
          <span className="rc-caption-next">Opening editor…</span>
        </p>
      </div>

      <style jsx>{`
        .rc-overlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in oklab, var(--bg) 80%, transparent);
          backdrop-filter: blur(8px) saturate(120%);
          -webkit-backdrop-filter: blur(8px) saturate(120%);
          animation: rc-fadein 220ms ease-out;
        }
        @keyframes rc-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .rc-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        /* Paper sheet — A4-ish aspect, lifts up from below the
           viewport and lands with a soft overshoot. */
        .rc-sheet {
          position: relative;
          width: 220px;
          height: 290px;
          background: var(--card-solid);
          border: 1px solid var(--line);
          border-radius: 6px;
          box-shadow:
            0 22px 32px -22px rgba(0,0,0,0.35),
            0 4px 10px -4px rgba(0,0,0,0.18),
            inset 0 1px 0 rgba(255,255,255,0.4);
          padding: 22px 22px 18px;
          overflow: hidden;
          opacity: 0;
          transform: translateY(60px) rotate(-3deg);
          animation: rc-paper-up 540ms cubic-bezier(0.22, 1.2, 0.36, 1) forwards;
        }
        @keyframes rc-paper-up {
          0%   { opacity: 0; transform: translateY(60px) rotate(-3deg); }
          70%  { opacity: 1; transform: translateY(-4px) rotate(1deg);  }
          100% { opacity: 1; transform: translateY(0)   rotate(0deg);  }
        }
        /* Lines draw themselves from left to right via a width
           transition on a flat block. */
        .rc-line {
          display: block;
          height: 6px;
          width: 0;
          border-radius: 3px;
          background: var(--brand-300);
          animation: rc-line-grow 360ms cubic-bezier(0.22, 0.9, 0.36, 1) forwards;
        }
        .rc-line.rc-line-head {
          height: 12px;
          background: var(--fg);
          width: 0;
          animation-delay: 280ms;
        }
        .rc-line.rc-line-head { --target: 60%; }
        .rc-line-contact {
          height: 4px;
          width: 0;
          background: var(--fg-subtle);
          margin-top: 8px;
          animation-delay: 380ms;
        }
        .rc-line-contact { --target: 78%; }
        .rc-block {
          margin-top: 14px;
          opacity: 0;
          animation: rc-block-in 280ms ease-out forwards;
        }
        @keyframes rc-block-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rc-line-heading {
          height: 5px;
          background: var(--brand-500);
          width: 0;
          --target: 40%;
          animation-delay: inherit;
        }
        .rc-line-body {
          height: 4px;
          width: 0;
          background: var(--fg-subtle);
          margin-top: 6px;
          --target: 96%;
        }
        .rc-line-body.short { --target: 70%; }
        @keyframes rc-line-grow {
          to { width: var(--target, 100%); }
        }
        /* Resume name under the sheet — fades + nudges up. */
        .rc-name {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: var(--fg);
          opacity: 0;
          transform: translateY(8px);
          animation: rc-text-in 320ms 540ms ease-out forwards;
          max-width: 320px;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
        }
        @keyframes rc-text-in {
          to { opacity: 1; transform: translateY(0); }
        }
        /* Caption that cross-fades from "Creating…" to "Opening…" */
        .rc-caption {
          position: relative;
          margin: 0;
          height: 16px;
          width: 200px;
          font-size: 11px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--fg-muted);
          text-align: center;
        }
        .rc-caption span {
          position: absolute;
          inset: 0;
          opacity: 0;
        }
        .rc-caption-now  { animation: rc-cap-in 280ms 640ms ease-out forwards, rc-cap-out 280ms 1240ms ease-in forwards; }
        .rc-caption-next { animation: rc-cap-in 280ms 1300ms ease-out forwards; }
        @keyframes rc-cap-in  { to { opacity: 1; } }
        @keyframes rc-cap-out { to { opacity: 0; } }

        @media (prefers-reduced-motion: reduce) {
          .rc-sheet, .rc-line, .rc-block, .rc-name, .rc-caption span {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            width: var(--target, 100%) !important;
          }
        }
      `}</style>
    </div>
  );
}
