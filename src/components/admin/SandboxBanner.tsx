"use client";
import { Beaker, Sparkles, Clock } from "lucide-react";

interface Props {
  kind: "sandbox" | "demo";
  expiresAt: string | null;
}

/**
 * Persistent slim banner that appears at the top of every dashboard
 * page when the signed-in account is a sandbox (admin's playground)
 * or demo (prospective partner's time-limited trial). Visually distinct
 * from the impersonation banner so the two don't blur together.
 */
export function SandboxBanner({ kind, expiresAt }: Props) {
  const isDemo = kind === "demo";
  const Icon = isDemo ? Sparkles : Beaker;
  const remaining = expiresAt ? formatRemaining(new Date(expiresAt)) : null;

  return (
    <div
      className={
        isDemo
          ? "sticky top-0 z-30 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md"
          : "sticky top-0 z-30 bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md"
      }
    >
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/20 shrink-0">
            <Icon size={14} />
          </span>
          <p className="truncate">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-white/20 border border-white/30 px-1.5 py-0.5 rounded mr-2">
              {isDemo ? "Demo workspace" : "Sandbox account"}
            </span>
            {isDemo
              ? "You're in a populated demo environment — feel free to click anything. Data resets when your trial ends."
              : "Signed in as a sandbox account — anything you do here is isolated and safe to wipe."}
          </p>
        </div>
        {remaining && (
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs bg-white/15 border border-white/25 px-2 py-1 rounded-md shrink-0">
            <Clock size={12} /> {remaining}
          </span>
        )}
      </div>
    </div>
  );
}

function formatRemaining(when: Date): string {
  const ms = when.getTime() - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}
