"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, X, ShieldCheck } from "lucide-react";

interface Props {
  actingAs: string;
}

/**
 * Floating "view-as" pill — shown only when a superadmin is acting as
 * a less-privileged role. Previously this rendered as a full-width
 * striped banner at the top of every page (eats vertical space, hides
 * the editorial hero). Reworked as a fixed bottom-right pill that
 * stays unmissable (amber + soft pulse) but doesn't compete with the
 * page content.
 *
 * Layout notes:
 *   • `fixed bottom-4 right-4` lives outside any column.
 *   • `z-40` matches the PageTranslator dock (top-right at the same
 *     z-index) — both stay above page content but below modals at z-50.
 *   • The pulse ring is a pure CSS animation; the icon stays static
 *     so the moving target isn't the click target.
 *   • Collapses on small viewports — the descriptive text drops to a
 *     tooltip and only the icon + "Stop" remain, so the pill never
 *     wraps off-screen.
 */
export function ImpersonationBanner({ actingAs }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function stop() {
    setBusy(true);
    try {
      await fetch("/api/admin/act-as", { method: "DELETE" });
      router.refresh();
      // Force a fresh hard-nav to /admin so server-rendered gates
      // re-evaluate against the restored real-role session.
      setTimeout(() => router.push("/admin"), 50);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-40 pointer-events-none"
      role="status"
      aria-live="polite"
      aria-label={`Viewing as ${actingAs}. Admin permissions are paused while in this mode.`}
    >
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-900 border-2 border-amber-800/60 shadow-[0_8px_24px_-6px_rgba(120,53,15,0.45),0_2px_6px_rgba(120,53,15,0.25)] pl-1.5 pr-1 py-1">
        {/* Pulsing eye disc — soft amber ring loops to draw attention
            without animating the icon itself. */}
        <span className="relative inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-200 text-amber-900 shrink-0">
          <Eye size={14} />
          <span
            aria-hidden
            className="absolute inset-0 rounded-full ring-2 ring-amber-400 animate-ping opacity-60 pointer-events-none"
          />
        </span>

        {/* Compact status — "VIEW-AS · trainee". Hidden on the tightest
            viewports so the pill stays short. */}
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold leading-none">
          <span className="font-bold uppercase tracking-[0.14em] text-[10px] bg-amber-200/70 border border-amber-700/30 px-1.5 py-0.5 rounded">
            View-as
          </span>
          <span className="lowercase">{actingAs}</span>
        </span>

        {/* CTA — espresso outline button. Always visible (this is the
            only way out of impersonation mode). */}
        <button
          onClick={stop}
          disabled={busy}
          title="Stop viewing as · Restore superadmin"
          className={[
            "group inline-flex items-center gap-1.5 shrink-0",
            "bg-amber-900 hover:bg-amber-800 text-amber-50",
            "font-bold text-xs px-3 py-1.5 rounded-full",
            "border border-amber-950/50",
            "disabled:opacity-60 disabled:cursor-not-allowed transition-colors",
          ].join(" ")}
        >
          <ShieldCheck size={12} />
          <span className="hidden md:inline">Stop · restore admin</span>
          <span className="md:hidden">Stop</span>
          <X size={11} className="opacity-80" />
        </button>
      </div>
    </div>
  );
}
