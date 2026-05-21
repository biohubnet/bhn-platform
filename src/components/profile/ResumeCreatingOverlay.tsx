"use client";

/**
 * ResumeCreatingOverlay — paper-sliding-up-from-a-drawer transition,
 * shown between the input dialog and the editor.
 *
 * Visual: a dark "DRAFTS" label sits across the bottom of the
 * viewport. A fresh sheet lifts up from behind the label, drifts
 * slightly past the resting position, and settles centred — like
 * pulling a file out of a drawer slot. The resume's name fades in
 * above the sheet. ~620ms total before the parent navigates.
 *
 * Earlier iterations tried a paper-folds-up timeline (too slow), a
 * zoom-to-window (didn't read as "create"), and a 3D origami unfold
 * (didn't land visually). The drawer-pull is the chosen primary
 * because it reads as "pulled from the system" without depending on
 * 3D motion to communicate its meaning.
 *
 * All motion is CSS via styled-jsx. Honours
 * `prefers-reduced-motion: reduce` by skipping the timeline.
 */
import { useEffect, useRef } from "react";

export interface ResumeCreatingOverlayProps {
  /** Whether the overlay should be shown. */
  open: boolean;
  /** The name of the resume being created — printed above the
   *  sheet so the user sees the title they typed. */
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
    // 720ms total: ~80ms backdrop fade-in, ~620ms drawer-pull,
    // ~20ms safety margin before navigate.
    const t = setTimeout(() => onFinishRef.current(), reduce ? 200 : 720);
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
      <div className="rc-stage">
        <p className="rc-caption">
          <span className="rc-verb">{verb} resume</span>
          <span className="rc-name" title={name}>{name}</span>
        </p>
        <div className="rc-stage-inner">
          {/* The sheet — paper rectangle with stylised printed rows.
              Animates up from behind the drawer label, lands at
              the centre of the stage with a soft overshoot. */}
          <div className="rc-sheet" aria-hidden>
            <span className="rc-row rc-row-head" />
            <span className="rc-row rc-row-contact" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="rc-block">
                <span className="rc-row rc-row-heading" />
                <span className="rc-row rc-row-body" />
                <span className="rc-row rc-row-body rc-row-body-short" />
              </div>
            ))}
          </div>
          {/* The drawer label across the bottom — the visual cue
              that the sheet came from "somewhere in the system". */}
          <div className="rc-drawer" aria-hidden>
            <span>Drafts</span>
          </div>
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
        .rc-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .rc-caption {
          margin: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          opacity: 0;
          animation: rc-caption-in 320ms 220ms ease-out forwards;
        }
        @keyframes rc-caption-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rc-verb {
          font: 700 11px/1 ui-monospace, "SF Mono", Menlo, monospace;
          color: var(--fg-muted);
          letter-spacing: 0.20em;
          text-transform: uppercase;
        }
        .rc-name {
          font-size: 18px;
          font-weight: 700;
          color: var(--fg);
          max-width: 360px;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
        }
        /* The stage that contains the drawer + the rising sheet.
           Padding at the bottom leaves room for the drawer label
           to stick out, while the sheet enters from below and
           settles above. */
        .rc-stage-inner {
          position: relative;
          width: 260px;
          height: 360px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: hidden;
          padding-bottom: 38px;
        }
        /* The sheet — paper white, stylised rows. Animates from
           160px below + opacity 0 to centred + opaque. */
        .rc-sheet {
          width: 200px;
          height: 260px;
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 6px;
          box-shadow:
            0 22px 32px -20px rgba(0, 0, 0, 0.40),
            0 6px 12px -4px rgba(0, 0, 0, 0.18);
          padding: 18px 18px 14px;
          margin-bottom: 18px;
          opacity: 0;
          transform: translateY(160px) scale(0.98);
          animation: rc-sheet-lift 620ms 60ms cubic-bezier(0.22, 1.05, 0.30, 1.0) forwards;
          position: relative;
          z-index: 1;
        }
        @keyframes rc-sheet-lift {
          0%   { transform: translateY(160px) scale(0.98); opacity: 0; }
          25%  { opacity: 1; }
          80%  { transform: translateY(-6px)  scale(1);    opacity: 1; }
          100% { transform: translateY(0)     scale(1);    opacity: 1; }
        }
        .rc-row {
          display: block;
          height: 4px;
          border-radius: 2px;
          background: #d4d4d8;
          margin-bottom: 6px;
        }
        .rc-row-head    { height: 10px; background: #1c1c20; width: 60%; margin-bottom: 8px; }
        .rc-row-contact { height: 3px;  width: 78%; background: #71717a; margin-bottom: 14px; }
        .rc-block { margin-bottom: 10px; }
        .rc-row-heading {
          height: 5px;
          width: 40%;
          background: var(--brand-500, #3b6471);
          margin-bottom: 5px;
          border-radius: 2px;
        }
        .rc-row-body { height: 3.5px; width: 96%; background: #a1a1aa; margin-bottom: 4px; border-radius: 2px; }
        .rc-row-body-short { width: 70%; }

        /* The drawer label at the bottom — a dark, metallic-feeling
           bar with a thin "slot" line above it that the sheet looks
           like it's emerging from. z-index above the sheet so the
           sheet's bottom edge is visually clipped behind the slot. */
        .rc-drawer {
          position: absolute;
          left: 8%;
          right: 8%;
          bottom: 0;
          height: 36px;
          background: linear-gradient(180deg, #2a323e, #1a2028);
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.10),
            0 -10px 16px -4px rgba(0, 0, 0, 0.25);
          z-index: 2;
        }
        .rc-drawer span {
          font: 700 11px/1 ui-monospace, "SF Mono", Menlo, monospace;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        /* The slot the sheet emerges from — a thin dark gap above
           the label, visually anchoring the "this came from inside
           the drawer" feel. */
        .rc-drawer::before {
          content: "";
          position: absolute;
          left: 14%;
          right: 14%;
          top: -3px;
          height: 3px;
          background: #0d1117;
          border-radius: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          .rc-overlay, .rc-sheet, .rc-caption {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
