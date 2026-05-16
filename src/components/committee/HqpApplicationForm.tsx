"use client";
/**
 * Applicant form for joining the HQP Advisory Committee.
 *
 * Auto-saves every 800ms to /api/committee/hqp/applications,
 * mirroring the Equip auto-save pattern. Submit posts the same
 * endpoint with action=submit, which runs the validator and
 * flips status → "submitted".
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle, Send, Sparkles, AlertTriangle } from "lucide-react";
import {
  PROGRAM_PILLAR_LABELS, AREA_LABELS,
  type HqpApplicationFormData, type HqpProgramPillar, type HqpAreaOfInterest,
} from "@/lib/hqp/types";

interface Props {
  initial: HqpApplicationFormData;
  /** Pre-filled where we know the user's data already, just so
   *  the applicant doesn't retype things visible in their
   *  profile. */
  profile: {
    name: string;
    email: string;
    organization: string | null;
  };
  /** When the application has already been submitted, the
   *  component renders read-only with a status banner instead
   *  of the form. */
  readOnlyStatus?: "submitted" | "approved" | "rejected" | null;
  reviewerNote?: string | null;
}

export function HqpApplicationForm({ initial, profile, readOnlyStatus, reviewerNote }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<HqpApplicationFormData>(initial);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitDetails, setSubmitDetails] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (readOnlyStatus) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(form, "save"), 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, readOnlyStatus]);

  async function save(payload: HqpApplicationFormData, action: "save" | "submit") {
    setSaveState("saving");
    setSubmitError(null);
    setSubmitDetails(null);
    try {
      const res = await fetch("/api/committee/hqp/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: payload, action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(j.error ?? "Save failed.");
        if (Array.isArray(j.details)) setSubmitDetails(j.details);
        setSaveState("error");
        return false;
      }
      setSaveState("saved");
      setLastSavedAt(new Date());
      return true;
    } catch (e) {
      setSubmitError((e as Error).message);
      setSaveState("error");
      return false;
    }
  }

  function toggleProgram(p: HqpProgramPillar) {
    setForm((f) => {
      const cur = new Set(f.programsParticipating ?? []);
      cur.has(p) ? cur.delete(p) : cur.add(p);
      return { ...f, programsParticipating: Array.from(cur) };
    });
  }
  function toggleArea(a: HqpAreaOfInterest) {
    setForm((f) => {
      const cur = new Set(f.areasOfInterest ?? []);
      cur.has(a) ? cur.delete(a) : cur.add(a);
      return { ...f, areasOfInterest: Array.from(cur) };
    });
  }

  function submit() {
    startTransition(async () => {
      const ok = await save(form, "submit");
      if (ok) router.refresh();
    });
  }

  if (readOnlyStatus) {
    return (
      <section className={
        "rounded-2xl border p-5 surface-shadow " +
        (readOnlyStatus === "approved" ? "border-emerald-300 bg-emerald-50/40"
         : readOnlyStatus === "rejected" ? "border-rose-300 bg-rose-50/40"
                                          : "border-brand-300 bg-brand-50/40")
      }>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Application status</p>
        <h2 className="text-lg font-bold text-fg mt-1">
          {readOnlyStatus === "approved" ? "Welcome to the HQP Advisory Committee 🎉"
           : readOnlyStatus === "rejected" ? "Not selected this cycle"
                                            : "Submitted — under review"}
        </h2>
        <p className="text-sm text-muted mt-2">
          {readOnlyStatus === "approved" && "You'll see a Committees badge on your dashboard and an HQP shortcut in your sidebar. Welcome aboard."}
          {readOnlyStatus === "rejected" && "Thanks for applying. The program team will reach out via email if a future window has room. The note below explains the rationale."}
          {readOnlyStatus === "submitted" && "Your application is in the queue. Decisions usually go out within 2–4 weeks of the close date."}
        </p>
        {reviewerNote && (
          <div className="mt-3 rounded-xl bg-card border border-line p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-subtle">Reviewer note</p>
            <p className="text-sm text-fg mt-1 whitespace-pre-wrap">{reviewerNote}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-violet-700">HQP Advisory Committee · Application</p>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Apply to join</h1>
        <p className="text-sm text-muted max-w-3xl">
          The committee shapes BHN's programs, platform, and events. Membership is 1 year, ~12 h total. Form auto-saves every 800 ms.
        </p>
        <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
      </header>

      <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Who you are</p>
        <p className="text-sm text-fg"><strong>{profile.name || "—"}</strong> ({profile.email}){profile.organization ? ` · ${profile.organization}` : ""}</p>
        <p className="text-[11px] text-subtle">If anything above is wrong, update your profile first — those fields come from your account.</p>
      </section>

      <Section title="Why you want to join">
        <Field label="What draws you to the committee? *" hint="50+ characters">
          <Textarea value={form.motivation ?? ""} onChange={(v) => setForm({ ...form, motivation: v })} placeholder="What problem are you most motivated to help solve for BHN trainees?" />
        </Field>
        <Field label="What unique perspective do you bring? *" hint="30+ characters">
          <Textarea value={form.perspective ?? ""} onChange={(v) => setForm({ ...form, perspective: v })} placeholder="Lived experience, institution, prior community work — whatever's relevant." />
        </Field>
      </Section>

      <Section title="Your BHN footprint">
        <Field label="Which BHN program pillars are you participating in? *" hint="Tick all that apply">
          <div className="space-y-1.5">
            {Object.entries(PROGRAM_PILLAR_LABELS).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(form.programsParticipating ?? []).includes(k as HqpProgramPillar)} onChange={() => toggleProgram(k as HqpProgramPillar)} />
                <span className="text-sm text-fg">{label}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Specific programs / cohorts (optional)" hint="e.g. 'MSL Accelerator Spring 2026, KE Round 4'">
          <Textarea rows={2} value={form.programDetails ?? ""} onChange={(v) => setForm({ ...form, programDetails: v })} />
        </Field>
      </Section>

      <Section title="Areas you want to feed back on">
        <Field label="Pick the areas you're most interested in *" hint="Tick all that apply">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {Object.entries(AREA_LABELS).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(form.areasOfInterest ?? []).includes(k as HqpAreaOfInterest)} onChange={() => toggleArea(k as HqpAreaOfInterest)} />
                <span className="text-sm text-fg">{label}</span>
              </label>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Acknowledgements">
        <Acknowledgement
          checked={!!form.timeCommitmentAcknowledged}
          onChange={(v) => setForm({ ...form, timeCommitmentAcknowledged: v })}
        >
          I understand the committee meets monthly (~1 h), with ~12 h total time commitment over the 1-year term.
        </Acknowledgement>
        <Acknowledgement
          checked={!!form.confidentialityAck}
          onChange={(v) => setForm({ ...form, confidentialityAck: v })}
        >
          I will maintain the confidentiality of non-public information shared during committee activities and disclose any potential conflict of interest (Charter §8).
        </Acknowledgement>
        <Acknowledgement
          checked={!!form.nameImageConsent}
          onChange={(v) => setForm({ ...form, nameImageConsent: v })}
        >
          I consent to the use of my name, headshot and affiliation for BHN communications (Charter §11).
        </Acknowledgement>
      </Section>

      <Section title="Anything else">
        <Field label="Additional notes (optional)">
          <Textarea rows={3} value={form.additionalNotes ?? ""} onChange={(v) => setForm({ ...form, additionalNotes: v })} />
        </Field>
      </Section>

      {/* Submit */}
      <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 flex items-center gap-3 justify-between flex-wrap">
        <div className="text-xs text-violet-900 space-y-0.5">
          <p className="font-bold text-sm inline-flex items-center gap-1"><Sparkles size={13} /> Ready to apply?</p>
          <p className="opacity-80">Once submitted you can&apos;t edit, but you can withdraw by emailing the program team.</p>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-xl"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Submit application
        </button>
      </section>

      {submitError && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
          <p className="text-rose-900 font-bold text-sm inline-flex items-center gap-2">
            <AlertTriangle size={14} /> {submitError}
          </p>
          {submitDetails && submitDetails.length > 0 && (
            <ul className="text-xs text-rose-800 mt-2 space-y-0.5 list-disc list-inside">
              {submitDetails.map((d) => <li key={d}>{d}</li>)}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
      <h2 className="text-base font-bold text-fg">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">
        {label}
        {hint && <span className="ml-2 normal-case font-normal text-muted">— {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Textarea({ value, onChange, placeholder, rows }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      rows={rows ?? 4}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm"
    />
  );
}

function Acknowledgement({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
      <span className="text-sm text-fg">{children}</span>
    </label>
  );
}

function SaveIndicator({ state, lastSavedAt }: { state: string; lastSavedAt: Date | null }) {
  if (state === "saving") return <span className="inline-flex items-center gap-1 text-[10px] text-subtle"><Loader2 size={11} className="animate-spin" /> Saving…</span>;
  if (state === "saved" && lastSavedAt) return <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700"><Check size={11} /> Saved {Math.max(1, Math.round((Date.now() - lastSavedAt.getTime()) / 1000))} s ago</span>;
  if (state === "error") return <span className="inline-flex items-center gap-1 text-[10px] text-rose-700"><AlertCircle size={11} /> Save failed</span>;
  return <span className="text-[10px] text-subtle">Auto-save on</span>;
}
