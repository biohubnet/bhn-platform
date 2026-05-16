"use client";
/**
 * Phase-A placeholder for the VentureLift draft editor. The full
 * form (conditional disclosure, TRL slider, budget builder, IP
 * status, accelerator, project timeline) lands in Phase B. Until
 * then, the user can save a few headline fields so they don't
 * lose work; the submit button explains the timing honestly.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Check, Rocket, Beaker } from "lucide-react";
import type { VentureLiftFormData } from "@/lib/equip/types";

export function LiftFormPlaceholder({
  applicationId,
  initial,
}: {
  applicationId: string;
  initial: VentureLiftFormData;
}) {
  const [form, setForm] = useState<VentureLiftFormData>(initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startSaving(async () => {
        await fetch(`/api/equip/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formData: form }),
        }).catch(() => {});
        setSavedAt(new Date().toISOString());
      });
    }, 800);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-2">
            <Rocket size={11} className="text-brand-600" />
            VentureLift · draft
          </p>
          <h1 className="text-2xl font-bold text-fg tracking-tight mt-1">Your innovation</h1>
          <p className="text-[11px] text-muted mt-1">
            Save what you can now; the full form (TRL, budget builder, IP status,
            timeline) opens in the next release.
          </p>
        </div>
        {saving ? (
          <span className="text-[11px] text-muted inline-flex items-center gap-1.5">
            <Loader2 size={11} className="animate-spin" /> Saving…
          </span>
        ) : savedAt ? (
          <span className="text-[11px] text-emerald-700 inline-flex items-center gap-1.5">
            <Check size={11} /> Saved
          </span>
        ) : null}
      </header>

      <Field label="Innovation summary" hint="A paragraph in your own words. AI auto-fill is coming.">
        <textarea
          rows={5}
          value={form.innovationSummary ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, innovationSummary: e.target.value }))}
          placeholder="e.g. We're developing a cell-free biomanufacturing platform that…"
          className={inputCls}
        />
      </Field>

      <Field label="What does success look like in 6 months?" hint="One sentence — you'll be able to refine this when the full form ships.">
        <input
          value={form.successCriteria ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, successCriteria: e.target.value }))}
          placeholder="e.g. A working prototype validated in a pilot site"
          className={inputCls}
        />
      </Field>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex items-start gap-3">
        <Beaker size={16} className="text-amber-700 mt-0.5 shrink-0" />
        <div className="text-[11px] text-amber-900 leading-snug">
          <p className="font-bold">Submission opens with the next release.</p>
          <p className="mt-0.5">
            Your draft is saved as you type. When the full VentureLift
            form ships you&apos;ll see the rest of the fields (TRL,
            IP status, budget breakdown, project timeline) here and
            can submit in one click. Nothing you&apos;ve written gets
            lost in between.
          </p>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-sans";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-fg">{label}</label>
      {hint && <p className="text-[10px] text-subtle">{hint}</p>}
      {children}
    </div>
  );
}
