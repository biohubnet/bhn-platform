"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, AlertCircle, ArrowRight, ShieldCheck, Clock, MapPin, Users, Bus, Check,
} from "lucide-react";
import { MAX_WORKSHOPS_PER_USER } from "@/lib/events/constants";

/** Shape of a workshop option threaded in from the SSR register page. */
export interface WorkshopOption {
  id: string;
  title: string;
  shortDescription: string | null;
  kind: string; // workshop | tour | bootcamp
  partnerOrganization: string | null;
  locationName: string | null;
  requiresTransport: boolean;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  timeLabel: string;
  dayKey: string;   // stable ISO date string, for grouping
  dayLabel: string; // human label per day, e.g. "Monday, October 27"
}

interface Props {
  slug: string;
  workshops: WorkshopOption[];
}

const ATTENDEE_TYPES: { value: string; label: string; description: string }[] = [
  { value: "trainee",  label: "BHN Trainee",         description: "Currently enrolled in BHN training" },
  { value: "industry", label: "Industry",            description: "Working in biomanufacturing or life sciences" },
  { value: "academic", label: "Academic / faculty",  description: "University faculty or research staff" },
  { value: "student",  label: "Student",             description: "Undergrad, master's, PhD, or postdoc (not a BHN trainee yet)" },
  { value: "sponsor",  label: "Sponsor / partner",   description: "Representing a sponsoring or partner organization" },
  { value: "guest",    label: "Guest",               description: "Other — invited speaker, panelist, observer" },
];

/**
 * Symposium registration form.
 *
 * Fields
 *   • attendeeType          radio cards — required
 *   • includesSymposiumDay  checkbox (default true) — some attendees only
 *                            come for the Training Week workshops
 *   • workshopIds           up to 2 of the optional workshop pickers below.
 *                            Skippable; users can come back later from
 *                            their event dashboard. When the slot is full
 *                            the action flips to "Join waitlist".
 *   • dietaryRestrictions   free text, optional (catering planning)
 *   • accessibilityNeeds    textarea, optional (wheelchair, ASL, etc.)
 *
 * On success: POST → returns ok → router.push to success page where
 * the QR + next steps live. Idempotent on server side — re-submitting
 * an existing registration returns the same row and the success
 * page renders normally.
 */
export function RegistrationForm({ slug, workshops }: Props) {
  const router = useRouter();
  const [attendeeType, setAttendeeType] = useState<string>("trainee");
  const [includesSymposiumDay, setIncludesSymposiumDay] = useState(true);
  const [pickedWorkshops, setPickedWorkshops] = useState<Set<string>>(new Set());
  const [dietary, setDietary] = useState("");
  const [accessibility, setAccessibility] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group workshops by day for rendering. Memoised so re-renders on
  // every checkbox click stay cheap.
  const grouped = useMemo(() => {
    const byDay = new Map<string, { label: string; items: WorkshopOption[] }>();
    for (const w of workshops) {
      const bucket = byDay.get(w.dayKey) ?? { label: w.dayLabel, items: [] };
      bucket.items.push(w);
      byDay.set(w.dayKey, bucket);
    }
    return Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [workshops]);

  const atCap = pickedWorkshops.size >= MAX_WORKSHOPS_PER_USER;

  function toggleWorkshop(id: string) {
    setPickedWorkshops((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_WORKSHOPS_PER_USER) return prev;
        next.add(id);
      }
      return next;
    });
  }

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
          workshopIds: Array.from(pickedWorkshops),
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
                  <span className={`block text-sm font-semibold leading-tight ${checked ? "text-brand-800" : "text-fg"}`}>
                    {t.label}
                  </span>
                  <span className={`block text-[11px] leading-snug mt-0.5 ${checked ? "text-brand-700/80" : "text-muted"}`}>
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

      {/* Workshop picker — only rendered when workshops exist for the
          event. Empty array means no active Training Week slots, in
          which case we hide this section entirely. */}
      {workshops.length > 0 && (
        <fieldset className="space-y-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <legend className="text-sm font-bold text-fg">
                Training Week workshops &amp; tours
              </legend>
              <p className="text-xs text-muted mt-1 leading-snug">
                Optional — pick up to {MAX_WORKSHOPS_PER_USER}. You can change
                your picks later from your event dashboard.
              </p>
            </div>
            <p className="text-xs font-mono tabular-nums">
              <span className={atCap ? "text-brand-700 font-bold" : "text-fg font-semibold"}>
                {pickedWorkshops.size} / {MAX_WORKSHOPS_PER_USER}
              </span>{" "}
              <span className="text-subtle">picked</span>
            </p>
          </div>

          <div className="space-y-5">
            {grouped.map(([dayKey, group]) => (
              <section key={dayKey}>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle mb-2">
                  {group.label}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {group.items.map((w) => {
                    const picked = pickedWorkshops.has(w.id);
                    const isFull = w.confirmedCount >= w.capacity;
                    // Disable a card iff we're at cap AND this one isn't
                    // picked — we still need the picked cards toggleable
                    // so the user can swap their selections.
                    const disabled = busy || (atCap && !picked);
                    return (
                      <label
                        key={w.id}
                        className={`relative flex flex-col gap-2 p-3.5 rounded-xl border transition-colors ${
                          picked
                            ? "border-brand-400 bg-brand-50 ring-1 ring-brand-300"
                            : disabled
                              ? "border-line bg-card opacity-50 cursor-not-allowed"
                              : "border-line bg-card hover:bg-elevated cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={picked}
                          onChange={() => toggleWorkshop(w.id)}
                          disabled={disabled}
                          className="sr-only"
                        />
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-800 ring-1 ring-inset ring-brand-200">
                                {w.kind}
                              </span>
                              {w.partnerOrganization && (
                                <span className="text-[10px] font-semibold text-muted">
                                  {w.partnerOrganization}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm font-bold leading-tight mt-1 ${picked ? "text-brand-900" : "text-fg"}`}>
                              {w.title}
                            </p>
                          </div>
                          {/* Faux-checkbox visual on the right */}
                          <span
                            aria-hidden
                            className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ${
                              picked
                                ? "bg-brand-600 border-brand-600 text-white"
                                : "bg-card border-line"
                            }`}
                          >
                            {picked && <Check size={12} strokeWidth={3} />}
                          </span>
                        </div>

                        {w.shortDescription && (
                          <p className={`text-[11px] leading-snug ${picked ? "text-brand-800/80" : "text-muted"}`}>
                            {w.shortDescription}
                          </p>
                        )}

                        <dl className="text-[11px] flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                          <Meta icon={Clock} picked={picked}>{w.timeLabel}</Meta>
                          <Meta icon={MapPin} picked={picked}>{w.locationName ?? "TBA"}</Meta>
                          <Meta icon={Users} picked={picked}>
                            <span className={isFull ? "text-amber-700 font-bold" : ""}>
                              {w.confirmedCount} / {w.capacity}
                            </span>
                            {isFull && (
                              <span className="text-amber-700 font-semibold"> · waitlist</span>
                            )}
                            {w.waitlistCount > 0 && !isFull && (
                              <span className="text-amber-700"> · {w.waitlistCount} waiting</span>
                            )}
                          </Meta>
                          {w.requiresTransport && (
                            <Meta icon={Bus} picked={picked}>Bus from venue</Meta>
                          )}
                        </dl>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {atCap && (
            <p className="text-[11px] text-brand-700 leading-snug">
              You've picked the maximum of {MAX_WORKSHOPS_PER_USER}. Untick one
              to swap.
            </p>
          )}
        </fieldset>
      )}

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

      <div className="flex items-center gap-3 pt-2 flex-wrap">
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

function Meta({
  icon: Icon, picked, children,
}: {
  icon: React.ElementType;
  picked: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${picked ? "text-brand-800" : "text-fg"}`}>
      <Icon size={11} className={picked ? "text-brand-700" : "text-subtle"} />
      {children}
    </span>
  );
}
