/**
 * /welcome/* — minimal fullscreen layout for first-login rituals.
 * Deliberately OUTSIDE the (dashboard) route group so the
 * sidebar, queue badges, and rest of the dashboard chrome don't
 * appear. A trainee arriving here just signed up and is going
 * through a focused interactive moment; we don't want to dump
 * them into the navigation soup yet.
 */
import type { ReactNode } from "react";

export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
}
