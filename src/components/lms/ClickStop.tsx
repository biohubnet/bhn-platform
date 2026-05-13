"use client";
import type { ReactNode } from "react";

/**
 * Tiny client-side wrapper that swallows clicks + keydowns so they
 * don't bubble to a parent <Link>. Used on /pathways to host the
 * LeavePathwayButton inside a clickable pathway card without the
 * Leave click also firing the card's navigation.
 *
 * Exists as a separate client file because the parent (/pathways)
 * is a server component — and server components can't define
 * inline onClick / onKeyDown handlers (Next.js can't serialise
 * functions to the client). A trivial named client component
 * sidesteps that limit cleanly.
 */
export function ClickStop({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onKeyDown={(e) => e.stopPropagation()}
      className={className ?? "inline-flex"}
    >
      {children}
    </span>
  );
}
