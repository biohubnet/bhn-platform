"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const EXIT_REASONS: { value: string; label: string }[] = [
  { value: "found_job",        label: "I found a job" },
  { value: "career_change",    label: "My career direction changed" },
  { value: "not_relevant",     label: "The opportunities weren't a fit" },
  { value: "platform_quality", label: "Platform / experience issue" },
  { value: "found_elsewhere",  label: "I found opportunities elsewhere" },
  { value: "other",            label: "Other reason" },
];

interface State {
  reason: string;
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

const EMPTY: State = {
  reason: "",
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
 * Reusable feedback form rendered on the public /feedback/[token]
 * page. The exit-survey kind requires a `reason`; lighter survey
 * kinds (post-completion, nps_check, custom) hide the reason
 * radios and rely on the scale + text fields.
 */
export function FeedbackForm({ token, kind }: { token: string; kind: string }) {
  const isExitSurvey = kind === "exit_survey";
  const [state, setState] = useState<State>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isExitSurvey && !state.reason) {
      setError("Pick a reason for leaving.");
      return;
    }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/feedback/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: state.reason || "other",
          helpfulness: state.helpfulness === "" ? null : Number(state.helpfulness),
          partnerQuality: state.partnerQuality === "" ? null : Number(state.partnerQuality),
          platformExperience: state.platformExperience === "" ? null : Number(state.platformExperience),
          communicationFreq: state.communicationFreq === "" ? null : Number(state.communicationFreq),
          npsScore: state.npsScore === "" ? null : Number(state.npsScore),
          foundJob: state.foundJob,
          jobSource: state.jobSource.trim() || null,
          whatWorkedWell: state.whatWorkedWell.trim() || null,
          whatToImprove: state.whatToImprove.trim() || null,
          additionalComments: state.additionalComments.trim() || null,
          allowFollowUp: state.allowFollowUp,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-5 py-8 text-center">
        <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-3" />
        <p className="text-lg font-bold text-emerald-900">Thank you!</p>
        <p className="text-sm text-emerald-800 mt-1 leading-relaxed max-w-md mx-auto">
          We've recorded your feedback. The BHN team reads every response —
          your input directly shapes how we build for the next cohort.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {isExitSurvey && (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-bold text-fg mb-1">
            Why are you leaving the talent pool? <span className="text-rose-700">*</span>
          </legend>
          {EXIT_REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={state.reason === r.value}
                onChange={() => setState((s) => ({ ...s, reason: r.value }))}
                disabled={submitting}
                className="accent-brand-600"
              />
              <span className="text-sm text-fg">{r.label}</span>
            </label>
          ))}
        </fieldset>
      )}

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={state.foundJob}
          onChange={(e) => setState((s) => ({ ...s, foundJob: e.target.checked }))}
          disabled={submitting}
          className="mt-1 accent-brand-600"
        />
        <span className="flex-1">
          <span className="text-sm font-semibold text-fg">I found a job</span>
          <span className="block text-xs text-muted">If yes, share where below.</span>
        </span>
      </label>
      {state.foundJob && (
        <Field label="Where did you find it?">
          <input
            type="text"
            value={state.jobSource}
            onChange={(e) => setState((s) => ({ ...s, jobSource: e.target.value }))}
            disabled={submitting}
            placeholder="Company + channel (LinkedIn / direct / BHN partner / etc.)"
            className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
      )}

      <ScaleField label="How helpful was BioHubNet overall?"            hint="1 = not helpful · 10 = extremely helpful"      value={state.helpfulness}        min={1} max={10} onChange={(v) => setState((s) => ({ ...s, helpfulness: v }))} disabled={submitting} />
      <ScaleField label="Quality of partner opportunities you saw"     hint="1 = not relevant · 10 = exactly what I needed" value={state.partnerQuality}     min={1} max={10} onChange={(v) => setState((s) => ({ ...s, partnerQuality: v }))} disabled={submitting} />
      <ScaleField label="Platform experience (UX, courses, comms)"     hint="1 = frustrating · 10 = excellent"              value={state.platformExperience} min={1} max={10} onChange={(v) => setState((s) => ({ ...s, platformExperience: v }))} disabled={submitting} />
      <ScaleField label="Frequency of our communication with you"      hint="1 = wrong cadence · 10 = just right"            value={state.communicationFreq}  min={1} max={10} onChange={(v) => setState((s) => ({ ...s, communicationFreq: v }))} disabled={submitting} />
      <ScaleField label="How likely to recommend BHN to a colleague?"  hint="0 = not at all · 10 = extremely likely (NPS)"    value={state.npsScore}           min={0} max={10} onChange={(v) => setState((s) => ({ ...s, npsScore: v }))} disabled={submitting} />

      <Field label="What worked well?">
        <textarea value={state.whatWorkedWell} onChange={(e) => setState((s) => ({ ...s, whatWorkedWell: e.target.value }))} disabled={submitting} rows={3} maxLength={4000} className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="What would you change?">
        <textarea value={state.whatToImprove} onChange={(e) => setState((s) => ({ ...s, whatToImprove: e.target.value }))} disabled={submitting} rows={3} maxLength={4000} className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="Anything else?">
        <textarea value={state.additionalComments} onChange={(e) => setState((s) => ({ ...s, additionalComments: e.target.value }))} disabled={submitting} rows={2} maxLength={4000} className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm" />
      </Field>

      <label className="flex items-start gap-2 cursor-pointer pt-2 border-t border-line">
        <input
          type="checkbox"
          checked={state.allowFollowUp}
          onChange={(e) => setState((s) => ({ ...s, allowFollowUp: e.target.checked }))}
          disabled={submitting}
          className="mt-1 accent-brand-600"
        />
        <span className="flex-1">
          <span className="text-sm font-semibold text-fg">It's OK to follow up</span>
          <span className="block text-xs text-muted">We may reach out for a brief follow-up conversation. Off by default.</span>
        </span>
      </label>

      {error && (
        <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 flex items-start gap-2 text-xs text-rose-900">
          <AlertTriangle size={11} className="text-rose-700 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 text-white px-6 py-2.5 text-sm font-bold hover:bg-brand-700 disabled:opacity-50 shadow-md shadow-brand-600/25"
      >
        {submitting ? "Submitting…" : "Submit feedback"}
      </button>
    </form>
  );
}

function ScaleField({
  label, hint, value, min, max, onChange, disabled,
}: {
  label: string;
  hint?: string;
  value: number | "";
  min: number;
  max: number;
  onChange: (v: number | "") => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-fg">{label}</p>
      {hint && <p className="text-[11px] text-subtle">{hint}</p>}
      <div className="mt-2 flex items-center gap-1 flex-wrap">
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(active ? "" : n)}
              disabled={disabled}
              className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${
                active
                  ? "bg-brand-600 text-white"
                  : "bg-card border border-line text-muted hover:text-fg hover:border-brand-300"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-fg">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
