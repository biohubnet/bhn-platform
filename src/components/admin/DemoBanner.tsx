"use client";
import { Sparkles } from "lucide-react";

interface Props {
  /** Only "demo" is supported now — the sandbox kind was retired. */
  kind: "demo";
  expiresAt: string | null;
}

/**
 * Persistent slim banner shown at the top of every dashboard page
 * when the signed-in account is a demo workspace (prospective partner
 * trial, magic-link spawned showcase trainee, etc.). The previous
 * SandboxBanner served both sandbox + demo; sandbox was retired in
 * favour of /admin/split-view, so this banner now handles the demo
 * case only.
 */
export function DemoBanner({ expiresAt }: Props) {
  const remaining = expiresAt ? formatRemaining(new Date(expiresAt)) : null;

  return (
    <div className="sticky top-0 z-30 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/20 shrink-0">
            <Sparkles size={14} />
          </span>
          <p className="truncate">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-white/20 border border-white/30 px-1.5 py-0.5 rounded mr-2">
              Demo workspace
            </span>
            You&apos;re in a populated demo environment — feel free to click
            anything. Data resets when your trial ends.
          </p>
        </div>
        {remaining && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium bg-white/15 ring-1 ring-inset ring-white/25 rounded-full px-2.5 py-0.5">
            {remaining}
          </span>
        )}
      </div>
    </div>
  );
}

function formatRemaining(at: Date): string {
  const ms = at.getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 2) return `${days} days remaining`;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 2) return `${hours} hours remaining`;
  const mins = Math.floor(ms / (60 * 1000));
  return `${mins} min remaining`;
}
