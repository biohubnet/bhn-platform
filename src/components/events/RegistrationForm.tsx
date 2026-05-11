"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

interface Props {
  slug: string;
}

const ATTENDEE_TYPES: { value: string; label: string; description: string }[] = [
  {
    value: "trainee",
    label: "BHN Trainee",
    description: "Currently enrolled in BHN training",
  },
  {
    value: "industry",
    label: "Industry",
    description: "Working in biomanufacturing or life sciences",
  },
  {
    value: "academic",
    label: "Academic / faculty",
    description: "University faculty or research staff",
  },
  {
    value: "student",
    label: "Student",
    description: "Undergrad, master's, PhD, or postdoc (not a BHN trainee yet)",
  },
  {
    value: "sponsor",
    label: "Sponsor / partner",
    description: "Representing a sponsoring or partner organization",
  },
  {
    value: "guest",
    label: "Guest",
    description: "Other — invited speaker, panelist, observer",
  },
];

/**
 * Symposium registration form.
 *
 * Fields
 *   • attendeeType        radio cards — the only required field besides
 *                          the auth identity already on session
 *   • includesSymposiumDay checkbox (default true) — some attendees only
 *                          come for the Training Week workshops
 *   • dietaryRestrictions  free text, optional (catering planning)
 *   • accessibilityNeeds   textarea, optional (wheelchair, ASL, etc.)
 *
 * On success: POST → returns ok → router.push to success page where
 * the QR + next steps live. Idempotent on server side — re-submitting
 * an existing registration returns the same row and the success
 * page renders normally.
 */
export function RegistrationForm({ slug }: Props) {
  const router = useRouter();
  const [attendeeType, setAttendeeType] = useState<string>("trainee");
  const [includesSymposiumDay, setIncludesSymposiumDay] = useState(true);
  const [dietary, setDietary] = useState("");
  const [accessibility, setAccessibility] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeType,
          includesSymposiumDay,
          dietaryRestrictions: dietary.trim() || undefined,
          accessibilityNeeds: accessibility.trim() || undefined,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) throw new Error(j.error ?? "Registration failed");
      router.push(`/events/${slug}/register/success`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Attendee type */}
      <fieldset>
        <legend className="text-sm font-bold text-fg mb-3">
          Which best describes you?
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ATTENDEE_TYPES.map((t) => {
            const checked = attendeeType === t.value;
            return (
              <label
                key={t.value}
                className={`flex items-start gap-2 px-3 py-3 rounded-xl border cursor-pointer transition-colors ${
                  checked
                    ? "border-brand-400 bg-brand-50 ring-1 ring-brand-300"
                    : "border-line bg-card hover:bg-elevated"
                }`}
              >
                <input
                  type="radio"
                  name="attendeeType"
                  value={t.value}
                  checked={checked}
                  onChange={() => setAttendeeType(t.value)}
                  disabled={busy}
                  className="mt-0.5 accent-brand-600"
                />
                <span className="flex-1 min-w-0">
                  <span
                    className={`block text-sm font-semibold leading-tight ${
                      checked ? "text-brand-800" : "text-fg"
                    }`}
                  >
                    {t.label}
                  </span>
                  <span
                    className={`block text-[11px] leading-snug mt-0.5 ${
                      checked ? "text-brand-700/80" : "text-muted"
                    }`}
                  >
                    {t.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Symposium day toggle */}
      <fieldset className="rounded-xl border border-line bg-card p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={includesSymposiumDay}
            onChange={(e) => setIncludesSymposiumDay(e.target.checked)}
            disabled={busy}
            className="mt-0.5 accent-brand-600 w-4 h-4"
          />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-fg">
              Include the symposium day
            </span>
            <span className="block text-xs text-muted leading-snug mt-0.5">
              The final day at the main venue — keynote, panels, breakouts,
              pitch competition, networking reception. Uncheck if you're only
              attending Training Week workshops.
            </span>
          </span>
        </label>
      </fieldset>

      {/* Dietary */}
      <div>
        <label className="block text-sm font-semibold text-fg mb-1.5">
          Dietary restrictions{" "}
          <span className="font-normal text-subtle">(optional)</span>
        </label>
        <input
          type="text"
          value={dietary}
          onChange={(e) => setDietary(e.target.value)}
          disabled={busy}
          maxLength={500}
          placeholder="e.g. vegetarian · gluten-free · nut allergy"
          className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-60"
        />
        <p className="text-[11px] text-muted mt-1">
          Helps catering plan. Shared only with the BHN events team.
        </p>
      </div>

      {/* Accessibility */}
      <div>
        <label className="block text-sm font-semibold text-fg mb-1.5">
          Accessibility needs{" "}
          <span className="font-normal text-subtle">(optional)</span>
        </label>
        <textarea
          value={accessibility}
          onChange={(e) => setAccessibility(e.target.value)}
          disabled={busy}
          rows={3}
          maxLength={1000}
          placeholder="Wheelchair access · ASL interpreter · large-print materials · anything else we should plan for"
          className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-60 resize-y"
        />
      </div>

      {/* Consent note */}
      <div className="rounded-xl bg-elevated p-4 text-xs text-muted leading-relaxed">
        <ShieldCheck size={12} className="inline -mt-0.5 mr-1.5 text-brand-600" />
        Submitting this form creates an event registration tied to your BHN
        account. We use the contact details on your account to send
        confirmation and event updates. See our{" "}
        <a href="/privacy" className="text-brand-700 font-semibold hover:underline">
          privacy policy
        </a>{" "}
        for how we handle this data.
      </div>

      {error && (
        <div className="inline-flex items-start gap-2 text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2">
          <AlertCircle size={11} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-md shadow-brand-600/25"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {busy ? "Registering…" : "Confirm registration"}
          {!busy && <ArrowRight size={14} />}
        </button>
        <span className="text-xs text-subtle">Free for BHN trainees</span>
      </div>
    </form>
  );
}
