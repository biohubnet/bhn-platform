"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Loader2, AlertCircle, Save, Image as ImageIcon, Building2,
} from "lucide-react";
import { DemoFiller } from "@/components/demo/DemoFiller";
import { EMPLOYER_PROFILE_PRESETS } from "@/lib/demo/presets";

interface Profile {
  employerCompany: string | null;
  companyWebsite: string | null;
  companyLogo: string | null;
  companyIndustry: string | null;
  companySize: string | null;
  companyLocation: string | null;
  companyDescription: string | null;
  companyFounded: string | null;
}

const COMPANY_SIZES = [
  "", "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+",
] as const;

export function CompanyProfileEditor({
  initial,
}: {
  initial: Partial<Profile>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Profile>({
    employerCompany:    initial.employerCompany    ?? "",
    companyWebsite:     initial.companyWebsite     ?? "",
    companyLogo:        initial.companyLogo        ?? "",
    companyIndustry:    initial.companyIndustry    ?? "",
    companySize:        initial.companySize        ?? "",
    companyLocation:    initial.companyLocation    ?? "",
    companyDescription: initial.companyDescription ?? "",
    companyFounded:     initial.companyFounded     ?? "",
  });
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
    setValues((cur) => ({ ...cur, [k]: v }));
    setSaved(false);
  }

  async function autoFill() {
    if (!values.companyWebsite?.trim()) {
      setAutoError("Add your company website first.");
      return;
    }
    setAutoFilling(true);
    setAutoError(null);
    setAutoFilled(false);
    try {
      const res = await fetch("/api/employer/profile/auto-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: values.companyWebsite }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean; profile?: Partial<Profile> & { companyName?: string }; error?: string;
      };
      if (!res.ok || !j.profile) {
        setAutoError(j.error ?? "Couldn't fetch.");
        return;
      }
      // Map AI's companyName onto the User-side employerCompany field.
      // Don't overwrite values the user has already typed — only fill blanks.
      setValues((cur) => ({
        ...cur,
        employerCompany:    cur.employerCompany    || j.profile!.companyName        || cur.employerCompany,
        companyLogo:        cur.companyLogo        || j.profile!.companyLogo        || cur.companyLogo,
        companyIndustry:    cur.companyIndustry    || j.profile!.companyIndustry    || cur.companyIndustry,
        companySize:        cur.companySize        || j.profile!.companySize        || cur.companySize,
        companyLocation:    cur.companyLocation    || j.profile!.companyLocation    || cur.companyLocation,
        companyDescription: cur.companyDescription || j.profile!.companyDescription || cur.companyDescription,
        companyFounded:     cur.companyFounded     || j.profile!.companyFounded     || cur.companyFounded,
        companyWebsite:     j.profile!.companyWebsite || cur.companyWebsite,
      }));
      setAutoFilled(true);
    } finally {
      setAutoFilling(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/employer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setSaveError(j.error ?? "Save failed.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const cls =
    "w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500";

  return (
    <div className="space-y-4 max-w-5xl">
      <DemoFiller
        visible={true}
        presets={EMPLOYER_PROFILE_PRESETS}
        onFill={(preset) => {
          setValues((cur) => ({
            ...cur,
            ...(preset.employerCompany    !== undefined ? { employerCompany: preset.employerCompany } : {}),
            ...(preset.companyWebsite     !== undefined ? { companyWebsite: preset.companyWebsite } : {}),
            ...(preset.companyIndustry    !== undefined ? { companyIndustry: preset.companyIndustry } : {}),
            ...(preset.companySize        !== undefined ? { companySize: preset.companySize } : {}),
            ...(preset.companyLocation    !== undefined ? { companyLocation: preset.companyLocation } : {}),
            ...(preset.companyDescription !== undefined ? { companyDescription: preset.companyDescription } : {}),
            ...(preset.companyFounded     !== undefined ? { companyFounded: preset.companyFounded } : {}),
          }));
          setSaved(false);
        }}
        hint="employer profile sample"
      />
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      {/* Logo + AI-fill panel */}
      <aside className="space-y-4">
        <div className="bg-card border border-line rounded-2xl p-5 text-center">
          <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle mb-3">Company logo</div>
          {values.companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={values.companyLogo}
              alt=""
              className="w-24 h-24 mx-auto rounded-xl object-contain bg-elevated border border-line p-2"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-24 h-24 mx-auto rounded-xl bg-elevated border border-line flex items-center justify-center text-subtle">
              <ImageIcon size={28} />
            </div>
          )}
          <input
            value={values.companyLogo ?? ""}
            onChange={(e) => set("companyLogo", e.target.value)}
            placeholder="Logo URL"
            className={`${cls} mt-3 text-xs`}
          />
          <p className="text-[10px] text-subtle mt-1.5">Auto-fill grabs your favicon. Paste a wordmark URL to override.</p>
        </div>
      </aside>

      <div className="space-y-5">
        {/* AI auto-fill */}
        <section className="bg-card border border-line rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-fg">Auto-fill from your website</h2>
              <p className="text-xs text-muted mt-0.5">
                Drop in your URL — we&apos;ll fetch the homepage, ask the AI for industry / HQ / size / founding year / a short description, and pre-fill the form. Empty fields only — anything you&apos;ve already typed stays.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={values.companyWebsite ?? ""}
              onChange={(e) => set("companyWebsite", e.target.value)}
              placeholder="acme-bio.com"
              className={cls}
            />
            <button
              type="button"
              onClick={autoFill}
              disabled={autoFilling || !values.companyWebsite?.trim()}
              className="text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm shadow-brand-600/25 shrink-0"
            >
              {autoFilling ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {autoFilling ? "Fetching…" : "Auto-fill"}
            </button>
          </div>
          {autoError && (
            <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {autoError}
            </div>
          )}
          {autoFilled && !autoError && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg px-3 py-2">
              Pre-filled what we could find. Review and tweak below before saving.
            </div>
          )}
        </section>

        {/* Editable fields */}
        <section className="bg-card border border-line rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={14} className="text-brand-600" />
            <h2 className="font-semibold text-fg">Profile</h2>
          </div>
          <Field label="Company name" required>
            <input value={values.employerCompany ?? ""} onChange={(e) => set("employerCompany", e.target.value)} className={cls} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Industry">
              <input value={values.companyIndustry ?? ""} onChange={(e) => set("companyIndustry", e.target.value)} placeholder="Cell & gene therapy" className={cls} />
            </Field>
            <Field label="Company size">
              <select value={values.companySize ?? ""} onChange={(e) => set("companySize", e.target.value)} className={cls}>
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
              </select>
            </Field>
            <Field label="HQ location">
              <input value={values.companyLocation ?? ""} onChange={(e) => set("companyLocation", e.target.value)} placeholder="Toronto, ON" className={cls} />
            </Field>
            <Field label="Founded">
              <input value={values.companyFounded ?? ""} onChange={(e) => set("companyFounded", e.target.value)} placeholder="2018" className={cls} />
            </Field>
          </div>
          <Field label="Short description">
            <textarea
              value={values.companyDescription ?? ""}
              onChange={(e) => set("companyDescription", e.target.value)}
              rows={4}
              placeholder="2-4 sentences. What you make, who it's for, what stage you're at."
              className={cls}
            />
          </Field>
        </section>

        {saveError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {saveError}
          </div>
        )}
        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
            Saved.
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg inline-flex items-center gap-2 shadow-md shadow-brand-600/25"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1.5">
        {label}
        {required && <span className="text-rose-600 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
