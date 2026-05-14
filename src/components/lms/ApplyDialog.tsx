"use client";
/**
 * Unified Apply dialog — works for every posting regardless of what
 * contact details the employer provided.
 *
 * One button → one modal → three rendered paths inside the modal,
 * chosen by what's present on the posting:
 *
 *   1. contactEmail present:
 *      Shows a "Send via email" primary action that opens the
 *      trainee's mail client with a pre-filled subject + pitch +
 *      resume / video URLs.
 *
 *   2. website present (no contactEmail):
 *      Shows an "Open employer site" primary action that opens the
 *      external URL in a new tab so the trainee can complete the
 *      employer's own form.
 *
 *   3. Neither:
 *      Shows an "Express interest" path — trainee writes a short
 *      cover note + (optional) checkbox to flag the BHN team to
 *      help reach out. No external nav step.
 *
 * In every case we POST /api/internships/[id]/apply so an
 * ApplicationStatus row lands at status="new" and the application
 * shows up on /profile/applications. The note + external-step are
 * optional layers on top of that single source of truth.
 *
 * The previous component (ApplyButtonClient) only rendered when the
 * posting had a contactEmail — so a third of the postings had no
 * apply CTA at all. This replaces it.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, CheckCircle2, ExternalLink, Loader2, Mail, X, Sparkles } from "lucide-react";

export interface Trainee {
  name: string | null;
  email: string;
  resumeUrl: string | null;
  videoIntroUrl: string | null;
  elevatorPitch: string | null;
}

interface Props {
  postingId: string;
  postingTitle: string;
  companyName: string;
  contactEmail: string | null;
  contactName: string | null;
  /** Already-normalized URL (https://…) or null. */
  websiteUrl: string | null;
  trainee: Trainee | null;
  alreadyApplied: boolean;
}

export function ApplyDialog({
  postingId, postingTitle, companyName,
  contactEmail, contactName, websiteUrl,
  trainee, alreadyApplied,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState(alreadyApplied);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string>("");

  const hasArtifacts = !!(trainee?.elevatorPitch || trainee?.resumeUrl || trainee?.videoIntroUrl);

  // Pick the primary mode based on what the employer provided. The
  // dialog always renders the Express-interest path as the underlying
  // BHN record; email / external are convenience layers on top.
  const mode: "email" | "website" | "express" = contactEmail
    ? "email"
    : websiteUrl
      ? "website"
      : "express";

  function buildMailto(): string {
    if (!contactEmail) return "";
    const subject = `[Application] ${postingTitle} — ${trainee?.name ?? "BHN candidate"}`;
    const greet = contactName ? `Hi ${contactName.split(",")[0].trim()},` : "Hello,";
    const lines: string[] = [
      greet,
      "",
      `I'd like to apply for the ${postingTitle} role at ${companyName}.`,
      "",
    ];
    if (note.trim()) {
      lines.push(note.trim(), "");
    }
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
    return `mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function record(includeNote: boolean): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/internships/${postingId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the note under both keys: `coverLetter` is the new
        // employer-visible field; `notes` keeps the trainee-private
        // surface for back-compat. Same text in both for now.
        body: JSON.stringify(
          includeNote && note.trim()
            ? { notes: note.trim(), coverLetter: note.trim() }
            : {},
        ),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Couldn't record on My applications.");
        return false;
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function doEmail() {
    const ok = await record(true);
    if (!ok) return;
    setApplied(true);
    setOpen(false);
    window.location.href = buildMailto();
    router.refresh();
  }

  async function doWebsite() {
    if (!websiteUrl) return;
    const ok = await record(true);
    if (!ok) return;
    setApplied(true);
    setOpen(false);
    window.open(websiteUrl, "_blank", "noopener,noreferrer");
    router.refresh();
  }

  async function doExpress() {
    const ok = await record(true);
    if (!ok) return;
    setApplied(true);
    setOpen(false);
    router.refresh();
  }

  if (applied) {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 text-sm font-semibold">
        <CheckCircle2 size={14} /> Applied · tracked on{" "}
        <Link href="/profile/applications" className="underline hover:no-underline">
          My applications
        </Link>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-colors"
      >
        <Briefcase size={14} /> Apply now
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="max-w-lg w-full bg-card rounded-2xl border border-line shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
                  Apply · {companyName}
                </p>
                <h3 className="text-base font-semibold text-fg mt-1 tracking-tight">
                  {postingTitle}
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="text-muted hover:text-fg p-1 rounded-lg hover:bg-elevated disabled:opacity-50"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Trainee artifact hint — nudges the trainee to build
                their application materials before applying, but
                never blocks them. */}
            {!hasArtifacts && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 inline-flex items-start gap-1.5">
                <Sparkles size={11} className="mt-0.5 shrink-0" />
                <span>
                  Tip:{" "}
                  <Link href="/profile/application" className="underline hover:no-underline font-semibold">
                    build your application materials
                  </Link>{" "}
                  first — your pitch + resume URL will be included automatically.
                </span>
              </p>
            )}

            {/* Optional cover note — pre-filled into the email body,
                stored on the BHN ApplicationStatus row, and shown to
                BHN admins in the Express-interest path. */}
            <label className="block">
              <span className="block text-xs font-semibold text-fg mb-1">
                Add a short note <span className="text-subtle font-normal">(optional)</span>
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={mode === "email"
                  ? "Anything to add to your email — why you'd be a good fit, when you can start."
                  : mode === "website"
                    ? "A short reminder for yourself, captured on My applications."
                    : "Why this role interests you. BHN can pass it on if the employer reaches out."}
                disabled={busy}
                className="w-full text-sm leading-relaxed text-fg bg-elevated rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/60 resize-y"
              />
            </label>

            {error && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-3">
                {error}
              </p>
            )}

            {/* Mode-specific footer */}
            <div className="mt-5 flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted leading-snug max-w-xs">
                {mode === "email" && <>Opens your mail client with your pitch pre-filled. We&apos;ll record this on{" "}
                  <Link href="/profile/applications" className="underline">My applications</Link>.</>}
                {mode === "website" && <>Opens the employer&apos;s site in a new tab. We&apos;ll record this on{" "}
                  <Link href="/profile/applications" className="underline">My applications</Link>.</>}
                {mode === "express" && <>No external email or website on this posting yet. We&apos;ll log your interest and the BHN team can connect you to the employer.</>}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted hover:text-fg hover:bg-elevated disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                {mode === "email" && (
                  <button
                    onClick={doEmail}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                    Send via email
                  </button>
                )}
                {mode === "website" && (
                  <button
                    onClick={doWebsite}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                    Open employer site
                  </button>
                )}
                {mode === "express" && (
                  <button
                    onClick={doExpress}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <Briefcase size={12} />}
                    Express interest
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
