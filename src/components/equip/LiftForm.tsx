"use client";
/**
 * VentureLift draft form — the full version.
 *
 * Sections, top to bottom:
 *   1. Innovation summary (with AI auto-fill from URL)
 *   2. IP status (radio + conditional follow-up)
 *   3. Technology Readiness Level slider (1-9 with labels)
 *   4. Commercialization roadmap (textarea)
 *   5. Accelerator participation (optional)
 *   6. Project timeline (start + end, ≤ 6 months)
 *   7. Budget breakdown (5 line items, ≤ $25K)
 *   8. Success criteria
 *   9. Documents (pitch deck, prototype photos, recommendation
 *      letter, video pitch)
 *   10. Submit
 *
 * Auto-save: 800ms debounced PATCH after every edit (PrepCoach
 * pattern). The page never has a "Save" button — the chip in the
 * header tells you when the last save landed.
 *
 * AI auto-fill: paste a research / lab / publication / accelerator
 * URL into the assist panel, click Auto-fill, and the form
 * pre-populates innovation summary + success criteria. User
 * always reviews before fields are touched.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Check, AlertCircle, Rocket, Send, Sparkles, Beaker,
} from "lucide-react";
import { STREAM_BUDGETS, type VentureLiftFormData, type EquipDocument } from "@/lib/equip/types";
import { LiftDocumentTray } from "./LiftDocumentTray";

interface Props {
  applicationId: string;
  initial: VentureLiftFormData;
  initialDocuments: EquipDocument[];
  profile: {
    name: string;
    email: string;
    organization: string | null;
    jobTitle: string | null;
    country: string | null;
    phone: string | null;
  };
}

const CAP = STREAM_BUDGETS.venture_lift;

const IP_OPTIONS: { id: string; label: string; hint: string }[] = [
  { id: "owned",       label: "Owned",                     hint: "We own the IP outright" },
  { id: "licensed",    label: "Licensed from Canadian entity", hint: "Licensed in, Canada-based licensor" },
  { id: "granted",     label: "Granted patent",            hint: "Issued patent in hand" },
  { id: "filed",       label: "Patent filed",              hint: "Filing in progress, awaiting decision" },
  { id: "provisional", label: "Provisional filed",         hint: "Provisional application on record" },
  { id: "in_progress", label: "Filing in progress",        hint: "Working with counsel; not yet filed" },
  { id: "none",        label: "No IP yet",                 hint: "Trade-secret / first-mover advantage" },
];

const TRL_LABELS: Record<number, string> = {
  1: "Concept observed",
  2: "Concept formulated",
  3: "Proof of concept",
  4: "Lab validation",
  5: "Relevant-env validation",
  6: "Prototype demonstrated",
  7: "Operational prototype",
  8: "System complete",
  9: "Proven in operations",
};

function totalBudget(f: VentureLiftFormData): number {
  return (f.budgetIp ?? 0)
    + (f.budgetPrototype ?? 0)
    + (f.budgetConsulting ?? 0)
    + (f.budgetMarket ?? 0)
    + (f.budgetOther ?? 0);
}

export function LiftForm({ applicationId, initial, initialDocuments, profile }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<VentureLiftFormData>(initial);
  const [documents, setDocuments] = useState<EquipDocument[]>(initialDocuments);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI auto-fill state.
  const [aiUrl, setAiUrl] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<{
    innovationSummary: string | null;
    suggestedSuccessCriteria: string | null;
    keyResearchAreas: string[];
  } | null>(null);

  // Auto-save loop.
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      startSaving(async () => {
        try {
          await fetch(`/api/equip/applications/${applicationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ formData: form }),
          });
          setSavedAt(new Date().toISOString());
          setError(null);
        } catch { /* silent — retry next edit */ }
      });
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function set<K extends keyof VentureLiftFormData>(key: K, value: VentureLiftFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function autofill() {
    if (!aiUrl.trim()) return;
    setAiBusy(true);
    setAiError(null);
    setAiPreview(null);
    try {
      const res = await fetch("/api/equip/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: aiUrl.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "AI request failed");
      }
      const j = (await res.json()) as {
        result: {
          innovationSummary: string | null;
          suggestedSuccessCriteria: string | null;
          keyResearchAreas: string[];
        };
      };
      setAiPreview(j.result);
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  function applyAiPreview() {
    if (!aiPreview) return;
    setForm((prev) => ({
      ...prev,
      innovationSummary: aiPreview.innovationSummary ?? prev.innovationSummary,
      successCriteria: prev.successCriteria || aiPreview.suggestedSuccessCriteria || undefined,
    }));
    // Mark aiAssisted so reviewers can see the AI was in the loop.
    fetch(`/api/equip/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiAssisted: true }),
    }).catch(() => {});
    setAiPreview(null);
    setAiUrl("");
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
      {/* Header */}
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-2">
            <Rocket size={11} className="text-brand-600" />
            VentureLift · draft
          </p>
          <h1 className="text-2xl font-bold text-fg tracking-tight mt-1">Your commercialization plan</h1>
          <p className="text-[11px] text-muted mt-1">
            Auto-saved as you type. Up to ${CAP.toLocaleString()} over ≤ 6 months.
          </p>
        </div>
        <SaveIndicator saving={saving} savedAt={savedAt} />
      </header>

      {/* Identity pre-fill */}
      <section className="rounded-2xl border border-line bg-elevated/30 p-4 space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider font-bold text-subtle">From your profile</p>
        <p className="text-sm text-fg font-semibold">{profile.name || profile.email}</p>
        <p className="text-[11px] text-muted">
          {profile.email}
          {profile.jobTitle ? ` · ${profile.jobTitle}` : ""}
          {profile.organization ? ` · ${profile.organization}` : ""}
        </p>
      </section>

      {/* AI auto-fill */}
      <section className="rounded-2xl border border-line bg-brand-50/30 p-4 space-y-3">
        <header className="flex items-center gap-2">
          <Sparkles size={14} className="text-brand-700" />
          <h3 className="text-sm font-bold text-fg">AI auto-fill</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-800 ring-1 ring-brand-200 px-1.5 py-0.5 rounded">
            Optional
          </span>
        </header>
        <p className="text-[11px] text-muted leading-snug">
          Paste a link to your lab page, publication, or accelerator profile.
          We&apos;ll read it and draft your innovation summary + success
          criteria. You preview + approve before any field is touched.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={aiUrl}
            onChange={(e) => setAiUrl(e.target.value)}
            placeholder="https://your-lab.uoft.ca/about/"
            className="flex-1 min-w-[260px] bg-card-solid border border-line rounded-lg px-3 py-2 text-sm font-mono text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          <button
            type="button"
            disabled={!aiUrl.trim() || aiBusy}
            onClick={autofill}
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold px-3 py-2 rounded-lg"
          >
            {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Auto-fill
          </button>
        </div>
        {aiError && (
          <p className="text-[11px] text-rose-700 inline-flex items-center gap-1.5">
            <AlertCircle size={11} /> {aiError}
          </p>
        )}
        {aiPreview && (
          <div className="rounded-xl border border-brand-300 bg-card-solid p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider font-bold text-brand-700">Preview — review before applying</p>
            {aiPreview.innovationSummary && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-subtle">Innovation summary</p>
                <p className="text-xs text-fg leading-relaxed mt-0.5">{aiPreview.innovationSummary}</p>
              </div>
            )}
            {aiPreview.suggestedSuccessCriteria && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-subtle">Suggested success criteria</p>
                <p className="text-xs text-fg leading-relaxed mt-0.5">{aiPreview.suggestedSuccessCriteria}</p>
              </div>
            )}
            {aiPreview.keyResearchAreas.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-subtle">Research areas detected</p>
                <p className="text-[11px] text-muted mt-0.5">{aiPreview.keyResearchAreas.join(" · ")}</p>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={() => setAiPreview(null)} className="text-xs font-semibold text-muted hover:text-fg px-3 py-1">
                Discard
              </button>
              <button
                type="button"
                onClick={applyAiPreview}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
              >
                <Check size={11} /> Apply to form
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Innovation summary */}
      <Field label="Innovation summary" hint="One paragraph — the problem, your approach, and why it can work.">
        <textarea
          rows={7}
          value={form.innovationSummary ?? ""}
          onChange={(e) => set("innovationSummary", e.target.value)}
          placeholder="e.g. We're developing a cell-free biomanufacturing platform that…"
          className={textareaCls}
        />
      </Field>

      {/* IP status */}
      <Field label="IP status" hint="Required. Innovation must have IP owned or licensed by a Canadian entity.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {IP_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => set("ipStatus", opt.id)}
              className={
                "text-left rounded-xl border px-3 py-2 transition-colors " +
                (form.ipStatus === opt.id
                  ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/30"
                  : "border-line hover:bg-elevated/60")
              }
            >
              <p className="text-xs font-bold text-fg">{opt.label}</p>
              <p className="text-[10px] text-muted mt-0.5">{opt.hint}</p>
            </button>
          ))}
        </div>
        {form.ipStatus && form.ipStatus !== "none" && (
          <input
            value={form.ipJurisdiction ?? ""}
            onChange={(e) => set("ipJurisdiction", e.target.value)}
            placeholder="Jurisdiction (e.g. Canada, US, PCT)"
            className={inputCls + " mt-2"}
          />
        )}
      </Field>

      {/* TRL slider */}
      <Field label="Technology Readiness Level" hint="Where is your tech today? 1 = concept; 9 = proven in operations.">
        <div className="space-y-3">
          <input
            type="range"
            min={1}
            max={9}
            step={1}
            value={form.trl ?? 1}
            onChange={(e) => set("trl", Number(e.target.value))}
            className="w-full accent-brand-600"
          />
          <div className="flex items-center justify-between text-[10px] text-muted">
            <span>1</span><span>3</span><span>5</span><span>7</span><span>9</span>
          </div>
          {form.trl !== undefined && (
            <p className="text-xs text-fg">
              <span className="font-bold text-brand-700">TRL {form.trl}</span>
              {" · "}
              <span className="text-muted">{TRL_LABELS[form.trl ?? 1]}</span>
            </p>
          )}
        </div>
      </Field>

      {/* Roadmap */}
      <Field label="Commercialization roadmap" hint="What are the next 1-6 months of milestones? Be concrete.">
        <textarea
          rows={5}
          value={form.commercializationRoadmap ?? ""}
          onChange={(e) => set("commercializationRoadmap", e.target.value)}
          placeholder="e.g. Month 1: complete pilot validation with X; Month 2-3: file utility patent; Month 4-6: pilot with two industry partners."
          className={textareaCls}
        />
      </Field>

      {/* Accelerator (optional) */}
      <section className="rounded-2xl border border-line bg-card p-4 space-y-3 surface-shadow">
        <div className="flex items-center gap-2">
          <Beaker size={13} className="text-brand-600" />
          <h3 className="text-sm font-bold text-fg">Accelerator participation</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-elevated text-muted ring-1 ring-line px-1.5 py-0.5 rounded">
            Optional
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Accelerator name">
            <input
              value={form.acceleratorName ?? ""}
              onChange={(e) => set("acceleratorName", e.target.value)}
              placeholder="e.g. Creative Destruction Lab"
              className={inputCls}
            />
          </Field>
          <Field label="Start date">
            <input
              type="date"
              value={form.acceleratorStart ?? ""}
              onChange={(e) => set("acceleratorStart", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={form.acceleratorEnd ?? ""}
              onChange={(e) => set("acceleratorEnd", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* Project timeline */}
      <Field label="Project timeline" hint="Maximum 6 months from start to end.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Start</span>
            <input
              type="date"
              value={form.projectStart ?? ""}
              onChange={(e) => set("projectStart", e.target.value)}
              className={inputCls + " mt-1"}
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">End</span>
            <input
              type="date"
              value={form.projectEnd ?? ""}
              onChange={(e) => set("projectEnd", e.target.value)}
              className={inputCls + " mt-1"}
            />
          </label>
        </div>
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
          <MoneyField label="IP filings / counsel"  value={form.budgetIp}         onChange={(v) => set("budgetIp", v)} />
          <MoneyField label="Prototype build"       value={form.budgetPrototype}  onChange={(v) => set("budgetPrototype", v)} />
          <MoneyField label="Consulting / contract" value={form.budgetConsulting} onChange={(v) => set("budgetConsulting", v)} />
          <MoneyField label="Market validation"     value={form.budgetMarket}     onChange={(v) => set("budgetMarket", v)} />
          <MoneyField label="Other"                 value={form.budgetOther}      onChange={(v) => set("budgetOther", v)} />
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

      {/* Success criteria */}
      <Field label="What does success look like in 6 months?" hint="One line. We'll check in.">
        <input
          value={form.successCriteria ?? ""}
          onChange={(e) => set("successCriteria", e.target.value)}
          placeholder="e.g. Working prototype validated at one pilot site + filed utility patent"
          className={inputCls}
        />
      </Field>

      {/* Document tray */}
      <LiftDocumentTray
        applicationId={applicationId}
        documents={documents}
        onChange={setDocuments}
      />

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
const textareaCls = inputCls + " font-sans";

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
          step={100}
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
