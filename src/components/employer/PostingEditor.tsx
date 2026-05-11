"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Save, Trash2, AlertCircle, CheckCircle2, MapPin, ExternalLink,
} from "lucide-react";

interface PostingForm {
  id: string;
  companyName: string;
  website: string | null;
  title: string;
  duration: string | null;
  hours: string | null;
  location: string | null;
  type: string | null;
  compensation: string | null;
  /** ISO string from the server; we convert to "yyyy-mm-dd" for the
   *  HTML date input and back to ISO when saving. */
  deadline: string | null;
  keySkills: string[];
  positionDetails: string;
  status: string;
  contactEmail: string | null;
  contactName: string | null;
  contactPhone: string | null;
}

const STATUS_OPTIONS = [
  { value: "active",  label: "Active — accepting applications" },
  { value: "closed",  label: "Closed — no more applications" },
  { value: "expired", label: "Expired — past deadline / off the board" },
  { value: "draft",   label: "Draft — not visible publicly" },
];

/**
 * Single-form editor for an InternshipPosting. The page that hosts
 * this is the canonical home of edit functionality — the listing
 * page does NOT include an edit affordance anymore (just status
 * cycling + bulk actions).
 *
 * Saves go through PATCH /api/employer/postings/[id] (ownership-
 * checked). Delete confirms inline then calls DELETE; on success
 * the user is bounced back to /employer/postings.
 */
export function PostingEditor({ posting }: { posting: PostingForm }) {
  const router = useRouter();

  const [form, setForm] = useState<PostingForm>(posting);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function patchForm<K extends keyof PostingForm>(key: K, value: PostingForm[K]) {
    setForm((cur) => ({ ...cur, [key]: value }));
    setSavedAt(null);
  }

  function addSkill() {
    const v = skillInput.trim();
    if (!v) return;
    if (form.keySkills.includes(v)) {
      setSkillInput("");
      return;
    }
    if (form.keySkills.length >= 5) {
      setError("Up to 5 key skills");
      return;
    }
    patchForm("keySkills", [...form.keySkills, v].slice(0, 5));
    setSkillInput("");
    setError(null);
  }

  function removeSkill(skill: string) {
    patchForm("keySkills", form.keySkills.filter((s) => s !== skill));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/employer/postings/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          website: form.website,
          title: form.title,
          duration: form.duration,
          hours: form.hours,
          location: form.location,
          type: form.type,
          compensation: form.compensation,
          deadline: form.deadline,
          keySkills: form.keySkills,
          positionDetails: form.positionDetails,
          status: form.status,
          contactEmail: form.contactEmail,
          contactName: form.contactName,
          contactPhone: form.contactPhone,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Save failed");
      setSavedAt(new Date());
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/employer/postings/${form.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Delete failed");
      }
      router.push("/employer/postings");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setDeleting(false);
    }
  }

  const dateForInput = form.deadline ? form.deadline.slice(0, 10) : "";
  const locationMapHref = form.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.location)}`
    : null;

  return (
    <div className="space-y-6">
      {/* Status + meta */}
      <Section title="Status & basics">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => patchForm("status", e.target.value)}
              disabled={saving}
              className={fieldClass}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Application deadline (optional)">
            <input
              type="date"
              value={dateForInput}
              onChange={(e) => patchForm("deadline", e.target.value ? new Date(e.target.value).toISOString() : null)}
              disabled={saving}
              className={fieldClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Field label="Posting title" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => patchForm("title", e.target.value)}
              disabled={saving}
              required
              maxLength={200}
              className={fieldClass}
            />
          </Field>
          <Field label="Company name" required>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => patchForm("companyName", e.target.value)}
              disabled={saving}
              required
              maxLength={120}
              className={fieldClass}
            />
          </Field>
        </div>

        <Field label="Company website (optional)" className="mt-4">
          <input
            type="url"
            value={form.website ?? ""}
            onChange={(e) => patchForm("website", e.target.value || null)}
            disabled={saving}
            placeholder="https://example.com"
            className={fieldClass}
          />
        </Field>
      </Section>

      {/* Logistics */}
      <Section title="Logistics">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Type">
            <input
              type="text"
              value={form.type ?? ""}
              onChange={(e) => patchForm("type", e.target.value || null)}
              disabled={saving}
              placeholder="Internship · Co-op · Full-time"
              className={fieldClass}
            />
          </Field>
          <Field label="Duration">
            <input
              type="text"
              value={form.duration ?? ""}
              onChange={(e) => patchForm("duration", e.target.value || null)}
              disabled={saving}
              placeholder="4 months · 1 year"
              className={fieldClass}
            />
          </Field>
          <Field label="Hours">
            <input
              type="text"
              value={form.hours ?? ""}
              onChange={(e) => patchForm("hours", e.target.value || null)}
              disabled={saving}
              placeholder="40/week"
              className={fieldClass}
            />
          </Field>
          <Field label="Compensation">
            <input
              type="text"
              value={form.compensation ?? ""}
              onChange={(e) => patchForm("compensation", e.target.value || null)}
              disabled={saving}
              placeholder="$24–28/hr · Stipend · Unpaid"
              className={fieldClass}
            />
          </Field>
        </div>

        <Field
          label={
            <>
              Location{" "}
              {locationMapHref && (
                <a
                  href={locationMapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-[11px] font-normal text-brand-700 hover:underline inline-flex items-center gap-0.5"
                >
                  <MapPin size={10} /> Open in maps <ExternalLink size={9} />
                </a>
              )}
            </>
          }
          className="mt-4"
        >
          <input
            type="text"
            value={form.location ?? ""}
            onChange={(e) => patchForm("location", e.target.value || null)}
            disabled={saving}
            placeholder="Toronto, ON · 144 College St · Remote (Canada)"
            className={fieldClass}
          />
        </Field>
      </Section>

      {/* Description */}
      <Section title="Description">
        <Field label="Position details (markdown)" required>
          <textarea
            value={form.positionDetails}
            onChange={(e) => patchForm("positionDetails", e.target.value)}
            disabled={saving}
            required
            rows={12}
            className={`${fieldClass} resize-y font-mono text-[13px] leading-relaxed`}
          />
        </Field>
      </Section>

      {/* Skills */}
      <Section title="Key skills" subtitle="Up to 5. These drive the trainee match score.">
        <div className="flex flex-wrap gap-2 mb-3">
          {form.keySkills.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200"
            >
              {s}
              <button
                type="button"
                onClick={() => removeSkill(s)}
                disabled={saving}
                className="ml-1 -mr-0.5 hover:text-rose-700"
                aria-label={`Remove ${s}`}
              >
                ×
              </button>
            </span>
          ))}
          {form.keySkills.length === 0 && (
            <p className="text-xs text-subtle italic">No skills set yet.</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            disabled={saving || form.keySkills.length >= 5}
            placeholder={form.keySkills.length >= 5 ? "Max 5 reached" : "Type a skill and press Enter"}
            className={`${fieldClass} flex-1`}
          />
          <button
            type="button"
            onClick={addSkill}
            disabled={saving || form.keySkills.length >= 5 || !skillInput.trim()}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-fg bg-card border border-line hover:bg-elevated disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </Section>

      {/* Contact */}
      <Section title="Hiring contact" subtitle="Optional. Shown to applicants so they can reach the hiring lead directly.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Email">
            <input
              type="email"
              value={form.contactEmail ?? ""}
              onChange={(e) => patchForm("contactEmail", e.target.value || null)}
              disabled={saving}
              className={fieldClass}
            />
          </Field>
          <Field label="Name">
            <input
              type="text"
              value={form.contactName ?? ""}
              onChange={(e) => patchForm("contactName", e.target.value || null)}
              disabled={saving}
              className={fieldClass}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.contactPhone ?? ""}
              onChange={(e) => patchForm("contactPhone", e.target.value || null)}
              disabled={saving}
              className={fieldClass}
            />
          </Field>
        </div>
      </Section>

      {/* Footer: save + delete */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-card border-t border-line backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : "Save changes"}
          </button>

          {savedAt && !error && (
            <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
              <CheckCircle2 size={11} /> Saved {savedAt.toLocaleTimeString()}
            </span>
          )}
          {error && (
            <span className="text-xs text-rose-700 inline-flex items-center gap-1">
              <AlertCircle size={11} /> {error}
            </span>
          )}

          <span className="flex-1" />

          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={saving || deleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40 transition-colors"
            >
              <Trash2 size={12} /> Delete posting
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 ring-1 ring-inset ring-rose-200">
              <span className="text-xs text-rose-900 font-semibold">Really delete?</span>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="text-xs text-rose-700 hover:text-rose-900 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40"
              >
                {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Yes, delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Atoms ────────────────────────────────────────────────────── */

const fieldClass =
  "w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-60";

function Section({
  title, subtitle, children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 surface-shadow">
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">{title}</p>
      {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label, required, children, className = "",
}: {
  label: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold text-fg mb-1.5">
        {label}
        {required && <span className="text-rose-600 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
