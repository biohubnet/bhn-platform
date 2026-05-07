"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, X, ShieldCheck } from "lucide-react";

interface Props {
  actingAs: string;
}

/**
 * Top-of-page banner shown only when a superadmin is "viewing as" a
 * less-privileged role. Designed to be UNMISSABLE: pulsing eye icon,
 * a hard-edge solid CTA with a very high-contrast colour pair, and
 * subtle stripe pattern in the bar background so it never disappears
 * into a similarly-amber page.
 */
export function ImpersonationBanner({ actingAs }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function stop() {
    setBusy(true);
    try {
      await fetch("/api/admin/act-as", { method: "DELETE" });
      router.refresh();
      // Force a fresh hard-nav to /admin so server-rendered gates re-evaluate
      setTimeout(() => router.push("/admin"), 50);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="sticky top-0 z-40 text-amber-50 shadow-lg shadow-amber-900/30 border-b-2 border-amber-900/40"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, #b45309 0 12px, #c2410c 12px 24px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm min-w-0">
          <span className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-900 shrink-0">
            <Eye size={16} />
            <span className="absolute inset-0 rounded-full ring-2 ring-amber-100 animate-ping opacity-60 pointer-events-none" />
          </span>
          <p className="truncate">
            <span className="font-bold uppercase tracking-wider text-[11px] bg-amber-900/40 border border-amber-200/40 px-1.5 py-0.5 rounded mr-2">
              View-as
            </span>
            <span className="font-semibold">Viewing as {actingAs}</span>
            <span className="hidden md:inline text-amber-100/90"> — admin permissions are paused while in this mode.</span>
          </p>
        </div>

        {/* High-contrast CTA. Cream background, espresso text, hard
            shadow, and a coloured chevron that pings on hover so the
            cursor is drawn to it. Min-height matches the icon ring so
            visually anchors the right side of the bar. */}
        <button
          onClick={stop}
          disabled={busy}
          className={[
            "group inline-flex items-center gap-2 shrink-0",
            "bg-white text-amber-900 hover:bg-amber-50",
            "font-bold text-sm px-4 py-2 rounded-lg",
            "border-2 border-amber-900/60 shadow-[0_2px_0_0_rgba(120,53,15,0.55)]",
            "hover:shadow-[0_3px_0_0_rgba(120,53,15,0.55)] hover:-translate-y-px",
            "active:translate-y-px active:shadow-[0_1px_0_0_rgba(120,53,15,0.55)]",
            "disabled:opacity-60 disabled:cursor-not-allowed transition-all",
          ].join(" ")}
        >
          <ShieldCheck size={15} className="text-amber-700 group-hover:text-amber-900 transition-colors" />
          <span>Stop viewing as · Restore superadmin</span>
          <X size={13} className="opacity-70 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );
}
