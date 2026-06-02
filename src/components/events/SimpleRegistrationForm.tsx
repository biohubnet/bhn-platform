"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowRight, ShieldCheck, LogIn } from "lucide-react";
import Link from "next/link";

/**
 * SimpleRegistrationForm — the lean registration form used for:
 *   • Guest registrations (no platform account; only path available
 *     for unauthenticated visitors).
 *   • Signed-in users registering for a simple-session event (no
 *     workshops / no symposium agenda — e.g. an online info session).
 *
 * The rich symposium form (`RegistrationForm.tsx`) is still used for
 * signed-in users registering for full-shape events with workshop
 * picks and breakout selection. This file intentionally stays small:
 * it's the fast path.
 *
 * Submits to POST /api/events/[slug]/register. When `signedInUser`
 * is provided, the body includes only attendeeType / dietary /
 * accessibility (the server pulls name + email from the session).
 * When it's null, the body includes guestName / guestEmail /
 * guestOrganization too — the server creates a guest Registration
 * with no userId.
 */

interface Props {
  slug: string;
  /** Whether the parent event has requiresApproval = true. Drives the
   *  banner copy + button label so the user knows their spot isn't
   *  locked in immediately. */
  requiresApproval: boolean;
  /** Present when the visitor is signed in — pre-fills the contact
   *  fields and switches the form to the signed-in submission path.
   *  Null = guest path: collect name + email up front. */
  signedInUser: { name: string | null; email: string } | null;
  /** Admin-defined custom questions for this event. Rendered below
   *  the standard fields, in displayOrder. */
  customQuestions?: Array<{
    id: string;
    key: string;
    label: string;
    hint: string | null;
    kind: "text" | "longtext" | "select" | "multiselect" | "checkbox";
    options: Array<{ value: string; label: string }> | null;
    required: boolean;
  }>;
}

const ATTENDEE_TYPES = [
  { value: "guest",    label: "Just attending",   description: "Default — most attendees pick this" },
  { value: "trainee",  label: "BHN Trainee",      description: "Currently enrolled in BHN training" },
  { value: "industry", label: "Industry",         description: "Working in biomanufacturing or life sciences" },
  { value: "academic", label: "Academic / faculty", description: "University faculty or research staff" },
  { value: "student",  label: "Student",          description: "Undergrad, master's, PhD, or postdoc" },
  { value: "sponsor",  label: "Sponsor / partner", description: "Representing a sponsoring organization" },
] as const;

export function SimpleRegistrationForm({
  slug, requiresApproval, signedInUser, customQuestions = [],
}: Props) {
  const router = useRouter();
  const isGuest = !signedInUser;

  // Form state. Pre-fill from session when signed in.
  const [name, setName] = useState(signedInUser?.name ?? "");
  const [email, setEmail] = useState(signedInUser?.email ?? "");
  const [organization, setOrganization] = useState("");
  const [phone, setPhone] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [attendeeType, setAttendeeType] = useState<string>("guest");
  const [dietary, setDietary] = useState("");
  const [accessibility, setAccessibility] = useState("");

  // Custom-question answers keyed by questionId. Multiselect stores
  // an array; everything else stores a string.
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[]>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  // Required custom questions must have at least one answer.
  const customAnswersValid = customQuestions.every((q) => {
    if (!q.required) return true;
    const v = customAnswers[q.id];
    if (Array.isArray(v)) return v.length > 0;
    return typeof v === "string" && v.trim().length > 0;
  });
  const canSubmit =
    !submitting &&
    (!isGuest || (name.trim().length > 0 && emailValid)) &&
    customAnswersValid;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // Serialise custom-question answers to the shape the API
      // expects: { questionId: stringValue }. Multiselect values are
      // joined as comma-separated; checkboxes are "yes"/"no".
      const customAnswersPayload: Record<string, string> = {};
      for (const q of customQuestions) {
        const v = customAnswers[q.id];
        if (q.kind === "checkbox") {
          customAnswersPayload[q.id] = v === "yes" ? "yes" : "no";
          continue;
        }
        if (Array.isArray(v)) {
          if (v.length > 0) customAnswersPayload[q.id] = v.join(",");
          continue;
        }
        if (typeof v === "string" && v.trim()) {
          customAnswersPayload[q.id] = v.trim();
        }
      }

      const body: Record<string, unknown> = {
        attendeeType,
        dietaryRestrictions: dietary.trim() || undefined,
        accessibilityNeeds: accessibility.trim() || undefined,
        customAnswers:
          Object.keys(customAnswersPayload).length > 0 ? customAnswersPayload : undefined,
      };
      // Guest path → add the three guest fields. Signed-in path
      // doesn't send these; the API uses session info.
      if (isGuest) {
        body.guestName = name.trim();
        body.guestEmail = email.trim();
        if (organization.trim()) body.guestOrganization = organization.trim();
      }
      // SMS opt-in + phone — sent regardless of guest / signed-in
      // path. The API normalises to E.164 and only stores when both
      // phone is valid AND smsOptIn is true.
      if (phone.trim() && smsOptIn) {
        body.guestPhone = phone.trim();
        body.smsOptIn = true;
      }
      const res = await fetch(`/api/events/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        registration?: { qrToken?: string };
      };
      if (!res.ok || !json.ok) {
        setError(json.error || `Registration failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      // Pass the qrToken on the URL so the success page can render
      // the confirmation for guest registrants (who have no session
      // to look up by). Signed-in users see the same destination but
      // their success page also resolves via session lookup.
      const token = json.registration?.qrToken;
      const params = token ? `?token=${encodeURIComponent(token)}` : "";
      router.push(`/events/${slug}/register/success${params}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Sign-in suggestion for guests with an existing account */}
      {isGuest && (
        <div className="rounded-xl border border-line bg-elevated p-3.5 text-xs text-muted inline-flex items-center gap-2.5">
          <LogIn size={14} className="text-fg-subtle shrink-0" />
          <span>
            Already have a BioHubNet account?{" "}
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/events/${slug}/register`)}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              Sign in
            </Link>{" "}
            to use it. Or just register below — no account needed.
          </span>
        </div>
      )}

      {/* Pending-approval banner */}
      {requiresApproval && (
        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-sm text-amber-900 inline-flex items-start gap-2.5">
          <ShieldCheck size={16} className="shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">Pending admin approval.</span>{" "}
            Your registration is sent to the BHN events team — they'll confirm
            (usually within 1–2 business days) and you'll get a confirmation email.
          </span>
        </div>
      )}

      {/* Contact — only collected on guest path. Signed-in users
          have these from session and we'd just show readonly fields,
          which is more clutter than value. */}
      {isGuest && (
        <fieldset className="space-y-4">
          <legend className="text-xs uppercase tracking-[0.18em] font-bold text-fg-subtle">
            About you
          </legend>
          <Field label="Full name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
              required
              autoComplete="name"
            />
          </Field>
          <Field
            label="Email"
            required
            hint="We'll send your confirmation here."
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
              required
              autoComplete="email"
            />
          </Field>
          <Field label="Organization" hint="Optional. Your institution, company, or affiliation.">
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="University of Toronto"
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
              autoComplete="organization"
            />
          </Field>
        </fieldset>
      )}

      {/* SMS reminders — opt-in only. The phone field is enabled
          regardless, but the API only stores it + sends SMS when
          the checkbox is ticked. Available to both guests + signed-
          in users; for signed-in users with a User.phone already on
          file, the cron uses that fallback if this field is blank. */}
      <fieldset className="rounded-xl border border-line bg-card p-4 space-y-3">
        <legend className="text-xs uppercase tracking-[0.18em] font-bold text-fg-subtle px-1">
          Text reminders
        </legend>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={smsOptIn}
            onChange={(e) => setSmsOptIn(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-sm">
            <span className="font-semibold text-fg">Text me 1 day and 1 hour before the event</span>
            <span className="block text-xs text-muted mt-0.5">
              Optional. We'll only text these two reminders — no other messages, ever.
            </span>
          </span>
        </label>
        {smsOptIn && (
          <Field
            label="Mobile number"
            hint="Include country code (e.g. +1 416 555 1234). Standard carrier rates may apply."
          >
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 416 555 1234"
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm font-mono"
              autoComplete="tel"
            />
          </Field>
        )}
      </fieldset>

      {/* Attendee type */}
      <fieldset className="space-y-3">
        <legend className="text-xs uppercase tracking-[0.18em] font-bold text-fg-subtle">
          You are…
        </legend>
        <div className="space-y-2">
          {ATTENDEE_TYPES.map((t) => (
            <label
              key={t.value}
              className={`flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                attendeeType === t.value
                  ? "border-brand-500 bg-brand-50"
                  : "border-line bg-card hover:border-brand-200"
              }`}
            >
              <input
                type="radio"
                name="attendeeType"
                value={t.value}
                checked={attendeeType === t.value}
                onChange={() => setAttendeeType(t.value)}
                className="mt-1 shrink-0"
              />
              <div className="min-w-0">
                <p className={`text-sm font-bold ${attendeeType === t.value ? "text-brand-700" : "text-fg"}`}>
                  {t.label}
                </p>
                <p className="text-xs text-muted leading-snug">{t.description}</p>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Custom event-specific questions. Rendered inline (not in
          the optional details block) since they're explicitly opted
          in per event by the admin. */}
      {customQuestions.length > 0 && (
        <fieldset className="space-y-4">
          <legend className="text-xs uppercase tracking-[0.18em] font-bold text-fg-subtle">
            A few more questions
          </legend>
          {customQuestions.map((q) => (
            <CustomQuestionField
              key={q.id}
              question={q}
              value={customAnswers[q.id]}
              onChange={(v) => setCustomAnswers((prev) => ({ ...prev, [q.id]: v }))}
            />
          ))}
        </fieldset>
      )}

      {/* Optional accessibility + dietary fields. Hidden behind a
          short summary so the form doesn't look heavy for events
          where they don't matter (most info sessions). */}
      <details className="rounded-xl border border-line bg-card">
        <summary className="px-4 py-3 text-xs font-semibold text-fg-muted cursor-pointer hover:text-fg select-none">
          Accessibility or dietary needs? (optional)
        </summary>
        <div className="px-4 pb-4 space-y-3">
          <Field label="Dietary restrictions" hint="Optional. If meals are served at this event.">
            <input
              type="text"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="Vegetarian, nut allergy, etc."
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Accessibility needs" hint="Optional. Wheelchair access, hearing loop, captions, etc.">
            <input
              type="text"
              value={accessibility}
              onChange={(e) => setAccessibility(e.target.value)}
              placeholder="Anything we should know"
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </details>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 inline-flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 disabled:bg-elevated disabled:text-subtle disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
          {submitting
            ? "Registering…"
            : requiresApproval
              ? "Request a spot"
              : "Confirm my registration"}
          {!submitting && <ArrowRight size={14} />}
        </button>
      </div>
    </form>
  );
}

function CustomQuestionField({
  question,
  value,
  onChange,
}: {
  question: NonNullable<Props["customQuestions"]>[number];
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  const baseInputClass =
    "w-full bg-background border border-line rounded-lg px-3 py-2 text-sm";

  if (question.kind === "text") {
    return (
      <Field label={question.label} required={question.required} hint={question.hint ?? undefined}>
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClass}
          required={question.required}
        />
      </Field>
    );
  }
  if (question.kind === "longtext") {
    return (
      <Field label={question.label} required={question.required} hint={question.hint ?? undefined}>
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={`${baseInputClass} resize-y leading-relaxed`}
          required={question.required}
        />
      </Field>
    );
  }
  if (question.kind === "checkbox") {
    const checked = value === "yes";
    return (
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? "yes" : "no")}
          className="mt-0.5"
        />
        <span className="text-sm">
          <span className="font-semibold text-fg">
            {question.label}
            {question.required && <span className="text-rose-700 ml-1">*</span>}
          </span>
          {question.hint && <span className="block text-xs text-muted mt-0.5">{question.hint}</span>}
        </span>
      </label>
    );
  }
  if (question.kind === "select" && question.options) {
    return (
      <Field label={question.label} required={question.required} hint={question.hint ?? undefined}>
        <div className="space-y-2">
          {question.options.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-2.5 rounded-xl border-2 p-2.5 cursor-pointer transition-colors ${
                value === opt.value
                  ? "border-brand-500 bg-brand-50"
                  : "border-line bg-card hover:border-brand-200"
              }`}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                required={question.required}
              />
              <span className={`text-sm font-semibold ${value === opt.value ? "text-brand-700" : "text-fg"}`}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </Field>
    );
  }
  if (question.kind === "multiselect" && question.options) {
    const arr = Array.isArray(value) ? value : [];
    return (
      <Field label={question.label} required={question.required} hint={question.hint ?? undefined}>
        <div className="space-y-2">
          {question.options.map((opt) => {
            const checked = arr.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-2.5 rounded-xl border-2 p-2.5 cursor-pointer transition-colors ${
                  checked
                    ? "border-brand-500 bg-brand-50"
                    : "border-line bg-card hover:border-brand-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) onChange(arr.filter((v) => v !== opt.value));
                    else onChange([...arr, opt.value]);
                  }}
                />
                <span className={`text-sm font-semibold ${checked ? "text-brand-700" : "text-fg"}`}>
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      </Field>
    );
  }
  return null;
}

function Field({
  label, required, hint, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        {label}
        {required && <span className="text-red-600 normal-case tracking-normal">*</span>}
      </div>
      {children}
      {hint && <p className="text-xs text-subtle mt-1.5">{hint}</p>}
    </label>
  );
}
