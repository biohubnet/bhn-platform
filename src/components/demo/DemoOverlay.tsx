"use client";
/**
 * DemoOverlay — the live visual tour layer.
 *
 * Renders when a tour is active (useDemoTour().active === true).
 * Mounted once in the dashboard layout; persists across page navigations.
 *
 * Visual layers (bottom → top):
 *   1. Spotlight  — a fixed div whose box-shadow creates a 200vmax dark
 *                   curtain around the highlighted region. Position +
 *                   size animate with CSS transitions.
 *   2. Spotlight  ring — subtle white border pulsing around the cutout.
 *   3. Cursor     — SVG arrow that moves via CSS transition (1.2 s
 *                   ease-out spring) and shows a ripple on click steps.
 *   4. Tooltip    — floating card with title / body / progress / controls.
 *                   Appears after cursor settles (stage === "active").
 *   5. Demo bar   — slim pill at the bottom of the screen showing tour
 *                   context and an Exit button at all times.
 *   6. Loading bar— thin progress bar at the top during page navigation.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useDemoTour } from "@/lib/demo/tourContext";
import type { SpotlightRegion, CursorTarget, TourPersona, TourPhase } from "@/lib/demo/tourScripts";

// ─── Style look-up tables (mirrors DemoHub's CHAR_STYLE + PHASES) ──────────────

const CHAR_META: Record<TourPersona, { name: string; initial: string; badge: string; text: string; dot: string }> = {
  rex:  { name: "Rex",  initial: "R", badge: "bg-emerald-100 text-emerald-700", text: "text-emerald-700", dot: "bg-emerald-400" },
  vera: { name: "Vera", initial: "V", badge: "bg-violet-100 text-violet-700",   text: "text-violet-700",  dot: "bg-violet-400"  },
  max:  { name: "Max",  initial: "M", badge: "bg-sky-100 text-sky-700",         text: "text-sky-700",     dot: "bg-sky-400"     },
};

const PHASE_META: Record<TourPhase, { label: string; text: string; dot: string; bg: string }> = {
  engage:     { label: "ENGAGE",     text: "text-emerald-700", dot: "bg-emerald-400", bg: "bg-emerald-50" },
  experience: { label: "EXPERIENCE", text: "text-amber-700",   dot: "bg-amber-400",   bg: "bg-amber-50"   },
  equip:      { label: "EQUIP",      text: "text-rose-700",    dot: "bg-rose-400",    bg: "bg-rose-50"    },
};

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Thin progress bar at the very top during page load. */
function LoadingBar() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setW(55), 80);
    const t2 = setTimeout(() => setW(88), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[9910]">
      <div
        className="h-full bg-emerald-400 transition-all ease-out"
        style={{ width: `${w}%`, transitionDuration: w === 55 ? "800ms" : "400ms" }}
      />
    </div>
  );
}

/** Cursor SVG arrow — always white with shadow for legibility on any bg. */
function CursorIcon({ clicking }: { clicking: boolean }) {
  return (
    <svg
      width="24" height="26" viewBox="0 0 24 26" fill="none"
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))" }}
      className={cn("transition-transform", clicking && "scale-90")}
    >
      {/* Arrow body */}
      <path
        d="M4 2L20 16L13.5 15.2L10 22.5L7.5 15.2L4 2Z"
        fill="white"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Expanding ripple at click moment. */
function ClickRipple() {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: "-14px", top: "-14px",
        width: "32px", height: "32px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.35)",
        border: "2px solid rgba(255,255,255,0.6)",
        animation: "demo-click-ripple 0.55s ease-out forwards",
      }}
    />
  );
}

/** Compute where the tooltip should appear relative to the spotlight. */
function useTooltipStyle(spotlight: SpotlightRegion): React.CSSProperties {
  const midY = spotlight.yPct + spotlight.hPct / 2;
  const midX = spotlight.xPct + spotlight.wPct / 2;
  const tipW  = 22; // % of viewport width
  const left  = Math.max(18, Math.min(midX - tipW / 2, 100 - tipW - 2));

  if (midY < 56) {
    // Spotlight is in the upper portion → tooltip below
    const top = Math.min(spotlight.yPct + spotlight.hPct + 2, 70);
    return { position: "fixed", left: `${left}%`, top: `${top}%`, zIndex: 9908 };
  } else {
    // Spotlight is in the lower portion → tooltip above
    const bottom = Math.max(8, 100 - spotlight.yPct + 2);
    return { position: "fixed", left: `${left}%`, bottom: `${bottom}%`, zIndex: 9908 };
  }
}

/** Tooltip card shown when stage === "active". */
function TooltipCard({
  title, body, stepIdx, totalSteps, persona, phase, onNext, onPrev, onExit, spotlight,
}: {
  title: string; body: string;
  stepIdx: number; totalSteps: number;
  persona: TourPersona; phase: TourPhase;
  onNext: () => void; onPrev: () => void; onExit: () => void;
  spotlight: SpotlightRegion;
}) {
  const cm = CHAR_META[persona];
  const pm = PHASE_META[phase];
  const style = useTooltipStyle(spotlight);
  const isLast = stepIdx >= totalSteps - 1;

  return (
    <div
      className="w-[320px] rounded-2xl overflow-hidden bg-card border border-line shadow-2xl"
      style={{ ...style, animation: "demo-tooltip-enter 0.28s ease-out forwards" }}
    >
      {/* Header stripe */}
      <div className={cn("px-4 py-2.5 flex items-center justify-between", cm.badge.includes("emerald") ? "bg-emerald-50" : cm.badge.includes("violet") ? "bg-violet-50" : "bg-sky-50")}>
        <div className="flex items-center gap-2">
          <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", cm.badge)}>
            {cm.initial}
          </span>
          <span className={cn("text-xs font-semibold", cm.text)}>{cm.name}</span>
          <span className="text-xs text-muted">·</span>
          <span className={cn("text-xs font-semibold", pm.text)}>{pm.label}</span>
        </div>
        <span className="text-[11px] text-muted tabular-nums">{stepIdx + 1} / {totalSteps}</span>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-2">
        <p className="font-semibold text-sm text-fg leading-snug mb-1.5">{title}</p>
        <p className="text-xs text-muted leading-relaxed">{body}</p>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-2 flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i < stepIdx ? pm.dot :
              i === stepIdx ? pm.dot + " opacity-100" :
              "bg-line"
            )}
            style={i === stepIdx ? { opacity: 1 } : i < stepIdx ? { opacity: 0.7 } : {}}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="px-4 py-2.5 flex items-center justify-between border-t border-line">
        <button
          onClick={onPrev}
          disabled={stepIdx === 0}
          className="text-xs text-muted hover:text-fg disabled:opacity-30 transition-colors select-none"
        >
          ← Back
        </button>
        <button
          onClick={onExit}
          className="text-xs text-subtle hover:text-muted transition-colors select-none"
        >
          Exit
        </button>
        <button
          onClick={onNext}
          className={cn(
            "text-xs font-semibold px-3 py-1.5 rounded-full transition-all select-none",
            cm.badge, "hover:opacity-90 active:scale-95"
          )}
        >
          {isLast ? "Finish ✓" : "Next →"}
        </button>
      </div>
    </div>
  );
}

/** Slim persistent bar at the bottom of the screen. */
function DemoBar({
  persona, phase, stepIdx, totalSteps, onExit,
}: {
  persona: TourPersona; phase: TourPhase;
  stepIdx: number; totalSteps: number;
  onExit: () => void;
}) {
  const cm = CHAR_META[persona];
  const pm = PHASE_META[phase];

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-[9909] pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 px-5 py-2.5 rounded-full bg-card/90 border border-line shadow-xl backdrop-blur-md text-sm">
        <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0", cm.badge)}>
          {cm.initial}
        </span>
        <span className="text-[11px] text-muted font-medium">Demo</span>
        <span className={cn("text-[11px] font-semibold", cm.text)}>{cm.name}</span>
        <span className="text-[11px] text-subtle">·</span>
        <span className={cn("text-[11px] font-semibold", pm.text)}>{pm.label}</span>
        <span className="text-[11px] text-subtle">·</span>
        <span className="text-[11px] text-muted tabular-nums">Step {stepIdx + 1} / {totalSteps}</span>
        <button
          onClick={onExit}
          className="ml-1 text-[11px] text-subtle hover:text-fg transition-colors px-2 py-0.5 rounded-full hover:bg-elevated select-none"
        >
          ✕ Exit
        </button>
      </div>
    </div>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export function DemoOverlay() {
  const { active, persona, phase, steps, stepIdx, stage, nextStep, prevStep, exitTour } = useDemoTour();
  const [mounted, setMounted] = useState(false);
  const [showClick, setShowClick] = useState(false);

  // SSR guard — createPortal needs document.body
  useEffect(() => { setMounted(true); }, []);

  // Show click ripple when cursor "arrives" at a click-target step
  const step = steps[stepIdx];
  useEffect(() => {
    if (stage !== "active" || !step?.cursor?.click) return;
    setShowClick(true);
    const t = setTimeout(() => setShowClick(false), 700);
    return () => clearTimeout(t);
  }, [stage, stepIdx, step?.cursor?.click]);

  if (!mounted || !active || !step) return null;

  const { spotlight, cursor } = step;
  const isLoading = stage === "loading";

  return createPortal(
    <div className="fixed inset-0 z-[9900] pointer-events-none" aria-hidden>

      {/* ── SPOTLIGHT (box-shadow curtain) ─────────────────────────── */}
      <div
        style={{
          position: "fixed",
          left:     `${spotlight.xPct}%`,
          top:      `${spotlight.yPct}%`,
          width:    `${spotlight.wPct}%`,
          height:   `${spotlight.hPct}%`,
          borderRadius: `${spotlight.radius ?? 12}px`,
          // The gigantic box-shadow IS the dark overlay — the div
          // itself is the transparent "hole".
          boxShadow: "0 0 0 200vmax rgba(0,0,0,0.60)",
          outline: "1.5px solid rgba(255,255,255,0.10)",
          outlineOffset: "2px",
          transition: [
            "left 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            "top 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            "height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          ].join(", "),
        }}
      />

      {/* Spotlight ring pulse (subtle) */}
      <div
        style={{
          position: "fixed",
          left:     `calc(${spotlight.xPct}% - 4px)`,
          top:      `calc(${spotlight.yPct}% - 4px)`,
          width:    `calc(${spotlight.wPct}% + 8px)`,
          height:   `calc(${spotlight.hPct}% + 8px)`,
          borderRadius: `${(spotlight.radius ?? 12) + 4}px`,
          border: "1.5px solid rgba(255,255,255,0.08)",
          animation: "demo-spotlight-pulse 2.5s ease-in-out infinite",
          transition: [
            "left 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            "top 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            "height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          ].join(", "),
        }}
      />

      {/* ── ANIMATED CURSOR ───────────────────────────────────────── */}
      <div
        style={{
          position:   "fixed",
          left:       `${cursor.xPct}%`,
          top:        `${cursor.yPct}%`,
          transform:  "translate(-3px, -2px)",
          zIndex:     9905,
          transition: [
            "left 1.2s cubic-bezier(0.25, 1, 0.5, 1)",
            "top 1.2s cubic-bezier(0.25, 1, 0.5, 1)",
          ].join(", "),
        }}
      >
        <CursorIcon clicking={showClick} />
        {showClick && <ClickRipple />}
      </div>

      {/* ── TOOLTIP ───────────────────────────────────────────────── */}
      {stage === "active" && (
        <div className="pointer-events-auto">
          <TooltipCard
            title={step.title}
            body={step.body}
            stepIdx={stepIdx}
            totalSteps={steps.length}
            persona={persona!}
            phase={phase!}
            onNext={nextStep}
            onPrev={prevStep}
            onExit={exitTour}
            spotlight={spotlight}
          />
        </div>
      )}

      {/* ── LOADING BAR ───────────────────────────────────────────── */}
      {isLoading && <LoadingBar />}

      {/* ── DEMO BAR (always visible while tour is active) ─────────── */}
      <DemoBar
        persona={persona!}
        phase={phase!}
        stepIdx={stepIdx}
        totalSteps={steps.length}
        onExit={exitTour}
      />

    </div>,
    document.body
  );
}
