"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertTriangle, StickyNote } from "lucide-react";

export type AttendeeType = "trainee" | "industry" | "academic" | "student" | "sponsor" | "guest";
export type RegistrationStatus = "pending" | "confirmed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed" | "waived";

export interface RegistrationEditorForm {
  attendeeType: AttendeeType;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
  includesSymposiumDay: boolean;
  dietaryRestrictions: string;
  accessibilityNeeds: string;
  adminNote: string;
}

/**
 * Form for editing a single Registration row. PATCHes only the
 * fields that changed since the initial snapshot — keeps the API
 * payload minimal and lets the server treat omitted keys as "leave
 * alone".
 *
 * Status changes to "cancelled" trigger the cascade-cancel on the
 * server, which surfaces a metadata block back to us (workshop
 * bookings released, waitlisters promoted). We show that as a
 * one-shot flash so the admin can see the side effects.
 */
export function RegistrationEditor({
  slug,
  registrationId,
  initial,
}: {
  slug: string;
  registrationId: string;
  initial: RegistrationEditorForm;
}) {
  const router = useRouter();
  const [form, setForm] = useState<RegistrationEditorForm>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const dirty = (Object.keys(form) as (keyof RegistrationEditorForm)[]).some(
    (k) => form[k] !== initial[k],
  );

  function update<K extends keyof RegistrationEditorForm>(key: K, value: RegistrationEditorForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {};
    for (const key of Object.keys(form) as (keyof RegistrationEditorForm)[]) {
      if (form[key] === initial[key]) continue;
      body[key] = form[key] === "" ? null : form[key];
    }

    try {
      const res = await fetch(`/api/admin/events/${slug}/registrations/${registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        cancelMeta?: { cancelledBookings: number; promoted: number } | null;
      };
      if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);
      const meta = data.cancelMeta;
      setSavedFlash(
        meta && meta.cancelledBookings > 0
          ? `Saved — ${meta.cancelledBookings} workshop booking${meta.cancelledBookings === 1 ? "" : "s"} released${meta.promoted > 0 ? `, ${meta.promoted} waitlister${meta.promoted === 1 ? "" : "s"} promoted` : ""}.`
          : "Saved ✓",
      );
      setTimeout(() => setSavedFlash(null), 4500);
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
        <h2 className="text-lg font-bold text-fg tracking-tight">Registration details</h2>
        {dirty && (
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-700">
            Unsaved changes
          </span>
        )}
      </header>

      <fieldset className="rounded-2xl border border-line bg-card p-5 space-y-4 surface-shadow">
        <legend className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle px-2 -ml-2">
          Status &amp; type
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Attendee type">
            <select
              value={form.attendeeType}
              onChange={(e) => update("attendeeType", e.target.value as AttendeeType)}
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
            >
              <option value="trainee">Trainee</option>
              <option value="industry">Industry</option>
              <option value="academic">Academic / faculty</option>
              <option value="student">Student</option>
              <option value="sponsor">Sponsor / partner</option>
              <option value="guest">Guest</option>
            </select>
          </Field>

          <Field
            label="Registration status"
            hint="Setting to 'cancelled' releases all their workshop bookings and triggers waitlist promotion."
          >
            <select
              value={form.registrationStatus}
              onChange={(e) => update("registrationStatus", e.target.value as RegistrationStatus)}
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>

          <Field label="Payment status">
            <select
              value={form.paymentStatus}
              onChange={(e) => update("paymentStatus", e.target.value as PaymentStatus)}
              className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
              <option value="waived">Waived</option>
            </select>
          </Field>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.includesSymposiumDay}
            onChange={(e) => update("includesSymposiumDay", e.target.checked)}
            className="mt-0.5 accent-brand-600 w-4 h-4"
          />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-fg">Includes symposium day</span>
            <span className="block text-xs text-muted leading-snug mt-0.5">
              Uncheck for workshop-only attendees who skip the final day.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="rounded-2xl border border-line bg-card p-5 space-y-4 surface-shadow">
        <legend className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle px-2 -ml-2">
          Needs
        </legend>

        <Field label="Dietary restrictions">
          <input
            type="text"
            value={form.dietaryRestrictions}
            onChange={(e) => update("dietaryRestrictions", e.target.value)}
            maxLength={500}
            placeholder="vegetarian · gluten-free · nut allergy"
            className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Accessibility needs">
          <textarea
            value={form.accessibilityNeeds}
            onChange={(e) => update("accessibilityNeeds", e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Wheelchair access · ASL · large-print materials · …"
            className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm resize-y"
          />
        </Field>
      </fieldset>

      <fieldset className="rounded-2xl border border-line bg-card p-5 space-y-3 surface-shadow">
        <legend className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle px-2 -ml-2 inline-flex items-center gap-1">
          <StickyNote size={11} /> Admin note
        </legend>
        <p className="text-xs text-muted leading-snug">
          Internal only — never shown to the attendee. Use for VIP / press /
          speaker flags, special handling notes, or anything else the events
          team wants to remember.
        </p>
        <textarea
          value={form.adminNote}
          onChange={(e) => update("adminNote", e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="VIP — speaker at session 2 · seat near power outlet · …"
          className="w-full bg-background border border-line rounded-lg px-3 py-2 text-sm resize-y"
        />
      </fieldset>

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
          <span className="text-sm font-semibold text-emerald-700">{savedFlash}</span>
        )}
      </div>
    </form>
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
      {hint && <span className="block text-[11px] text-subtle mt-0.5 leading-snug">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
