"use client";

/**
 * DraggableGlyph — wraps any decorative SVG glyph so it becomes
 * mouse-interactive on the login backdrop:
 *
 *   • Click-and-drag pushes it anywhere the cursor goes
 *     (pointer-capture, so the drag continues even if the cursor
 *     leaves the element bounds).
 *   • Cursor brushing past it (within `pokeRadius` px of the
 *     glyph centre) gently nudges it AWAY from the cursor — the
 *     "poked" feeling the brief asked for.
 *   • When the cursor is far away and not dragging, the glyph
 *     gently springs back toward its base position so the layout
 *     doesn't drift forever.
 *
 * Two-layer DOM:
 *   • OUTER (className)  — the layout positioning (absolute, etc.).
 *     Stays in the page's pointer-events-none atmosphere layer.
 *   • SWIM  (swimClass)  — the lab-swim CSS keyframe so the glyph
 *     drifts gracefully when nobody is touching it.
 *   • INNER (transform)  — the user-driven offset is applied here
 *     imperatively (no React re-render per frame) and this layer
 *     opts into `pointer-events-auto` so it can actually be
 *     grabbed even though its parent disables pointer events.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Tailwind/etc classes for the outer positioning wrapper. */
  className?: string;
  /** Optional CSS animation class for the middle "swim" wrapper. */
  swimClass?: string;
  /**
   * How close (px) the cursor has to get to the glyph centre for
   * a brush-by to push it. Larger = easier to poke without
   * grabbing. Defaults to 110.
   */
  pokeRadius?: number;
  /** Push force per frame (px). Defaults to 22. */
  pokeStrength?: number;
  /**
   * Whether the glyph slowly drifts back toward its base position
   * when nothing is interacting with it. Defaults to true.
   */
  springBack?: boolean;
}

export function DraggableGlyph({
  children,
  className,
  swimClass,
  pokeRadius = 110,
  pokeStrength = 22,
  springBack = true,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Current visual offset (px). Mutated imperatively via rAF or
  // pointer-move handlers so we don't trigger React re-renders on
  // every frame.
  const offsetRef = useRef({ x: 0, y: 0 });

  // Active pointer-drag state. null when not dragging.
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  const [grabbing, setGrabbing] = useState(false);

  function applyTransform() {
    const el = innerRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${offsetRef.current.x.toFixed(2)}px, ${offsetRef.current.y.toFixed(2)}px, 0)`;
  }

  // ── Pointer handlers (drag) ───────────────────────────────────
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      /* some browsers throw on touch — ignore, drag still works */
    }
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
      const el = wrapperRef.current;
      if (el && !dragRef.current) {
        const rect = el.getBoundingClientRect();
        // The visible glyph centre — note rect already accounts for
        // the current translate3d offset because we apply it to a
        // descendant element.
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = cx - cursorX;
        const dy = cy - cursorY;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.1 && dist < pokeRadius) {
          // Cursor is inside the poke radius — nudge AWAY from it.
          const force = (1 - dist / pokeRadius) * pokeStrength;
          const ux = dx / dist;
          const uy = dy / dist;
          offsetRef.current.x += ux * force * 0.18;
          offsetRef.current.y += uy * force * 0.18;
          applyTransform();
        } else if (springBack && (offsetRef.current.x !== 0 || offsetRef.current.y !== 0)) {
          // Idle — drift gently back toward (0,0).
          offsetRef.current.x *= 0.965;
          offsetRef.current.y *= 0.965;
          if (Math.abs(offsetRef.current.x) < 0.05) offsetRef.current.x = 0;
          if (Math.abs(offsetRef.current.y) < 0.05) offsetRef.current.y = 0;
          applyTransform();
        }
      }
      rafId = window.requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onWindowMove, { passive: true });
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onWindowMove);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [pokeRadius, pokeStrength, springBack]);

  return (
    <div ref={wrapperRef} className={className}>
      <div className={swimClass}>
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
  );
}
