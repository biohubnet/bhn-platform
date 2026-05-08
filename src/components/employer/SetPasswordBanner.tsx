"use client";
/**
 * Employer-facing banner shown when the signed-in user has no password.
 * That's the case after a magic-link sign-in — the link IS the auth.
 * If the invite expires (default 14d) and they haven't set a password,
 * they get locked out of /login. Nudge them to set one once.
 *
 * Dismissible per-tab (sessionStorage) so it doesn't nag on every page.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bhn-set-pw-dismissed";

export function SetPasswordBanner({ className }: { className?: string }) {
  const [hidden, setHidden] = useState<boolean>(true);

  // Show after first paint so SSR doesn't flash it before hydration.
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY) === "1";
      if (!dismissed) setHidden(false);
    } catch {/* ignore */}
  }, []);

  function dismiss() {
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch {/* */}
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <div
      className={cn(
        "rounded-xl border bg-amber-50 border-amber-200 text-amber-900 px-4 py-3",
        "flex items-start gap-3 animate-fade-in",
        className,
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
        <KeyRound size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Set a password for cross-device sign-in</p>
        <p className="text-xs text-amber-800 mt-0.5 leading-relaxed max-w-2xl">
          You signed in via a magic link, which works as a bookmark until your invite expires. To sign in from a fresh browser via /login afterwards, set a password from your profile — takes a minute.
        </p>
        <Link
          href="/profile"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:underline"
        >
          Set password <ArrowRight size={11} />
        </Link>
      </div>
      <button
        onClick={dismiss}
        className="text-amber-700 hover:text-amber-900 p-1 rounded shrink-0"
        title="Dismiss for this session"
      >
        <X size={13} />
      </button>
    </div>
  );
}
