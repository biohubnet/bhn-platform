"use client";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Fires a `bhn:nav-highlight` window event with the given href on
 * pointer-enter / focus, and clears it on leave / blur. The sidebar
 * NavLink component listens for that event and pulses the matching
 * nav row, so a reader scanning a guide page can instantly find the
 * corresponding control in the menu.
 *
 * Using a global window event (rather than React context) means the
 * sender and the listener don't need to share a tree. The sidebar
 * is rendered upstream of every page in the dashboard layout, so
 * context would require lifting state — bloating every dashboard
 * page for a feature only this one needs.
 *
 * Two consumers:
 *   • <NavHighlight href={...}>Label text</NavHighlight>
 *       Inline brand-pill chip with an arrow glyph. Use inside body
 *       copy when mentioning a sidebar item by name.
 *   • <NavHighlightZone href={...}><CustomBox/></NavHighlightZone>
 *       Bare wrapper — applies no visual styling of its own, just
 *       routes the events. Use for flow-chart boxes, diagrams, or
 *       anywhere you want the highlight behaviour without the chip
 *       look.
 */

function fireHighlight(href: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("bhn:nav-highlight", { detail: { href } }),
  );
}

export function NavHighlight({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      onMouseEnter={() => fireHighlight(href)}
      onMouseLeave={() => fireHighlight(null)}
      onFocus={() => fireHighlight(href)}
      onBlur={() => fireHighlight(null)}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-semibold ring-1 ring-inset ring-brand-200 hover:bg-brand-100 hover:ring-brand-300 transition-colors no-underline"
    >
      {children}
      <span aria-hidden className="text-[10px] opacity-70">↗</span>
    </Link>
  );
}

export function NavHighlightZone({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      onMouseEnter={() => fireHighlight(href)}
      onMouseLeave={() => fireHighlight(null)}
      onFocus={() => fireHighlight(href)}
      onBlur={() => fireHighlight(null)}
      className={className ?? "block no-underline"}
    >
      {children}
    </Link>
  );
}
