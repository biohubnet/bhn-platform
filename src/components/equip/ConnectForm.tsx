"use client";
/**
 * VentureConnect draft form. Five visible fields, profile pre-fill
 * for everything else.
 *
 * Auto-save
 *   The 800ms debounced PATCH pattern from PrepCoach. Every edit
 *   collapses into one network call per typing burst. A "Saved Xs
 *   ago" chip in the top-right gives the user the feedback they
 *   need without a save button.
 *
 * Submit
 *   Single CTA at the bottom. Validates client-side, then POSTs
 *   to /submit which validates server-side and transitions the
 *   draft to "submitted".
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle, Beaker, Send } from "lucide-react";
import { STREAM_BUDGETS, type VentureConnectFormData } from "@/lib/equip/types";

interface Props {
  applicationId: string;
  initial: VentureConnectFormData;
  profile: {
    name: string;
    email: string;
    organization: string | null;
    jobTitle: string | null;
    country: string | null;
    phone: string | null;
  };
}

const CAP = STREAM_BUDGETS.venture_connect;

function totalBudget(f: VentureConnectFormData): number {
  return (f.budgetRegistration ?? 0)
    + (f.budgetTravel ?? 0)
    + (f.budgetLodging ?? 0)
    + (f.budgetOther ?? 0);
}

export function ConnectForm({ applicationId, initial, profile }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<VentureConnectFormData>(initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save: 800ms debounce after the last edit.
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      startSaving(async () => {
        try {
          const res = await fetch(`/api/equip/applications/${applicationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ formData: form }),
          });
          if (res.ok) {
            setSavedAt(new Date().toISOString());
            setError(null);
          }
        } catch { /* silent — retry on next edit */ }
      });
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function set<K extends keyof VentureConnectFormData>(key: K, value: VentureConnectFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    setValidation([]);
    try {
      const res = await fetch(`/api/equip/applications/${applicationId}/submit`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const data = j as { error?: string; details?: string[] };
        if (data.details?.length) setValidation(data.details);
        throw new Error(data.error ?? "Could not submit");
      }
      router.push("/equip/my-applications");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const total = totalBudget(form);
  const overCap = total > CAP;

  return (
    <div className="space-y-5">
      {/* Header chip + save indicator */}
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-2">
            <Beaker size={11} className="text-brand-600" />
            VentureConnect · draft
          </p>
          <h1 className="text-2xl font-bold text-fg tracking-tight mt-1">Your event funding</h1>
          <p className="text-[11px] text-muted mt-1">
            Five fields, auto-saved as you type. Up to ${CAP.toLocaleString()}.
          </p>
        </div>
        <SaveIndicator saving={saving} savedAt={savedAt} />
      </header>

      {/* Identity pre-fill — read-only summary, no friction */}
      <section className="rounded-2xl border border-line bg-elevated/30 p-4 space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider font-bold text-subtle">From your profile</p>
        <p className="text-sm text-fg font-semibold">{profile.name || profile.email}</p>
        <p className="text-[11px] text-muted">
          {profile.email}
          {profile.jobTitle ? ` · ${profile.jobTitle}` : ""}
          {profile.organization ? ` · ${profile.organization}` : ""}
          {profile.country ? ` · ${profile.country}` : ""}
        </p>
        <p className="text-[10px] text-subtle">
          We don&apos;t ask you to re-enter any of this. Update on your{" "}
          <a href="/profile" className="underline">profile page</a> if anything&apos;s out of date.
        </p>
      </section>

      {/* Event */}
      <Field
        label="What event are you attending?"
        hint="Conference name, pitch competition, demo day — whatever&apos;s next."
      >
        <input
          value={form.eventName ?? ""}
          onChange={(e) => set("eventName", e.target.value)}
          placeholder="e.g. BIO International Convention 2026"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="When is it?" hint="Date the event starts.">
          <input
            type="date"
            value={form.eventDate ?? ""}
            onChange={(e) => set("eventDate", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Event URL" hint="Optional — helps us verify.">
          <input
            type="url"
            value={form.eventUrl ?? ""}
            onChange={(e) => set("eventUrl", e.target.value)}
            placeholder="https://"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Narrative */}
      <Field
        label="Why this event, why now?"
        hint="One or two sentences. Who you&apos;ll meet, what you&apos;ll bring back."
      >
        <textarea
          rows={4}
          value={form.alignmentNarrative ?? ""}
          onChange={(e) => set("alignmentNarrative", e.target.value)}
          placeholder="e.g. Pitching our prototype to the BIO BIOTECH track judges; targeting two intros to scale-up CMOs we identified last month."
          className={inputCls + " font-sans"}
        />
      </Field>

      {/* Budget */}
      <section className="rounded-2xl border border-line bg-card p-4 space-y-3 surface-shadow">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-fg">Budget breakdown</h3>
          <span className={"text-sm font-bold tabular-nums " + (overCap ? "text-rose-700" : "text-fg")}>
            ${total.toLocaleString()} / ${CAP.toLocaleString()}
          </span>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MoneyField label="Registration" value={form.budgetRegistration} onChange={(v) => set("budgetRegistration", v)} />
          <MoneyField label="Travel"       value={form.budgetTravel}       onChange={(v) => set("budgetTravel", v)} />
          <MoneyField label="Lodging"      value={form.budgetLodging}      onChange={(v) => set("budgetLodging", v)} />
          <MoneyField label="Other"        value={form.budgetOther}        onChange={(v) => set("budgetOther", v)} />
        </div>
        {(form.budgetOther ?? 0) > 0 && (
          <input
            value={form.budgetOtherNote ?? ""}
            onChange={(e) => set("budgetOtherNote", e.target.value)}
            placeholder="What's the 'Other' line for?"
            className={inputCls}
          />
        )}
        {overCap && (
          <p className="text-[11px] text-rose-700 inline-flex items-center gap-1.5">
            <AlertCircle size={11} /> Total exceeds the ${CAP.toLocaleString()} cap. Trim to submit.
          </p>
        )}
      </section>

      {/* Outcome */}
      <Field
        label="What does success look like?"
        hint="One line. We'll ask you about it in your 30-day check-in."
      >
        <input
          value={form.expectedOutcome ?? ""}
          onChange={(e) => set("expectedOutcome", e.target.value)}
          placeholder="e.g. Two qualified intros to manufacturing partners + a poster award"
          className={inputCls}
        />
      </Field>

      {/* Submit */}
      <div className="border-t border-line pt-4 flex flex-wrap items-center justify-end gap-3">
        {validation.length > 0 && (
          <ul className="text-[11px] text-rose-700 list-disc pl-5 mr-auto max-w-md">
            {validation.map((v, i) => <li key={i}>{v}</li>)}
          </ul>
        )}
        {error && validation.length === 0 && (
          <p className="text-[11px] text-rose-700 inline-flex items-center gap-1.5 mr-auto">
            <AlertCircle size={11} /> {error}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={submitting || overCap}
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-bold px-5 py-2 rounded-xl shadow-sm shadow-brand-600/25 transition-colors"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Submit application
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-fg">{label}</label>
      {hint && <p className="text-[10px] text-subtle">{hint}</p>}
      {children}
    </div>
  );
}

function MoneyField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">{label}</span>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-sm text-muted">$</span>
        <input
          type="number"
          min={0}
          step={50}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className={inputCls + " tabular-nums"}
        />
      </div>
    </label>
  );
}

function SaveIndicator({ saving, savedAt }: { saving: boolean; savedAt: string | null }) {
  if (saving) {
    return (
      <span className="text-[11px] text-muted inline-flex items-center gap-1.5">
        <Loader2 size={11} className="animate-spin" /> Saving…
      </span>
    );
  }
  if (savedAt) {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(savedAt).getTime()) / 1000));
    return (
      <span className="text-[11px] text-emerald-700 inline-flex items-center gap-1.5">
        <Check size={11} /> Saved {seconds}s ago
      </span>
    );
  }
  return null;
}
