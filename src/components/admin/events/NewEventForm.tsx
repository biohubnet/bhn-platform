"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Save,
  ArrowLeft,
  AlertTriangle,
  Calendar,
  MapPin,
  TextCursorInput,
  CheckCircle2,
  Info,
  Video,
  Building2,
} from "lucide-react";

/**
 * /admin/events/new — create a new BhnEvent.
 *
 * The minimum-viable shape: slug + title + dates + (optional) venue.
 * Everything else (cover image, accommodation copy, registration
 * window, sub-program agenda) is edited on /admin/events/[slug]
 * after creation via the existing EventBasicsEditor. That keeps the
 * "new" flow short and focused — the goal is to land on the detail
 * page with a row to edit, not to fill in every field on day one.
 *
 * Date / time inputs are SPLIT (not a single datetime-local) so the
 * UI can offer a "one-day event" checkbox next to the end side that
 * collapses the end-date field and reuses the start date.
 *
 * Venue UI toggles between IN-PERSON (name + address) and ONLINE
 * (meeting URL — optional, can be left blank and shared later). The
 * data model doesn't carry an explicit "isOnline" column; instead
 * online events store venue name = "Online" and the meeting link
 * goes into `mainVenueMapUrl`. Downstream pages can detect online
 * mode by looking at the venue name.
 */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Pick a "blank-slate" default — ~6 weeks out at 09:00 local time. */
function defaultStartParts(): { date: string; time: string } {
  const d = new Date();
  d.setDate(d.getDate() + 42);
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: "09:00",
  };
}

/** Combine date + time strings (YYYY-MM-DD + HH:mm) into an ISO string
 *  using the user's local timezone interpretation. */
function combineToISO(date: string, time: string): string | null {
  if (!date || !time) return null;
  const dt = new Date(`${date}T${time}`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

export function NewEventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");

  // Date / time — separated so we can offer a one-day-event toggle
  // that hides the end date field and reuses the start date.
  const startInit = defaultStartParts();
  const [startDateOnly, setStartDateOnly] = useState(startInit.date);
  const [startTime, setStartTime] = useState(startInit.time);
  const [endDateOnly, setEndDateOnly] = useState(startInit.date);
  const [endTime, setEndTime] = useState("17:00");
  const [oneDayEvent, setOneDayEvent] = useState(true);

  const [timezone, setTimezone] = useState("America/Toronto");

  // Venue — in-person vs. online. Online events store the meeting
  // link in mainVenueMapUrl and set venue name to "Online" by default
  // (overridable by the user, e.g. "Zoom Webinar" or "Microsoft Teams").
  const [venueMode, setVenueMode] = useState<"in-person" | "online">("in-person");
  const [mainVenueName, setMainVenueName] = useState("");
  const [mainVenueAddress, setMainVenueAddress] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");

  const [requiresApproval, setRequiresApproval] = useState(true);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  // Capacity — empty string means "uncapped" (no maxAttendees set).
  // Numeric strings become integers at submit time.
  const [maxAttendees, setMaxAttendees] = useState<string>("");
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-derive slug from title until the user manually edits it.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  // When one-day event is ON, force endDateOnly to mirror startDateOnly.
  useEffect(() => {
    if (oneDayEvent) setEndDateOnly(startDateOnly);
  }, [oneDayEvent, startDateOnly]);

  // If user moves startDate past endDate, drag endDate along (multi-day case).
  useEffect(() => {
    if (oneDayEvent) return;
    if (
      endDateOnly &&
      startDateOnly &&
      new Date(`${endDateOnly}T${endTime || "00:00"}`).getTime() <
        new Date(`${startDateOnly}T${startTime || "00:00"}`).getTime()
    ) {
      setEndDateOnly(startDateOnly);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDateOnly, startTime]);

  const startISO = combineToISO(startDateOnly, startTime);
  const endISO = combineToISO(oneDayEvent ? startDateOnly : endDateOnly, endTime);
  const slugValid = slug.length >= 3 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  const titleValid = title.trim().length > 0;
  const datesValid =
    !!startISO &&
    !!endISO &&
    new Date(endISO).getTime() >= new Date(startISO).getTime();
  const canSubmit = slugValid && titleValid && datesValid && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    // Venue payload — in-person uses name+address as before; online
    // routes the meeting link into mainVenueMapUrl and defaults the
    // visible name to "Online" if the admin didn't customise it.
    let venuePayload: {
      mainVenueName?: string;
      mainVenueAddress?: string;
      mainVenueMapUrl?: string;
    } = {};
    if (venueMode === "in-person") {
      venuePayload = {
        mainVenueName: mainVenueName.trim() || undefined,
        mainVenueAddress: mainVenueAddress.trim() || undefined,
      };
    } else {
      venuePayload = {
        mainVenueName: mainVenueName.trim() || "Online",
        mainVenueMapUrl: meetingUrl.trim() || undefined,
      };
    }

    // Capacity — empty / 0 / non-numeric → null (uncapped).
    const maxAttendeesNum = (() => {
      const t = maxAttendees.trim();
      if (!t) return null;
      const n = parseInt(t, 10);
      if (Number.isNaN(n) || n <= 0) return null;
      return n;
    })();

    const body = {
      slug,
      title: title.trim(),
      tagline: tagline.trim() || undefined,
      description: description.trim() || undefined,
      startDate: startISO,
      endDate: endISO,
      timezone: timezone.trim() || undefined,
      ...venuePayload,
      requiresApproval,
      status,
      maxAttendees: maxAttendeesNum,
      waitlistEnabled,
    };

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        slug?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error || `Failed to create event (${res.status})`);
        setSaving(false);
        return;
      }
      router.push(`/admin/events/${json.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Identity */}
      <Section
        icon={TextCursorInput}
        title="Identity"
        hint="The title and URL slug. The slug auto-fills from the title until you type into it yourself."
      >
        <Field label="Title" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="2026 BHN Annual Symposium"
            className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
            autoFocus
            required
          />
        </Field>
        <Field label="URL slug" required hint={`/events/${slug || "<slug>"}`}>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            placeholder="2026-annual-symposium"
            className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm font-mono"
            required
          />
          {!slugValid && slug.length > 0 && (
            <p className="text-xs text-red-600 mt-1.5">
              Slug must be at least 3 characters, kebab-case (lowercase + numbers + single hyphens).
            </p>
          )}
        </Field>
        <Field
          label="Tagline"
          hint="One-line marketing description shown on the hero. Optional."
        >
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Two days of biomanufacturing talks, workshops, and trainee posters."
            className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        <Field
          label="Description"
          hint="Markdown. Optional — edit after creation if you want to compose it later."
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A two-day gathering for biotech trainees, employers, and partners across the BHN network..."
            rows={4}
            className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm leading-relaxed resize-y"
          />
        </Field>
      </Section>

      {/* When */}
      <Section
        icon={Calendar}
        title="When"
        hint="Date and time, separated so you can use the one-day toggle on the end side. Tick the one-day box for single-day events to skip filling in the end date."
      >
        {/* Start — date + time side by side */}
        <Field label="Start date and time" required>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <input
              type="date"
              value={startDateOnly}
              onChange={(e) => setStartDateOnly(e.target.value)}
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
              required
            />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="bg-background border border-line rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
        </Field>

        {/* End — date + time, with one-day toggle that hides the end date */}
        <div>
          <div className="flex items-center justify-between mb-1.5 gap-3">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
              End date and time <span className="text-red-600 normal-case tracking-normal">*</span>
            </div>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={oneDayEvent}
                onChange={(e) => setOneDayEvent(e.target.checked)}
                className="rounded"
              />
              <span>One-day event</span>
            </label>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <input
              type="date"
              value={oneDayEvent ? startDateOnly : endDateOnly}
              onChange={(e) => setEndDateOnly(e.target.value)}
              disabled={oneDayEvent}
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm disabled:bg-elevated disabled:text-subtle disabled:cursor-not-allowed"
              required={!oneDayEvent}
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-background border border-line rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          {oneDayEvent && (
            <p className="text-xs text-subtle mt-1.5 font-mono">
              End date locked to start date — uncheck above for multi-day events.
            </p>
          )}
        </div>

        {!datesValid && startISO && endISO && (
          <p className="text-xs text-red-600 mt-2 inline-flex items-center gap-1.5">
            <AlertTriangle size={12} /> End must be on or after start.
          </p>
        )}
        <Field
          label="Timezone"
          hint="IANA timezone identifier — defaults to America/Toronto."
        >
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="America/Toronto"
            className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
      </Section>

      {/* Where */}
      <Section
        icon={MapPin}
        title="Where"
        hint="In-person at a venue, or online via meeting link. The meeting link is optional — leave it blank and share it manually later if you prefer."
      >
        <div className="flex gap-2">
          <VenueModeOption
            mode="in-person"
            current={venueMode}
            onClick={() => setVenueMode("in-person")}
            label="In-person"
            hint="At a physical venue. Asks for venue name + address."
            Icon={Building2}
          />
          <VenueModeOption
            mode="online"
            current={venueMode}
            onClick={() => setVenueMode("online")}
            label="Online"
            hint="Virtual event. Optional meeting link — add later if not ready."
            Icon={Video}
          />
        </div>

        {venueMode === "in-person" ? (
          <>
            <Field label="Venue name">
              <input
                type="text"
                value={mainVenueName}
                onChange={(e) => setMainVenueName(e.target.value)}
                placeholder="MaRS Discovery District, Toronto"
                className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Venue address">
              <input
                type="text"
                value={mainVenueAddress}
                onChange={(e) => setMainVenueAddress(e.target.value)}
                placeholder="101 College Street, Toronto, ON M5G 1L7"
                className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
              />
            </Field>
          </>
        ) : (
          <>
            <Field
              label="Platform name"
              hint="What attendees see for the location. Defaults to &quot;Online&quot; if left blank."
            >
              <input
                type="text"
                value={mainVenueName}
                onChange={(e) => setMainVenueName(e.target.value)}
                placeholder="Zoom Webinar"
                className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
              />
            </Field>
            <Field
              label="Meeting link"
              hint="Optional. Leave blank to add later or send to attendees manually."
            >
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://zoom.us/j/123456789"
                className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm font-mono"
              />
            </Field>
          </>
        )}
      </Section>

      {/* Registration policy */}
      <Section
        icon={CheckCircle2}
        title="Registration policy"
        hint="You can tweak the registration window and approval flow later from the detail page."
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={requiresApproval}
            onChange={(e) => setRequiresApproval(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-sm">
            <span className="font-semibold text-fg">
              Require admin approval for each registration
            </span>
            <span className="block text-xs text-muted mt-0.5">
              When on, new registrations land as{" "}
              <code className="font-mono bg-elevated px-1 rounded">pending</code> until an
              admin approves them on{" "}
              <code className="font-mono bg-elevated px-1 rounded">
                /admin/events/{slug || "&lt;slug&gt;"}/registrations
              </code>
              . When off, registrations confirm immediately.
            </span>
          </span>
        </label>
        <Field label="Initial status">
          <div className="flex gap-2">
            <StatusOption
              value="draft"
              current={status}
              onClick={() => setStatus("draft")}
              label="Draft"
              hint="Hidden from /events. Edit + iterate before going live."
            />
            <StatusOption
              value="published"
              current={status}
              onClick={() => setStatus("published")}
              label="Published"
              hint="Live on /events immediately. Pick this if you've already prepared all the content elsewhere."
            />
          </div>
        </Field>
      </Section>

      {/* Capacity + waitlist */}
      <Section
        icon={CheckCircle2}
        title="Capacity"
        hint="Optional. Set a cap so registrations beyond it land on the waitlist (or are rejected outright). Leave blank for uncapped events like a typical symposium."
      >
        <Field
          label="Max attendees"
          hint="Leave blank for no cap. Workshops have their own per-slot caps regardless of this."
        >
          <input
            type="number"
            min={1}
            step={1}
            value={maxAttendees}
            onChange={(e) => setMaxAttendees(e.target.value)}
            placeholder="100"
            className="w-full sm:max-w-xs bg-background border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        {maxAttendees.trim() && (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={waitlistEnabled}
              onChange={(e) => setWaitlistEnabled(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-semibold text-fg">Open a waitlist when the cap is reached</span>
              <span className="block text-xs text-muted mt-0.5">
                When on, new registrations after the cap land as{" "}
                <code className="font-mono bg-elevated px-1 rounded">waitlist</code> with a position
                number — and auto-promote to confirmed when someone cancels. When off, those
                registrations are rejected with "event full".
              </span>
            </span>
          </label>
        )}
      </Section>

      {/* Note about what's next */}
      <div className="rounded-2xl border border-line bg-elevated p-4 text-xs text-muted flex gap-2.5">
        <Info size={14} className="text-brand-600 shrink-0 mt-0.5" />
        <p>
          After creating the event you'll land on{" "}
          <span className="font-mono text-fg">
            /admin/events/{slug || "&lt;slug&gt;"}
          </span>{" "}
          to edit cover image, accommodation info, and the registration window.
          Workshops, sessions, speakers, and sponsors are still managed through the
          seed file (<span className="font-mono text-fg">prisma/seed-events.ts</span>)
          until dedicated CRUD UIs ship.
        </p>
      </div>

      {/* Submit */}
      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 inline-flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg"
        >
          <ArrowLeft size={14} /> Cancel
        </Link>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 disabled:bg-elevated disabled:text-subtle disabled:cursor-not-allowed transition-colors"
        >
          <Save size={14} />
          {saving ? "Creating…" : "Create event"}
        </button>
      </div>
    </form>
  );
}

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ElementType;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-4 surface-shadow">
      <header>
        <h2 className="font-bold text-fg inline-flex items-center gap-2">
          <Icon size={15} className="text-brand-600" />
          {title}
        </h2>
        <p className="text-xs text-muted mt-1 leading-relaxed">{hint}</p>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  children,
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
      {hint && <p className="text-xs text-subtle mt-1.5 font-mono">{hint}</p>}
    </label>
  );
}

function StatusOption({
  value,
  current,
  onClick,
  label,
  hint,
}: {
  value: "draft" | "published";
  current: "draft" | "published";
  onClick: () => void;
  label: string;
  hint: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 text-left rounded-xl border-2 p-3 transition-colors ${
        active
          ? "border-brand-500 bg-brand-50"
          : "border-line bg-card hover:border-brand-200"
      }`}
    >
      <span className={`font-bold text-sm ${active ? "text-brand-700" : "text-fg"}`}>
        {label}
      </span>
      <span className="block text-xs text-muted mt-0.5 leading-snug">{hint}</span>
    </button>
  );
}

function VenueModeOption({
  mode,
  current,
  onClick,
  label,
  hint,
  Icon,
}: {
  mode: "in-person" | "online";
  current: "in-person" | "online";
  onClick: () => void;
  label: string;
  hint: string;
  Icon: React.ElementType;
}) {
  const active = current === mode;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 text-left rounded-xl border-2 p-3 transition-colors ${
        active
          ? "border-brand-500 bg-brand-50"
          : "border-line bg-card hover:border-brand-200"
      }`}
    >
      <span
        className={`inline-flex items-center gap-1.5 font-bold text-sm ${
          active ? "text-brand-700" : "text-fg"
        }`}
      >
        <Icon size={14} />
        {label}
      </span>
      <span className="block text-xs text-muted mt-0.5 leading-snug">{hint}</span>
    </button>
  );
}
