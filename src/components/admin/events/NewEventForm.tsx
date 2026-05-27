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
 * Slug auto-derives from title (lowercase, hyphenate, strip non-
 * alphanumerics) but is editable in case the auto-slug collides or
 * the admin wants a different shape. The auto-derive stops as soon
 * as the user manually edits the slug field — a one-way handshake.
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

function defaultStart(): string {
  // Default to ~6 weeks out, 9am — a sensible "blank slate" event time.
  const d = new Date();
  d.setDate(d.getDate() + 42);
  d.setHours(9, 0, 0, 0);
  return toLocalISO(d);
}

function defaultEnd(start: string): string {
  // Default end = same day, 5pm
  const d = new Date(start);
  d.setHours(17, 0, 0, 0);
  return toLocalISO(d);
}

/** Format a Date as `YYYY-MM-DDTHH:mm` for <input type="datetime-local">. */
function toLocalISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

export function NewEventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const startInit = defaultStart();
  const [startDate, setStartDate] = useState(startInit);
  const [endDate, setEndDate] = useState(defaultEnd(startInit));
  const [timezone, setTimezone] = useState("America/Toronto");
  const [mainVenueName, setMainVenueName] = useState("");
  const [mainVenueAddress, setMainVenueAddress] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-derive slug from title until the user manually edits it.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  // If the user shortens startDate past endDate, drag endDate along.
  useEffect(() => {
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      setEndDate(defaultEnd(startDate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate]);

  const slugValid = slug.length >= 3 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  const titleValid = title.trim().length > 0;
  const datesValid =
    startDate && endDate && new Date(endDate).getTime() >= new Date(startDate).getTime();
  const canSubmit = slugValid && titleValid && datesValid && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const body = {
      slug,
      title: title.trim(),
      tagline: tagline.trim() || undefined,
      description: description.trim() || undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      timezone: timezone.trim() || undefined,
      mainVenueName: mainVenueName.trim() || undefined,
      mainVenueAddress: mainVenueAddress.trim() || undefined,
      requiresApproval,
      status,
    };

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; slug?: string; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error || `Failed to create event (${res.status})`);
        setSaving(false);
        return;
      }
      // Land on the detail page so the admin can continue editing
      // cover image / accommodation copy / etc. via the existing
      // EventBasicsEditor.
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
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
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
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm font-mono"
            required
          />
          {!slugValid && slug.length > 0 && (
            <p className="text-xs text-red-600 mt-1.5">
              Slug must be at least 3 characters, kebab-case (lowercase + numbers + single hyphens).
            </p>
          )}
        </Field>
        <Field label="Tagline" hint="One-line marketing description shown on the hero. Optional.">
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Two days of biomanufacturing talks, workshops, and trainee posters."
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Description" hint="Markdown. Optional — edit after creation if you want to compose it later.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A two-day gathering for biotech trainees, employers, and partners across the BHN network..."
            rows={4}
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm leading-relaxed resize-y"
          />
        </Field>
      </Section>

      {/* When */}
      <Section
        icon={Calendar}
        title="When"
        hint="Dates and timezone. Multi-day events: set startDate to day one's morning and endDate to the last day's evening."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Start" required>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
              required
            />
          </Field>
          <Field label="End" required>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
              required
            />
          </Field>
        </div>
        {!datesValid && (
          <p className="text-xs text-red-600 mt-2 inline-flex items-center gap-1.5">
            <AlertTriangle size={12} /> End must be on or after start.
          </p>
        )}
        <Field label="Timezone" hint="IANA timezone identifier — defaults to America/Toronto.">
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="America/Toronto"
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
      </Section>

      {/* Where */}
      <Section
        icon={MapPin}
        title="Where"
        hint="Main venue. Workshop locations are managed per-workshop later — this is just the event-level headline location."
      >
        <Field label="Venue name">
          <input
            type="text"
            value={mainVenueName}
            onChange={(e) => setMainVenueName(e.target.value)}
            placeholder="MaRS Discovery District, Toronto"
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Venue address">
          <input
            type="text"
            value={mainVenueAddress}
            onChange={(e) => setMainVenueAddress(e.target.value)}
            placeholder="101 College Street, Toronto, ON M5G 1L7"
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
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
            <span className="font-semibold text-fg">Require admin approval for each registration</span>
            <span className="block text-xs text-muted mt-0.5">
              When on, new registrations land as <code className="font-mono bg-elevated px-1 rounded">pending</code> until an
              admin approves them on <code className="font-mono bg-elevated px-1 rounded">/admin/events/{slug || "&lt;slug&gt;"}/registrations</code>.
              When off, registrations confirm immediately.
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

      {/* Note about what's next */}
      <div className="rounded-2xl border border-line bg-elevated p-4 text-xs text-muted flex gap-2.5">
        <Info size={14} className="text-brand-600 shrink-0 mt-0.5" />
        <p>
          After creating the event you'll land on <span className="font-mono text-fg">/admin/events/{slug || "&lt;slug&gt;"}</span> to
          edit cover image, accommodation info, and the registration window.
          Workshops, sessions, speakers, and sponsors are still managed through the
          seed file (<span className="font-mono text-fg">prisma/seed-events.ts</span>) until
          dedicated CRUD UIs ship.
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
      <span className={`font-bold text-sm ${active ? "text-brand-700" : "text-fg"}`}>{label}</span>
      <span className="block text-xs text-muted mt-0.5 leading-snug">{hint}</span>
    </button>
  );
}
