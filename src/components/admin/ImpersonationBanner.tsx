"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, X, ShieldCheck } from "lucide-react";

interface Props {
  actingAs: string;
}

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
    <div className="sticky top-0 z-40 bg-gradient-to-r from-amber-500 to-amber-600 text-amber-50 shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm min-w-0">
          <Eye size={16} className="shrink-0" />
          <p className="truncate">
            <span className="font-semibold">Viewing as {actingAs}</span>{" "}
            <span className="text-amber-100">— admin permissions are paused while in this mode.</span>
          </p>
        </div>
        <button
          onClick={stop}
          disabled={busy}
          className="text-xs font-medium bg-white/15 hover:bg-white/25 border border-white/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-60"
        >
          <ShieldCheck size={13} /> Stop & restore admin
          <X size={12} className="opacity-60" />
        </button>
      </div>
    </div>
  );
}
