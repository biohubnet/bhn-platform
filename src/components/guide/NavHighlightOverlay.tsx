"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { HighlightRect } from "./NavHighlight";

/**
 * Viewport-level SVG overlay that draws a dotted curved line from a
 * hovered <NavHighlight> pill to the matching sidebar nav row. Listens
 * for `bhn:nav-highlight` events fired by NavHighlight / NavHighlightZone
 * — the pill includes its own bounding rect in the event detail; this
 * overlay queries the DOM for the sidebar link with the matching
 * `data-sidebar-nav-href` attribute and computes the curve.
 *
 * Why bother with the curve at all? The amber pulse on the sidebar
 * row already tells you *which* row matches. But a curve answers the
 * spatial question — "OK and where IS that row from where I'm
 * looking?" — much faster than scanning the sidebar yourself. The
 * effect is most useful on long guide pages where the matching row
 * may be far from the cursor, or hidden inside a collapsed section.
 *
 * Mount once at the dashboard layout (sibling of the page main + the
 * sidebar) so the SVG renders above page content but below modals.
 */
export function NavHighlightOverlay() {
  const [mounted, setMounted] = useState(false);
  const [from, setFrom] = useState<HighlightRect | null>(null);
  const [to, setTo] = useState<HighlightRect | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function snapshotTarget(href: string): HighlightRect | null {
      const el = document.querySelector(`[data-sidebar-nav-href="${cssEscape(href)}"]`) as HTMLElement | null;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: r.top, left: r.left, right: r.right, bottom: r.bottom,
        width: r.width, height: r.height,
      };
    }

    function onHl(e: Event) {
      const detail = (e as CustomEvent<{ href: string | null; rect: HighlightRect | null }>).detail;
      if (!detail?.href || !detail?.rect) {
        setFrom(null);
        setTo(null);
        return;
      }
      const target = snapshotTarget(detail.href);
      if (!target) {
        // Sidebar item not on the page (collapsed section, hidden by
        // role gate, etc.) — show nothing rather than a half-drawn line.
        setFrom(null);
        setTo(null);
        return;
      }
      setFrom(detail.rect);
      setTo(target);
    }
    window.addEventListener("bhn:nav-highlight", onHl as EventListener);
    return () => window.removeEventListener("bhn:nav-highlight", onHl as EventListener);
  }, []);

  if (!mounted || !from || !to) return null;

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
          reads as part of the platform's nav language, and slight
          drop-shadow keeps it legible against busy hero gradients. */}
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
