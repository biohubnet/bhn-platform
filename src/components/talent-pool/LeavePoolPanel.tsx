"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DoorOpen, CheckCircle2, AlertTriangle, X, ArrowRight,
} from "lucide-react";

const EXIT_REASONS: { value: string; label: string; hint?: string }[] = [
  { value: "found_job",        label: "I found a job",                                            hint: "Through BHN or otherwise — we'd love to know which." },
  { value: "career_change",    label: "My career direction changed" },
  { value: "not_relevant",     label: "The opportunities here aren't a fit for me" },
  { value: "platform_quality", label: "The platform / experience could be better",                hint: "Tell us — we read every response." },
  { value: "found_elsewhere",  label: "I found opportunities through another channel" },
  { value: "other",            label: "Other" },
];

interface FeedbackState {
  helpfulness: number | "";
  partnerQuality: number | "";
  platformExperience: number | "";
  communicationFreq: number | "";
  npsScore: number | "";
  foundJob: boolean;
  jobSource: string;
  whatWorkedWell: string;
  whatToImprove: string;
  additionalComments: string;
  allowFollowUp: boolean;
}

const EMPTY_FEEDBACK: FeedbackState = {
  helpfulness: "",
  partnerQuality: "",
  platformExperience: "",
  communicationFreq: "",
  npsScore: "",
  foundJob: false,
  jobSource: "",
  whatWorkedWell: "",
  whatToImprove: "",
  additionalComments: "",
  allowFollowUp: false,
};

/**
 * "Leave the talent pool" panel + exit-survey modal. Shown to
 * trainees on /forms/talent-application when their submission is
 * currently in the pool (approved + not already left).
 *
 * Flow
 *   1. User clicks "Leave the talent pool" → panel expands to reason
 *      radios.
 *   2. After picking a reason, two options:
 *      • Submit with feedback → opens the exit survey
 *      • Skip + leave now → leave + we mint a feedback invitation
 *        token they can come back to via /feedback/[token]
 */
export function LeavePoolPanel({
  alreadyLeft,
  inPool,
}: {
  alreadyLeft: boolean;
  inPool: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [feedback, setFeedback] = useState<FeedbackState>(EMPTY_FEEDBACK);
  const [showSurvey, setShowSurvey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (alreadyLeft) {
    return (
      <div className="rounded-2xl bg-slate-50 ring-1 ring-inset ring-slate-200 px-4 py-3 flex items-start gap-2">
        <CheckCircle2 size={14} className="text-slate-700 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-900 leading-snug">
          <strong>You've left the talent pool.</strong> Your application is no
          longer visible to industry partners. Resubmitting the form at any
          time will put you back in (subject to admin review).
        </p>
      </div>
    );
  }
  if (!inPool) return null;

  async function submitLeave(includeFeedback: boolean) {
    if (!reason) {
      setError("Pick a reason first.");
      return;
    }
    setSubmitting(true); setError(null);
    try {
      const body: Record<string, unknown> = { reason };
      if (includeFeedback) {
        body.feedback = {
          helpfulness: feedback.helpfulness === "" ? null : Number(feedback.helpfulness),
          partnerQuality: feedback.partnerQuality === "" ? null : Number(feedback.partnerQuality),
          platformExperience: feedback.platformExperience === "" ? null : Number(feedback.platformExperience),
          communicationFreq: feedback.communicationFreq === "" ? null : Number(feedback.communicationFreq),
          npsScore: feedback.npsScore === "" ? null : Number(feedback.npsScore),
          foundJob: feedback.foundJob,
          jobSource: feedback.jobSource.trim() || null,
          whatWorkedWell: feedback.whatWorkedWell.trim() || null,
          whatToImprove: feedback.whatToImprove.trim() || null,
          additionalComments: feedback.additionalComments.trim() || null,
          allowFollowUp: feedback.allowFollowUp,
        };
      } else {
        body.skipFeedback = true;
      }
      const res = await fetch("/api/profile/talent-pool/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string; invitationToken?: string | null;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to leave the pool");
      setSuccess(
        includeFeedback
          ? "You've left the talent pool. Thank you for the feedback!"
          : data.invitationToken
            ? `You've left the talent pool. If you want to share feedback later, use this link: /feedback/${data.invitationToken}`
            : "You've left the talent pool.",
      );
      setShowSurvey(false); setExpanded(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-4 py-3 flex items-start gap-2">
        <CheckCircle2 size={14} className="text-emerald-700 shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-900 leading-snug whitespace-pre-wrap">{success}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-line bg-card p-5 space-y-3 surface-shadow">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-fg inline-flex items-center gap-2">
              <DoorOpen size={14} className="text-muted" />
              Leave the talent pool
            </h3>
            <p className="text-xs text-muted leading-snug mt-1">
              Found a job? Changed direction? You can step out of the
              employer-visible directory at any time. You're welcome back
              whenever you want (just re-submit the form).
            </p>
          </div>
          {!expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-xs font-semibold text-muted hover:text-fg px-3 py-1.5 ring-1 ring-inset ring-line rounded-lg"
            >
              Leave pool…
            </button>
          )}
        </header>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-line">
            <fieldset className="space-y-1.5">
              <legend className="text-xs font-bold text-fg mb-1">
                Why are you leaving? (Required)
              </legend>
              {EXIT_REASONS.map((r) => (
                <label key={r.value} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="exit-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="mt-1 accent-brand-600"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm text-fg">{r.label}</span>
                    {r.hint && <span className="block text-[11px] text-subtle">{r.hint}</span>}
                  </span>
                </label>
              ))}
            </fieldset>

            {error && (
              <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 flex items-start gap-2 text-xs text-rose-900">
                <AlertTriangle size={11} className="text-rose-700 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap pt-1">
              <button
                type="button"
                disabled={!reason || submitting}
                onClick={() => setShowSurvey(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-bold hover:bg-brand-700 disabled:opacity-50"
              >
                Continue with feedback <ArrowRight size={12} />
              </button>
              <button
                type="button"
                disabled={!reason || submitting}
                onClick={() => startTransition(() => { void submitLeave(false); })}
                className="text-xs font-semibold text-muted hover:text-fg px-3 py-1.5 disabled:opacity-50"
              >
                Skip feedback &amp; leave
              </button>
              <button
                type="button"
                onClick={() => { setExpanded(false); setReason(""); }}
                disabled={submitting}
                className="text-xs text-subtle hover:text-fg ml-auto px-2 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {showSurvey && (
        <ExitSurveyModal
          reason={reason}
          feedback={feedback}
          setFeedback={setFeedback}
          onClose={() => setShowSurvey(false)}
          onSubmit={() => startTransition(() => { void submitLeave(true); })}
          submitting={submitting}
          error={error}
        />
      )}
    </>
  );
}

function ExitSurveyModal({
  reason, feedback, setFeedback, onClose, onSubmit, submitting, error,
}: {
  reason: string;
  feedback: FeedbackState;
  setFeedback: React.Dispatch<React.SetStateAction<FeedbackState>>;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-backdrop flex items-start sm:items-center justify-center p-4 sm:p-8 overflow-y-auto">
      <div className="bg-card border border-line rounded-2xl w-full max-w-2xl my-auto shadow-xl">
        <header className="flex items-center justify-between p-5 border-b border-line">
          <div>
            <h3 className="font-bold text-fg text-lg">Exit survey</h3>
            <p className="text-xs text-muted mt-0.5">
              Optional — but really helpful. Takes about 2 minutes.
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-fg p-1" aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Found job */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={feedback.foundJob}
              onChange={(e) => setFeedback((p) => ({ ...p, foundJob: e.target.checked }))}
              className="mt-1 accent-brand-600"
            />
            <span className="flex-1">
              <span className="text-sm font-semibold text-fg">I found a job</span>
              <span className="block text-xs text-muted leading-snug">
                If yes, tell us where below — helps us understand which channels work.
              </span>
            </span>
          </label>
          {feedback.foundJob && (
            <Field label="Where did you find it?">
              <input
                type="text"
                value={feedback.jobSource}
                onChange={(e) => setFeedback((p) => ({ ...p, jobSource: e.target.value }))}
                placeholder="Company name + how you found them (LinkedIn / direct outreach / BHN partner / etc.)"
                className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
              />
            </Field>
          )}

          {/* Scale ratings */}
          <div className="grid grid-cols-1 gap-2">
            <ScaleField
              label="How helpful was the BioHubNet platform overall?"
              hint="1 = not helpful · 10 = extremely helpful"
              value={feedback.helpfulness}
              min={1} max={10}
              onChange={(v) => setFeedback((p) => ({ ...p, helpfulness: v }))}
            />
            <ScaleField
              label="How would you rate the industry-partner opportunities?"
              hint="1 = not relevant · 10 = exactly what I needed"
              value={feedback.partnerQuality}
              min={1} max={10}
              onChange={(v) => setFeedback((p) => ({ ...p, partnerQuality: v }))}
            />
            <ScaleField
              label="How was the platform experience itself (UX, courses, communication)?"
              hint="1 = frustrating · 10 = excellent"
              value={feedback.platformExperience}
              min={1} max={10}
              onChange={(v) => setFeedback((p) => ({ ...p, platformExperience: v }))}
            />
            <ScaleField
              label="How was the frequency of our communication?"
              hint="1 = too much/too little · 10 = just right"
              value={feedback.communicationFreq}
              min={1} max={10}
              onChange={(v) => setFeedback((p) => ({ ...p, communicationFreq: v }))}
            />
            <ScaleField
              label="How likely are you to recommend BioHubNet to a colleague?"
              hint="0 = not likely at all · 10 = extremely likely (NPS)"
              value={feedback.npsScore}
              min={0} max={10}
              onChange={(v) => setFeedback((p) => ({ ...p, npsScore: v }))}
            />
          </div>

          {/* Free text */}
          <Field label="What worked well?" hint="What we should keep doing.">
            <textarea
              value={feedback.whatWorkedWell}
              onChange={(e) => setFeedback((p) => ({ ...p, whatWorkedWell: e.target.value }))}
              rows={3}
              maxLength={4000}
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="What would you change?" hint="What we should do differently for the next person.">
            <textarea
              value={feedback.whatToImprove}
              onChange={(e) => setFeedback((p) => ({ ...p, whatToImprove: e.target.value }))}
              rows={3}
              maxLength={4000}
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Anything else you want to share?">
            <textarea
              value={feedback.additionalComments}
              onChange={(e) => setFeedback((p) => ({ ...p, additionalComments: e.target.value }))}
              rows={2}
              maxLength={4000}
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
            />
          </Field>

          {/* Follow-up */}
          <label className="flex items-start gap-2 cursor-pointer pt-2 border-t border-line">
            <input
              type="checkbox"
              checked={feedback.allowFollowUp}
              onChange={(e) => setFeedback((p) => ({ ...p, allowFollowUp: e.target.checked }))}
              className="mt-1 accent-brand-600"
            />
            <span className="flex-1">
              <span className="text-sm font-semibold text-fg">It's OK to follow up</span>
              <span className="block text-xs text-muted leading-snug">
                If checked, we may reach out for a 15-min conversation about
                your experience. Off by default; entirely up to you.
              </span>
            </span>
          </label>

          {error && (
            <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 flex items-start gap-2 text-xs text-rose-900">
              <AlertTriangle size={11} className="text-rose-700 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 p-4 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-sm text-muted hover:text-fg px-3 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || !reason}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 text-white px-5 py-2 text-sm font-bold hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit & leave pool"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ScaleField({
  label, hint, value, min, max, onChange,
}: {
  label: string;
  hint?: string;
  value: number | "";
  min: number;
  max: number;
  onChange: (v: number | "") => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-fg">{label}</p>
      {hint && <p className="text-[11px] text-subtle leading-snug">{hint}</p>}
      <div className="mt-2 flex items-center gap-1 flex-wrap">
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(active ? "" : n)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                active
                  ? "bg-brand-600 text-white"
                  : "bg-background border border-line text-muted hover:text-fg hover:border-brand-300"
              }`}
            >
              {n}
            </button>
          );
        })}
        {value !== "" && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] text-subtle hover:text-fg px-2"
          >
            clear
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label, hint, children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-fg">{label}</span>
      {hint && <span className="block text-[11px] text-subtle leading-snug">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}
