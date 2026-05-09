"use client";
/**
 * Top-of-dashboard banner for users who haven't verified their email
 * yet. One-click "resend" through /api/auth/resend-verification, with
 * a dismiss-for-this-session that's stored in sessionStorage so the
 * banner doesn't follow them across every page navigation.
 *
 * Doesn't BLOCK access — that's controlled separately by the
 * BHN_REQUIRE_EMAIL_VERIFY env flag (when on, sign-in itself fails
 * for unverified users). This banner is the friendly nudge.
 */
import { useEffect, useState } from "react";
import { Mail, X, Check, AlertCircle, Loader2 } from "lucide-react";

const DISMISS_KEY = "bhn-verify-banner-dismissed";

export function UnverifiedEmailBanner({ email }: { email: string }) {
  const [hidden, setHidden] = useState(true); // start hidden until we read storage
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  useEffect(() => {
    setHidden(typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  async function resend() {
    setBusy(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <div className="sticky top-0 z-30 bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center gap-3">
        <Mail size={14} className="shrink-0 text-amber-700" />
        <span className="flex-1 min-w-0">
          {status === "sent" ? (
            <span className="inline-flex items-center gap-1.5">
              <Check size={13} /> Verification email re-sent to <strong>{email}</strong>. Check your inbox (and spam).
            </span>
          ) : status === "error" ? (
            <span className="inline-flex items-center gap-1.5">
              <AlertCircle size={13} /> Couldn&apos;t send right now. Please try again in a minute.
            </span>
          ) : (
            <>
              Please verify your email — we sent a link to{" "}
              <strong>{email}</strong>. Some features (talent applications, employer outreach) require a verified email.
            </>
          )}
        </span>
        <button
          type="button"
          onClick={resend}
          disabled={busy || status === "sent"}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 disabled:opacity-60"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
          Resend
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-amber-700 hover:text-amber-900 p-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
