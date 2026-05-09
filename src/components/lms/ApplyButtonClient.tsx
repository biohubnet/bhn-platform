"use client";
/**
 * "Send my application" button — the in-app apply CTA.
 *
 * On click:
 *   1. Builds a `mailto:` link with the trainee's elevator pitch +
 *      resume URL + video URL pre-filled in the body. Subject is
 *      "[Application] {posting.title} — {trainee.name}". The mail
 *      client opens via window.location.href.
 *   2. POSTs /api/internships/[id]/apply so BHN keeps an
 *      ApplicationStatus row (status="new") for /profile/applications
 *      tracking. Idempotent server-side.
 *   3. Updates local state to show an "Applied" pill and disables
 *      re-clicking.
 *
 * If the trainee hasn't built /profile/application yet we still let
 * them email — the body just doesn't include their pitch / URLs and
 * we surface a small "Build My Application first?" link.
 */
import { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";

interface Trainee {
  name: string | null;
  email: string;
  resumeUrl: string | null;
  videoIntroUrl: string | null;
  elevatorPitch: string | null;
}

export function ApplyButtonClient({
  postingId,
  contactEmail,
  contactName,
  postingTitle,
  companyName,
  trainee,
  alreadyApplied,
}: {
  postingId: string;
  contactEmail: string;
  contactName: string | null;
  postingTitle: string;
  companyName: string;
  trainee: Trainee | null;
  alreadyApplied: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(alreadyApplied);
  const [err, setErr] = useState<string | null>(null);

  const hasArtifacts = !!(trainee?.elevatorPitch || trainee?.resumeUrl || trainee?.videoIntroUrl);

  async function applyNow() {
    setBusy(true);
    setErr(null);
    try {
      const subject = `[Application] ${postingTitle} — ${trainee?.name ?? "BHN candidate"}`;
      const greet = contactName ? `Hi ${contactName.split(",")[0].trim()},` : "Hello,";
      const lines: string[] = [
        greet,
        "",
        `I'd like to apply for the ${postingTitle} role at ${companyName}.`,
        "",
      ];
      if (trainee?.elevatorPitch) {
        lines.push(trainee.elevatorPitch.trim(), "");
      }
      if (trainee?.resumeUrl || trainee?.videoIntroUrl) {
        lines.push("Materials:");
        if (trainee.resumeUrl) lines.push(`• Resume — ${trainee.resumeUrl}`);
        if (trainee.videoIntroUrl) lines.push(`• Video introduction — ${trainee.videoIntroUrl}`);
        lines.push("");
      }
      lines.push("Happy to schedule a chat at your convenience.");
      lines.push("");
      lines.push(trainee?.name ?? "(BHN trainee)");
      if (trainee?.email) lines.push(trainee.email);

      const body = lines.join("\n");
      const href = `mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      // Fire the BHN-side tracking write first so a slow mail-client
      // open doesn't strand us before the row lands. Then open the
      // mailto. Order matters: tracking call first, navigation second.
      const trackRes = await fetch(`/api/internships/${postingId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!trackRes.ok) {
        // Don't block the apply — just surface the issue.
        setErr("We couldn't record this on My applications, but your email will still send.");
      }
      window.location.href = href;
      setApplied(true);
    } catch (e) {
      setErr((e as Error).message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (applied) {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 text-sm font-semibold">
        <CheckCircle2 size={14} /> Marked as applied
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={applyNow}
        disabled={busy}
        className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-colors"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
        Send my application
      </button>
      {!hasArtifacts && (
        <p className="text-xs text-amber-700 inline-flex items-center gap-1">
          Tip:{" "}
          <Link href="/profile/application" className="underline hover:no-underline font-medium">
            build My Application first
          </Link>{" "}
          so your pitch + resume URL are pre-filled.
        </p>
      )}
      {err && <p className="text-xs text-rose-600">{err}</p>}
    </div>
  );
}
