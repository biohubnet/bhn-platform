"use client";

/**
 * JobApplicationForm — public application form component.
 *
 * Submits to POST /api/jobs/[postingId]/apply. Shows a confirmation
 * card on success and inline error on failure. Fields are prefilled
 * from session when available.
 */

import { useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────

interface Props {
  postingId:      string;
  postingTitle:   string;
  companyName:    string;
  prefilledName?: string;
  prefilledEmail?:string;
}

// ── Constants ────────────────────────────────────────────────────

const COVER_MIN = 100;
const COVER_MAX = 3000;

// ── Component ────────────────────────────────────────────────────

export function JobApplicationForm({
  postingId,
  postingTitle,
  companyName,
  prefilledName,
  prefilledEmail,
}: Props) {
  const [name,       setName]       = useState(prefilledName  ?? "");
  const [email,      setEmail]      = useState(prefilledEmail ?? "");
  const [phone,      setPhone]      = useState("");
  const [coverLetter,setCoverLetter]= useState("");
  const [resumeUrl,  setResumeUrl]  = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const coverLen = coverLetter.length;
  const coverTooShort = coverLen > 0 && coverLen < COVER_MIN;
  const coverTooLong  = coverLen > COVER_MAX;
  const coverOk       = coverLen >= COVER_MIN && coverLen <= COVER_MAX;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!prefilledName && !name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!prefilledEmail && !email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (!coverOk) {
      setError(
        coverTooShort
          ? `Cover letter must be at least ${COVER_MIN} characters.`
          : `Cover letter must not exceed ${COVER_MAX} characters.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${postingId}/apply`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:        prefilledName  ?? name.trim(),
          email:       prefilledEmail ?? email.trim(),
          phone:       phone.trim()     || undefined,
          coverLetter: coverLetter.trim(),
          resumeUrl:   resumeUrl.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Submission failed.");
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ─────────────────────────────────────────────

  if (success) {
    return (
      <div className="rounded-2xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 p-8 text-center space-y-3">
        <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
        <h2 className="text-lg font-bold text-emerald-900">Application submitted</h2>
        <p className="text-sm text-emerald-700">
          The hiring team at <strong>{companyName}</strong> will be in touch about your
          application for <strong>{postingTitle}</strong>.
        </p>
        <a
          href="/jobs"
          className="inline-block mt-2 text-sm font-semibold text-emerald-700 hover:underline"
        >
          Browse more positions →
        </a>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-card border border-line shadow-card-rest p-6 space-y-5"
      noValidate
    >
      {/* Name — hidden if prefilled */}
      {!prefilledName && (
        <Field label="Full name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            required
            autoComplete="name"
            className={inputClass()}
          />
        </Field>
      )}

      {/* Email — hidden if prefilled */}
      {!prefilledEmail && (
        <Field label="Email address" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            required
            autoComplete="email"
            className={inputClass()}
          />
        </Field>
      )}

      {/* Prefill notice */}
      {(prefilledName || prefilledEmail) && (
        <p className="text-xs text-muted bg-elevated rounded-lg px-3 py-2 border border-line">
          Applying as{" "}
          <strong className="text-fg">{prefilledName}</strong>
          {prefilledEmail && (
            <> &lt;<span className="font-medium">{prefilledEmail}</span>&gt;</>
          )}
          .
        </p>
      )}

      {/* Phone (optional) */}
      <Field label="Phone number" hint="Optional">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 416 555 0100"
          autoComplete="tel"
          className={inputClass()}
        />
      </Field>

      {/* Cover letter */}
      <Field
        label="Cover letter"
        required
        hint={`${COVER_MIN}–${COVER_MAX} characters`}
      >
        <textarea
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          rows={8}
          required
          placeholder={`Tell the team at ${companyName} why you're a great fit for ${postingTitle}…`}
          className={cn(
            inputClass(),
            "resize-y leading-relaxed",
            coverTooShort && "border-amber-400 focus:border-amber-500 focus:ring-amber-400/40",
            coverTooLong  && "border-rose-400 focus:border-rose-500 focus:ring-rose-400/40",
          )}
        />
        {/* Character counter */}
        <div className="flex justify-between mt-1">
          <span className={cn(
            "text-[10px]",
            coverOk       ? "text-emerald-600"
            : coverTooShort ? "text-amber-600"
            : coverTooLong  ? "text-rose-600"
            : "text-muted",
          )}>
            {coverLen} / {COVER_MAX}
          </span>
          {coverLen > 0 && !coverOk && (
            <span className="text-[10px] text-muted">
              {coverTooShort
                ? `${COVER_MIN - coverLen} more character${COVER_MIN - coverLen !== 1 ? "s" : ""} needed`
                : `${coverLen - COVER_MAX} over limit`}
            </span>
          )}
        </div>
      </Field>

      {/* Resume URL (optional) */}
      <Field
        label="Resume / portfolio link"
        hint="Optional — Google Drive, Dropbox, or personal site"
      >
        <input
          type="url"
          value={resumeUrl}
          onChange={(e) => setResumeUrl(e.target.value)}
          placeholder="Link to your Google Drive, Dropbox, or portfolio"
          className={inputClass()}
        />
      </Field>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2 ring-1 ring-inset ring-rose-200">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand/90 disabled:opacity-50 transition-colors"
      >
        {submitting ? (
          <>Submitting…</>
        ) : (
          <>
            <Send size={15} />
            Submit application
          </>
        )}
      </button>

      <p className="text-[10px] text-muted text-center">
        By submitting, you consent to your information being shared with {companyName}.
      </p>
    </form>
  );
}

// ── Helper sub-components ─────────────────────────────────────────

function inputClass() {
  return "w-full text-sm px-3 py-2.5 rounded-lg bg-card border border-line focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand text-fg placeholder:text-muted transition-colors";
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label:     string;
  required?: boolean;
  hint?:     string;
  children:  React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-xs font-semibold text-fg">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[10px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
