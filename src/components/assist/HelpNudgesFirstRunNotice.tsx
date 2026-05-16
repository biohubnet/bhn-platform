"use client";
/**
 * First-run notice banner for the Help-nudges feature.
 *
 * The Help-nudges pipeline is on-by-default (schema default for
 * AssistPreferences.consented is true). That removes the "discover
 * the toggle" hurdle but means we owe users a clear, dismissable
 * notice the first time they see a dashboard surface — so consent
 * is informed even when it's pre-checked.
 *
 * Contract
 *   • Renders only when localStorage flag `bhn-help-nudges-notice-v1`
 *     is missing AND the user is logged in (mounted inside the
 *     `(dashboard)` layout, which is already auth-gated).
 *   • "Got it" sets the flag and dismisses. Telemetry continues.
 *   • "Stop & turn off" sets the flag, PATCHes the preferences
 *     endpoint with `consented: false`, and dismisses.
 *   • If the prefs row already has consented = false (user
 *     previously opted out via /profile), we don't show the
 *     banner — we don't want to re-ask people who chose No.
 *
 * Visual
 *   Slim chip-style bar pinned to the top of the main content area
 *   in a subdued brand tint. Reads as informational, not as a
 *   blocking modal — never overlays the page.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X, Loader2 } from "lucide-react";

const FLAG_KEY = "bhn-help-nudges-notice-v1";

export function HelpNudgesFirstRunNotice() {
  // Tri-state: "loading" while we check localStorage + prefs,
  // "show" if we should render, "hidden" once the user dismisses.
  const [state, setState] = useState<"loading" | "show" | "hidden">("loading");
  const [busy, setBusy] = useState<null | "got-it" | "opt-out">(null);

  useEffect(() => {
    void (async () => {
      try {
        if (typeof window === "undefined") return;
        if (localStorage.getItem(FLAG_KEY)) {
          setState("hidden");
          return;
        }
        // Don't re-pester a user who already opted out via /profile.
        const res = await fetch("/api/assist/preferences", { cache: "no-store" });
        if (res.ok) {
          const prefs = (await res.json()) as { consented?: boolean };
          if (prefs.consented === false) {
            // They actively opted out — set the flag so we never
            // bother them again, then stay hidden.
            try { localStorage.setItem(FLAG_KEY, "skipped-opted-out"); } catch { /* */ }
            setState("hidden");
            return;
          }
        }
        setState("show");
      } catch {
        // Telemetry-style component — never error toward the page.
        setState("hidden");
      }
    })();
  }, []);

  function markSeen(reason: string) {
    try { localStorage.setItem(FLAG_KEY, reason); } catch { /* */ }
    setState("hidden");
  }

  async function gotIt() {
    setBusy("got-it");
    markSeen("got-it");
    setBusy(null);
  }

  async function optOut() {
    setBusy("opt-out");
    try {
      await fetch("/api/assist/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consented: false }),
      });
    } catch {
      // If the network call fails we still dismiss the banner —
      // the user can flip the toggle from /profile.
    }
    markSeen("opt-out");
    setBusy(null);
  }

  if (state !== "show") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 rounded-2xl border border-brand-200 bg-brand-50/70 text-brand-900 p-3 sm:p-4 flex items-start gap-3 surface-shadow"
    >
      <span className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
        <Sparkles size={14} />
      </span>
      <div className="flex-1 min-w-0 text-[12px] leading-relaxed">
        <p className="font-bold text-brand-900">
          Help nudges are on for you
        </p>
        <p className="text-brand-800 mt-0.5">
          BHN watches your click intent (no keystrokes, no field
          values, no screen recordings) so it can offer a single
          dismissable hint when you look stuck — wrong button,
          repeated error, abandoned form. You can turn it off
          anytime from{" "}
          <Link href="/profile" className="underline font-semibold">
            your profile
          </Link>
          ; the full audit lives at{" "}
          <Link href="/profile/assist-history" className="underline font-semibold">
            /profile/assist-history
          </Link>
          .
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            type="button"
            onClick={gotIt}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm shadow-brand-600/25 transition-colors"
          >
            {busy === "got-it" ? <Loader2 size={11} className="animate-spin" /> : null}
            Got it
          </button>
          <button
            type="button"
            onClick={optOut}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 bg-card-solid hover:bg-elevated border border-line text-fg text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {busy === "opt-out" ? <Loader2 size={11} className="animate-spin" /> : null}
            Stop &amp; turn off
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={gotIt}
        aria-label="Dismiss notice"
        className="shrink-0 w-7 h-7 rounded-lg text-brand-700 hover:text-brand-900 hover:bg-brand-100 flex items-center justify-center transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  );
}
