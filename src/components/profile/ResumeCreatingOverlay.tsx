"use client";

/**
 * ResumeCreatingOverlay — quick zoom-to-window transition shown
 * between the input dialog and the editor.
 *
 * Earlier iteration tried a paper-folds-up timeline with section
 * lines drawing themselves — pretty, but slow (1.7s) and the
 * pacing felt like a screen-saver. Replaced with a snappy zoom:
 * a tiny card appears at near-zero scale, expands into a window-
 * shaped panel with a faux title bar + the resume name, then the
 * parent navigates. Total ~650ms.
 *
 * The "window" framing matches what the user is about to see —
 * they're zooming INTO the editor that's about to open. Title bar
 * mimics a macOS-style chrome (three dots) so the visual reads as
 * "a new window is opening", not as "decoration".
 *
 * All motion is CSS via styled-jsx. Honours
 * `prefers-reduced-motion: reduce` by skipping the timeline.
 */
import { useEffect, useRef } from "react";

export interface ResumeCreatingOverlayProps {
  /** Whether the overlay should be shown. */
  open: boolean;
  /** The name of the resume being created — printed in the
   *  window's title bar so the user sees the title they typed. */
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
  // Route onFinish through a ref so the timeout schedules ONCE
  // and always calls the latest closure (the parent may re-render
  // mid-animation when the API resolves; we don't want to clear +
  // re-schedule the timer in that case).
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);
  useEffect(() => {
    if (!open) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // 650ms total: ~80ms backdrop fade, ~420ms zoom, ~150ms hold
    // so the user can register the window title, then navigate.
    const t = setTimeout(() => onFinishRef.current(), reduce ? 200 : 650);
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
      <div className="rc-window">
        {/* Title bar — three dots on the left so it reads as a
            window opening (rather than a generic modal). Title in
            the centre shows the resume name + verb. */}
        <div className="rc-titlebar">
          <span className="rc-dot" style={{ background: "#ff5f57" }} />
          <span className="rc-dot" style={{ background: "#febc2e" }} />
          <span className="rc-dot" style={{ background: "#28c840" }} />
          <span className="rc-title" title={name}>
            {verb} · <strong>{name}</strong>
          </span>
        </div>
        {/* Window body — kept deliberately minimal. A single line
            of fake content + a thin progress bar that sweeps once
            during the zoom. Plenty of empty space so the focus
            stays on the zoom itself, not the contents. */}
        <div className="rc-body">
          <div className="rc-progress" />
        </div>
      </div>

      <style jsx>{`
        .rc-overlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in oklab, var(--bg) 60%, transparent);
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
          animation: rc-backdrop-in 120ms ease-out;
        }
        @keyframes rc-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        /* The "window". Starts as a tiny pinprick (scale 0.06)
           and zooms out to ~70vw × ~55vh, like opening a new
           browser tab into existence. Cubic-bezier with a slight
           overshoot at the end so it lands with weight. */
        .rc-window {
          width: min(70vw, 720px);
          height: min(55vh, 480px);
          background: var(--card-solid);
          border: 1px solid var(--line);
          border-radius: 12px;
          box-shadow:
            0 32px 64px -24px rgba(0, 0, 0, 0.45),
            0 8px 16px -6px rgba(0, 0, 0, 0.20),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
          opacity: 0;
          transform: scale(0.06);
          transform-origin: center;
          animation: rc-window-zoom 420ms cubic-bezier(0.20, 1.05, 0.30, 1.0) forwards;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        @keyframes rc-window-zoom {
          0%   { opacity: 0;   transform: scale(0.06); filter: blur(8px); }
          35%  { opacity: 0.7;                       filter: blur(2px); }
          75%  { opacity: 1;   transform: scale(1.03); filter: blur(0);   }
          100% { opacity: 1;   transform: scale(1.00); filter: blur(0);   }
        }
        .rc-titlebar {
          flex-shrink: 0;
          height: 38px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 14px;
          border-bottom: 1px solid var(--line);
          background: linear-gradient(180deg, color-mix(in oklab, var(--elevated) 80%, transparent), var(--card-solid));
        }
        .rc-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.10);
          flex-shrink: 0;
        }
        .rc-title {
          margin-left: 8px;
          font-size: 12px;
          color: var(--fg-muted);
          flex: 1;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-right: 36px; /* balance the 3 dots on the left */
        }
        .rc-title strong { color: var(--fg); font-weight: 700; }
        .rc-body {
          flex: 1;
          display: flex;
          align-items: flex-end;
          padding: 18px;
        }
        /* Single thin progress bar at the bottom of the window
           body — animates left → right over the same window timeline
           so the zoom-in feels like the editor is loading. */
        .rc-progress {
          height: 2px;
          width: 0;
          background: var(--brand-500);
          border-radius: 2px;
          box-shadow: 0 0 8px var(--brand-300);
          animation: rc-progress-grow 420ms 160ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes rc-progress-grow {
          from { width: 0; }
          to   { width: 100%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .rc-overlay, .rc-window, .rc-progress {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
            width: auto;
          }
          .rc-progress { width: 100%; }
        }
      `}</style>
    </div>
  );
}
