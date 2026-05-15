"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { HighlightRect, NavHighlightDetail } from "./NavHighlight";

/**
 * Viewport-level SVG overlay that draws a dotted curved line from a
 * hovered <NavHighlight> pill to the matching sidebar nav row.
 *
 * The line tracks both endpoints in real time:
 *   • Source pill — kept as an HTMLElement ref. As long as it's on
 *     the page, every animation frame re-queries getBoundingClientRect
 *     so the right end of the line stays glued to the pill even while
 *     the page scrolls under it.
 *   • Sidebar target — re-queried via `[data-sidebar-nav-href]` on
 *     every frame too. The sidebar has its own scrollable column, so
 *     the target's screen position can change independently of the
 *     page.
 *
 * On initial hover, if the matching sidebar row is outside the
 * sidebar's scrollable viewport (i.e. scrolled out of sight),
 * `scrollIntoView({ block: "nearest" })` auto-scrolls the sidebar so
 * the target ends up visible. `block: "nearest"` is a no-op when the
 * row is already in view, so this is free for the common case.
 *
 * Without these two fixes the line was confusing — it could drift
 * away from the pill on long pages, or terminate off-screen on short
 * viewports.
 *
 * Mount once at the dashboard layout (sibling of the page main + the
 * sidebar) so the SVG renders above page content but below modals.
 */
export function NavHighlightOverlay() {
  const [mounted, setMounted] = useState(false);
  const [rects, setRects] = useState<{ from: HighlightRect; to: HighlightRect } | null>(null);
  // Source element ref — survives across renders, used by the rAF
  // loop to re-query the pill's screen rect every frame.
  const sourceElRef = useRef<HTMLElement | null>(null);
  const activeHrefRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  // Mount gate — the SVG portal targets document.body, which isn't
  // defined during SSR. Flipping a state bit lets us guard against
  // that for the very first render only.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function snapshotRect(el: HTMLElement): HighlightRect {
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }

    function findTarget(href: string): HTMLElement | null {
      return document.querySelector(`[data-sidebar-nav-href="${cssEscape(href)}"]`) as HTMLElement | null;
    }

    function loop() {
      const href = activeHrefRef.current;
      const sourceEl = sourceElRef.current;
      if (!href || !sourceEl || !document.body.contains(sourceEl)) {
        setRects(null);
        rafRef.current = null;
        return;
      }
      const targetEl = findTarget(href);
      if (!targetEl) {
        // Target nav row isn't on the page (collapsed group, role-
        // gated, etc.) — draw nothing rather than a half-line.
        setRects(null);
      } else {
        const from = snapshotRect(sourceEl);
        const to   = snapshotRect(targetEl);
        // setState only when meaningfully changed; otherwise we
        // burn renders for nothing on idle frames.
        setRects((prev) => {
          if (!prev) return { from, to };
          if (
            sameRect(prev.from, from) &&
            sameRect(prev.to, to)
          ) return prev;
          return { from, to };
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    function start(href: string, element: HTMLElement) {
      activeHrefRef.current = href;
      sourceElRef.current = element;
      // Auto-scroll the sidebar so the matching nav row is in view
      // before the line starts drawing. block:"nearest" is a no-op
      // when the target is already on screen, so this only triggers
      // a scroll when the user couldn't see the row anyway.
      const target = findTarget(href);
      if (target) {
        try {
          target.scrollIntoView({ block: "nearest", behavior: "smooth" });
        } catch {
          // Older browsers that lack the options form — fall back to
          // the boolean variant.
          target.scrollIntoView(false);
        }
      }
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    function stop() {
      activeHrefRef.current = null;
      sourceElRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setRects(null);
    }

    function onHl(e: Event) {
      const detail = (e as CustomEvent<NavHighlightDetail>).detail;
      if (!detail?.href || !detail?.element) {
        stop();
        return;
      }
      start(detail.href, detail.element);
    }

    window.addEventListener("bhn:nav-highlight", onHl as EventListener);
    return () => {
      window.removeEventListener("bhn:nav-highlight", onHl as EventListener);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  if (!mounted || !rects) return null;
  const { from, to } = rects;

  // Anchor points. Pill is in content area (right of sidebar);
  // sidebar item is to the left. Line leaves the pill's left edge
  // and lands on the sidebar item's right edge — the shortest
  // visually-clean path between them.
  const startX = from.left;
  const startY = from.top + from.height / 2;
  const endX   = to.right;
  const endY   = to.top + to.height / 2;

  // Cubic-bezier control points. Pull the curve out to the left of
  // both endpoints so it bows away from the page edge, gives the
  // line some character, and looks distinct from a straight rule.
  const dx = startX - endX;
  const bow = Math.max(40, Math.min(220, Math.abs(dx) * 0.4));
  const c1x = startX - bow;
  const c1y = startY;
  const c2x = endX + bow;
  const c2y = endY;
  const d = `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;

  return createPortal(
    <svg
      className="fixed inset-0 pointer-events-none z-40"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* The dotted curve itself. Stroke uses the brand accent so it
          reads as part of the platform's nav language, and a soft
          glow keeps it legible against busy hero gradients. */}
      <defs>
        <filter id="bhn-navhl-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      {/* Glow underlay */}
      <path
        d={d}
        fill="none"
        stroke="rgba(56,189,248,0.45)"
        strokeWidth={4}
        filter="url(#bhn-navhl-glow)"
      />
      {/* Dotted curve */}
      <path
        d={d}
        fill="none"
        stroke="rgb(217, 119, 6)"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeDasharray="2 6"
      />
      {/* End-dot at the sidebar side — emphasises the target. */}
      <circle cx={endX} cy={endY} r={4} fill="rgb(217, 119, 6)" />
      <circle cx={endX} cy={endY} r={8} fill="none" stroke="rgb(217, 119, 6)" strokeWidth={1.25} strokeOpacity={0.5} />
    </svg>,
    document.body,
  );
}

/**
 * CSS.escape isn't on all the older lib targets we compile against,
 * so do a minimal selector-safe escape for the chars that appear in
 * our hrefs (mostly `/`, hyphens, alphanum). Quotation marks would be
 * a problem; nothing in our nav table contains them.
 */
function cssEscape(s: string): string {
  return s.replace(/(["\\])/g, "\\$1");
}

/** Pixel-precision rect equality check. Sub-pixel jitter from
 *  layout effects is normal; we ignore differences below 0.5px so
 *  the overlay doesn't re-render every animation frame on a
 *  perfectly still page. */
function sameRect(a: HighlightRect, b: HighlightRect): boolean {
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}
