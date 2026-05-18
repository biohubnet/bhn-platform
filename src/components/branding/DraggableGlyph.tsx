"use client";

/**
 * DraggableGlyph — wraps any decorative SVG glyph so it becomes
 * mouse-interactive AND slowly rotating on the login backdrop:
 *
 *   • Click-and-drag pushes it anywhere the cursor goes
 *     (pointer-capture, so the drag continues even if the cursor
 *     leaves the element bounds).
 *   • Cursor brushing past it (within `pokeRadius` px of the
 *     glyph centre) GENTLY pushes it away — implemented as a
 *     velocity-based physics step (acceleration + damping +
 *     spring back to base) rather than a snap, so the motion
 *     reads as a graceful drift instead of a kick. The push
 *     force easings as `(1 − dist/R)²` so it's whisper-soft at
 *     the radius edge and builds smoothly as the cursor closes.
 *   • Each glyph also slowly rotates on a per-instance random
 *     "centre of weight" — random rotation duration (60–140 s),
 *     random transform-origin (25–75 % each axis), and 50/50
 *     clockwise/counter-clockwise direction. So neighbouring
 *     glyphs never spin in unison and some twist in place while
 *     others trace a wider orbital arc.
 *
 * DOM layers (outermost first):
 *   • WRAPPER (className)  — absolute positioning. Sits inside
 *     the page's `pointer-events-none` atmosphere layer.
 *   • SWIM    (swimClass)  — `lab-swim*` CSS keyframe (translate).
 *   • SPIN    (lab-spin*)  — slow rotation around the random
 *     centre of weight, set via CSS custom properties.
 *   • INNER                — pointer events live here. Drag
 *     offset is applied imperatively as `translate3d(...)` so
 *     React isn't asked to re-render on every pointer move.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Tailwind/etc classes for the outer positioning wrapper. */
  className?: string;
  /** Optional CSS animation class for the swim wrapper (lab-swim*). */
  swimClass?: string;
  /**
   * How close (px) the cursor has to get to the glyph for a
   * brush-by to push it. Force fades quadratically to zero at
   * this radius, so a bigger value just means the push starts
   * sooner / more gradually. Defaults to 150.
   */
  pokeRadius?: number;
  /**
   * Per-frame acceleration (px / frame²) the cursor applies at
   * full force (cursor on top of the glyph). Lower = gentler.
   * Defaults to 0.18.
   */
  pokeAcceleration?: number;
  /**
   * Whether the glyph slowly drifts back toward its base
   * position when nothing is interacting with it. Defaults true.
   */
  springBack?: boolean;
}

/** Per-frame velocity damping coefficient. Higher = lazier
 *  (more friction), lower = snappier. */
const DAMPING = 0.92;

/** Spring constant pulling the glyph back to its base position
 *  while idle. Small enough that the return is graceful, not a
 *  rubber-band snap. */
const SPRING_K = 0.014;

export function DraggableGlyph({
  children,
  className,
  swimClass,
  pokeRadius = 150,
  pokeAcceleration = 0.18,
  springBack = true,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Visual offset (px) AND its velocity. Mutated imperatively in
  // the rAF loop / pointer-move handlers so React isn't woken on
  // every frame.
  const offsetRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });

  // Active pointer-drag state. null when not dragging.
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  const [grabbing, setGrabbing] = useState(false);

  // ── Per-instance random rotation params ───────────────────────
  // SSR-stable defaults; the real random values are picked on the
  // client in useEffect so we don't get a hydration mismatch.
  const [spin, setSpin] = useState<{
    duration: number;
    originX: number;
    originY: number;
    reverse: boolean;
  }>({ duration: 90, originX: 50, originY: 50, reverse: false });

  useEffect(() => {
    setSpin({
      // 60–140 s for a full rotation — "slow" per the brief
      duration: 60 + Math.random() * 80,
      // Centre of weight: anywhere in the middle 50 % of the box
      originX: 25 + Math.random() * 50,
      originY: 25 + Math.random() * 50,
      // 50/50 clockwise vs counter-clockwise
      reverse: Math.random() < 0.5,
    });
  }, []);

  function applyTransform() {
    const el = innerRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${offsetRef.current.x.toFixed(2)}px, ${offsetRef.current.y.toFixed(2)}px, 0)`;
  }

  // ── Pointer handlers (drag) ───────────────────────────────────
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* some browsers throw on touch — ignore, drag still works */
    }
    // Drag overrides the spring-back velocity so the glyph
    // doesn't fight the user's hand.
    velocityRef.current = { x: 0, y: 0 };
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: offsetRef.current.x,
      baseY: offsetRef.current.y,
    };
    setGrabbing(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    offsetRef.current = {
      x: d.baseX + (e.clientX - d.startX),
      y: d.baseY + (e.clientY - d.startY),
    };
    applyTransform();
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    dragRef.current = null;
    setGrabbing(false);
  }

  // ── Hover-poke + spring-back rAF loop ─────────────────────────
  // Velocity-based: each frame the cursor (if inside the poke
  // radius) ADDS to the glyph's velocity, the spring ADDS a
  // pull-back component, and velocity is damped + integrated.
  // Result: a smooth physical drift rather than a snap.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let rafId = 0;
    let cursorX = -9999;
    let cursorY = -9999;

    function onWindowMove(e: MouseEvent) {
      cursorX = e.clientX;
      cursorY = e.clientY;
    }

    function tick() {
      const el = innerRef.current;
      if (el && !dragRef.current) {
        // Use the inner element's bounding rect so distance is
        // measured from where the glyph CURRENTLY appears (post
        // swim + spin + drag transforms), not from the static
        // wrapper origin. Feels right when the glyph has drifted.
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = cx - cursorX;
        const dy = cy - cursorY;
        const dist = Math.hypot(dx, dy);

        // Cursor push — gentle quadratic falloff
        if (dist > 0.1 && dist < pokeRadius) {
          const t = 1 - dist / pokeRadius;
          const force = t * t; // ease-in: whisper-soft at the edge
          const ux = dx / dist;
          const uy = dy / dist;
          velocityRef.current.x += ux * force * pokeAcceleration;
          velocityRef.current.y += uy * force * pokeAcceleration;
        }

        // Spring back toward base position
        if (springBack) {
          velocityRef.current.x += -offsetRef.current.x * SPRING_K;
          velocityRef.current.y += -offsetRef.current.y * SPRING_K;
        }

        // Damping (friction) + integrate
        velocityRef.current.x *= DAMPING;
        velocityRef.current.y *= DAMPING;
        offsetRef.current.x += velocityRef.current.x;
        offsetRef.current.y += velocityRef.current.y;

        // Snap microscopic residuals to zero so the rAF tick can
        // be a no-op once everything has settled.
        if (
          Math.abs(offsetRef.current.x) < 0.02 &&
          Math.abs(velocityRef.current.x) < 0.02
        ) {
          offsetRef.current.x = 0;
          velocityRef.current.x = 0;
        }
        if (
          Math.abs(offsetRef.current.y) < 0.02 &&
          Math.abs(velocityRef.current.y) < 0.02
        ) {
          offsetRef.current.y = 0;
          velocityRef.current.y = 0;
        }

        applyTransform();
      }
      rafId = window.requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onWindowMove, { passive: true });
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onWindowMove);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [pokeRadius, pokeAcceleration, springBack]);

  // CSS variables consumed by the `.lab-spin` / `.lab-spin-rev`
  // classes defined in globals.css.
  const spinStyle: CSSProperties = {
    // @ts-expect-error — custom CSS variable names not on CSSProperties
    "--spin-duration": `${spin.duration.toFixed(1)}s`,
    "--spin-origin": `${spin.originX.toFixed(1)}% ${spin.originY.toFixed(1)}%`,
  };

  return (
    <div ref={wrapperRef} className={className}>
      {/* SWIM — translate via lab-swim* keyframe */}
      <div className={swimClass}>
        {/* SPIN — rotate slowly around the random centre of weight */}
        <div
          className={spin.reverse ? "lab-spin-rev" : "lab-spin"}
          style={spinStyle}
        >
          {/* INNER — pointer events + JS-driven drag transform */}
          <div
            ref={innerRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            style={{
              cursor: grabbing ? "grabbing" : "grab",
              touchAction: "none",
              willChange: "transform",
              pointerEvents: "auto",
              display: "inline-block",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
