"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertTriangle } from "lucide-react";

/**
 * Form state for /admin/events/[slug]. Mirrors the PATCH body schema
 * one-to-one — every key here corresponds to a single column on
 * BhnEvent. Date fields are <input type="datetime-local"> strings so
 * we can keep them as plain strings client-side and let the API
 * `new Date(v)` them on save.
 */
export interface EventBasicsForm {
  title: string;
  tagline: string;
  description: string;
  startDate: string;
  endDate: string;
  timezone: string;
  mainVenueName: string;
  mainVenueAddress: string;
  mainVenueMapUrl: string;
  coverImageUrl: string;
  accommodationInfo: string;
  status: "draft" | "published" | "archived";
  registrationOpensAt: string;
  registrationClosesAt: string;
}

export function EventBasicsEditor({
  slug,
  initial,
}: {
  slug: string;
  initial: EventBasicsForm;
}) {
  const router = useRouter();
  const [form, setForm] = useState<EventBasicsForm>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Track which fields have diverged from the initial snapshot so we
  // can disable Save when there's nothing to do, and so we can show a
  // small "unsaved" badge for orientation.
  const dirty = (Object.keys(form) as (keyof EventBasicsForm)[]).some(
    (k) => form[k] !== initial[k],
  );

  function update<K extends keyof EventBasicsForm>(key: K, value: EventBasicsForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Build a PATCH body of only changed fields. Empty strings become
    // null for nullable fields; the API handles the trim + null
    // coercion itself.
    const body: Record<string, unknown> = {};
    for (const key of Object.keys(form) as (keyof EventBasicsForm)[]) {
      if (form[key] === initial[key]) continue;
      const v = form[key];
      // datetime-local strings need to be turned into ISO so the API
      // can `new Date()` them consistently regardless of browser
      // locale. Treat empty as null for the optional registration
      // window only — startDate/endDate are NOT NULL.
      if (
        key === "startDate" ||
        key === "endDate" ||
        key === "registrationOpensAt" ||
        key === "registrationClosesAt"
      ) {
        if (typeof v === "string" && v === "") {
          body[key] = null;
        } else if (typeof v === "string") {
          body[key] = new Date(v).toISOString();
        }
      } else {
        body[key] = v === "" ? null : v;
      }
    }

    try {
      const res = await fetch(`/api/admin/events/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Save failed (${res.status})`);
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-fg tracking-tight">Event basics</h2>
        {dirty && (
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-700">
            Unsaved changes
          </span>
        )}
      </header>

      {/* Identity */}
      <Card title="Identity">
        <Field label="Title" required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Tagline" hint="One-line marketing hook shown on the landing-page hero.">
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => update("tagline", e.target.value)}
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Description" hint="Markdown supported. Rendered on the landing page.">
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={5}
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm font-mono leading-relaxed"
          />
        </Field>
        <Field label="Cover image" hint="Optional hero image. Upload a file (PNG/JPG/WebP, ≤ 8 MB) or paste any URL. Leave blank for the default brand gradient.">
          <CoverImageInput
            slug={slug}
            value={form.coverImageUrl}
            onChange={(url) => update("coverImageUrl", url)}
          />
        </Field>
      </Card>

      {/* Schedule */}
      <Card title="Schedule">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Start date &amp; time" required>
            <input
              type="datetime-local"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              required
              className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="End date &amp; time" required>
            <input
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => update("endDate", e.target.value)}
              required
              className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <Field label="Timezone" hint="IANA name, e.g. America/Toronto. Used for all date rendering.">
          <input
            type="text"
            value={form.timezone}
            onChange={(e) => update("timezone", e.target.value)}
            className="w-full sm:max-w-xs bg-bg border border-line rounded-lg px-3 py-2 text-sm font-mono"
          />
        </Field>
      </Card>

      {/* Venue */}
      <Card title="Main venue">
        <Field label="Venue name">
          <input
            type="text"
            value={form.mainVenueName}
            onChange={(e) => update("mainVenueName", e.target.value)}
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Venue address">
          <input
            type="text"
            value={form.mainVenueAddress}
            onChange={(e) => update("mainVenueAddress", e.target.value)}
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Google Maps URL" hint="Direct link used by the public landing page.">
          <input
            type="url"
            value={form.mainVenueMapUrl}
            onChange={(e) => update("mainVenueMapUrl", e.target.value)}
            placeholder="https://maps.google.com/…"
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Accommodation info" hint="Hotel block, travel tips, etc. Markdown supported.">
          <textarea
            value={form.accommodationInfo}
            onChange={(e) => update("accommodationInfo", e.target.value)}
            rows={4}
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm font-mono leading-relaxed"
          />
        </Field>
      </Card>

      {/* Publishing & registration window */}
      <Card title="Publishing">
        <Field label="Status" hint="draft hides the event publicly. published opens registration. archived freezes it.">
          <select
            value={form.status}
            onChange={(e) =>
              update("status", e.target.value as EventBasicsForm["status"])
            }
            className="w-full sm:max-w-xs bg-bg border border-line rounded-lg px-3 py-2 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Registration opens"
            hint="Optional. Blank = open whenever status=published."
          >
            <input
              type="datetime-local"
              value={form.registrationOpensAt}
              onChange={(e) => update("registrationOpensAt", e.target.value)}
              className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field
            label="Registration closes"
            hint="Optional. Blank = no auto-close."
          >
            <input
              type="datetime-local"
              value={form.registrationClosesAt}
              onChange={(e) => update("registrationClosesAt", e.target.value)}
              className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-4 py-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-rose-700 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-900 leading-snug">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3 sticky bottom-4 z-10">
        <button
          type="submit"
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed surface-shadow"
        >
          <Save size={14} />
          {saving ? "Saving…" : "Save changes"}
        </button>
        {savedFlash && (
          <span className="text-sm font-semibold text-emerald-700">Saved ✓</span>
        )}
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-line bg-card p-5 space-y-4 surface-shadow">
      <legend className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle px-2 -ml-2">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * Cover-image input — drag-and-drop file upload + URL fallback. The
 * upload endpoint persists immediately (bypassing the form's dirty/
 * save flow) so the new image is visible without an extra click; the
 * URL field then reflects the uploaded URL so the form save handler
 * treats it like a normal text change.
 */
function CoverImageInput({
  slug, value, onChange,
}: {
  slug: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFiles(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/events/${slug}/cover-image`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setUploadError(json.error ?? `Upload failed (${res.status})`);
        return;
      }
      onChange(json.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2.5">
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Cover preview"
          className="w-full max-w-md rounded-lg border border-line object-cover"
          style={{ aspectRatio: "16 / 9" }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-semibold text-fg hover:border-brand-300">
          {uploading ? "Uploading…" : "Upload file"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFiles(f);
              e.target.value = "";
            }}
          />
        </label>
        {value && (
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 hover:underline"
            onClick={() => onChange("")}
          >
            Remove
          </button>
        )}
      </div>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…or paste an image URL"
        className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm"
      />
      {uploadError && (
        <p className="text-xs text-rose-700">{uploadError}</p>
      )}
    </div>
  );
}

function Field({
  label, hint, required, children,
}: {
  label: React.ReactNode;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-fg">
        {label}
        {required && <span className="text-rose-700 ml-1">*</span>}
      </span>
      {hint && <span className="block text-[11px] text-subtle mt-0.5 leading-snug">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
