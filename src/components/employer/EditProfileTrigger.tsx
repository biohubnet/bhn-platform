"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil, Sparkles, Loader2, AlertCircle, X, Save, ChevronDown, Globe, CheckCircle2,
} from "lucide-react";

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

/**
 * Trigger + modal for editing the company profile.
 *
 * The /employer home page leads with display surfaces (cover banner,
 * identity card, stats, postings preview). The edit form used to live
 * at the bottom of the page in an accordion; that pushed the polished
 * surfaces below the fold once it was open.
 *
 * Now: a small pencil button sits at the top of the page next to the
 * "Live" status tag. Clicking it opens this modal which leads with
 * the URL auto-fill — that's the path 95% of employers should take
 * (paste site → AI extracts industry / HQ / size / founded / logo /
 * description in one round trip). Manual field editing is still
 * available below a disclosure for power-tweaks.
 */
export function EditProfileTrigger({
  initial,
  variant = "icon",
}: {
  initial: Partial<Profile>;
  /** "icon"   — small icon-only pencil button (top-corner pairing).
   *  "button" — labelled "Edit profile" button (empty-state hero CTA). */
  variant?: "icon" | "button";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full bg-card text-fg ring-1 ring-inset ring-line hover:bg-elevated hover:ring-brand-300 hover:text-brand-700 transition-colors"
          aria-label="Edit company profile"
        >
          <Pencil size={11} /> Edit
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-600/25 transition-colors"
        >
          <Sparkles size={14} /> Set up your profile with one URL
        </button>
      )}

      {open && (
        <EditProfileModal
          initial={initial}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function EditProfileModal({
  initial,
  onClose,
}: {
  initial: Partial<Profile>;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  // ─── Form state ─────────────────────────────────────────────
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
  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
    setValues((cur) => ({ ...cur, [k]: v }));
    setSaved(false);
  }

  const [autoFilling, setAutoFilling] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // ─── Escape / click-outside to close ────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stopBackdrop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  // ─── Auto-fill ──────────────────────────────────────────────
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
        ok?: boolean;
        profile?: Partial<Profile> & { companyName?: string };
        error?: string;
      };
      if (!res.ok || !j.profile) {
        setAutoError(j.error ?? "Couldn't fetch.");
        return;
      }
      // Empty-fields-only merge — don't overwrite what the operator typed.
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
      // Surface the manual section after auto-fill so the operator
      // can immediately scan the result and tweak anything wrong.
      setManualOpen(true);
    } finally {
      setAutoFilling(false);
    }
  }

  // ─── Save ───────────────────────────────────────────────────
  async function save({ closeOnSuccess }: { closeOnSuccess: boolean }) {
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
      if (closeOnSuccess) {
        // Small delay so the success state flashes before the modal
        // disappears.
        setTimeout(() => onClose(), 300);
      }
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-60";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop p-4 sm:p-6 animate-fade-in overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <div
        ref={dialogRef}
        onClick={stopBackdrop}
        className="bg-card rounded-3xl border border-line w-full max-w-2xl my-8 shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 sm:px-8 pt-6 pb-4 border-b border-line">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
              Company profile
            </p>
            <h2 id="edit-profile-title" className="text-xl sm:text-2xl font-bold text-fg tracking-tight mt-0.5">
              Edit your company profile
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-fg hover:bg-elevated rounded-lg p-1.5 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── HERO: URL auto-fill ─────────────────────────────── */}
        {/* The whole point of the modal — make the URL-auto-fill
            path obvious and one click. Field is full-width with a
            big brand button. Helper copy explains exactly what
            fields the AI will fill in. */}
        <section className="relative px-6 sm:px-8 py-6 overflow-hidden">
          {/* Subtle aurora wash behind the field for moment-of-glow */}
          <div
            aria-hidden
            className="absolute -top-10 -right-10 w-72 h-72 rounded-full opacity-25 blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(closest-side, rgba(59,130,246,0.6), rgba(59,130,246,0) 70%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -bottom-12 left-1/4 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(closest-side, rgba(244,114,182,0.55), rgba(244,114,182,0) 70%)",
            }}
          />

          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-brand-700 mb-2 inline-flex items-center gap-1.5">
              <Sparkles size={11} /> Fastest path
            </p>
            <h3 className="text-base sm:text-lg font-bold text-fg leading-tight">
              Drop in your URL — we&apos;ll fill the rest.
            </h3>
            <p className="text-xs text-muted mt-1 leading-snug">
              AI fetches your homepage and extracts your <strong className="text-fg">industry, HQ, size, founding year, logo, and a short description</strong> in one round trip. Anything you&apos;ve already typed stays untouched.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <input
                  value={values.companyWebsite ?? ""}
                  onChange={(e) => set("companyWebsite", e.target.value)}
                  placeholder="acme-bio.com"
                  className={`${inputCls} pl-9 text-base py-2.5`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !autoFilling && values.companyWebsite?.trim()) {
                      autoFill();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={autoFill}
                disabled={autoFilling || !values.companyWebsite?.trim()}
                className="text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl inline-flex items-center justify-center gap-1.5 shadow-md shadow-brand-600/25 shrink-0"
              >
                {autoFilling ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {autoFilled ? "Re-fetch" : autoFilling ? "Fetching…" : "Auto-fill"}
              </button>
            </div>

            {autoError && (
              <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertCircle size={13} className="mt-0.5 shrink-0" /> {autoError}
              </div>
            )}
            {autoFilled && !autoError && (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                Pre-filled what we found. Review below and save — anything wrong is one tweak away.
              </div>
            )}
          </div>
        </section>

        {/* ── Manual disclosure ───────────────────────────────── */}
        <section className="border-t border-line">
          <button
            type="button"
            onClick={() => setManualOpen((v) => !v)}
            aria-expanded={manualOpen}
            className="w-full flex items-center justify-between gap-3 px-6 sm:px-8 py-3 hover:bg-elevated transition-colors"
          >
            <span className="text-sm font-semibold text-fg inline-flex items-center gap-2">
              <Pencil size={13} className="text-muted" />
              Tweak any field manually
            </span>
            <span className="text-[11px] text-subtle">
              {manualOpen ? "Hide" : "Show"} all fields
              <ChevronDown
                size={14}
                className={
                  "inline-block ml-1.5 transition-transform " +
                  (manualOpen ? "rotate-180" : "")
                }
              />
            </span>
          </button>

          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows: manualOpen ? "1fr" : "0fr" }}
            aria-hidden={!manualOpen}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="px-6 sm:px-8 pb-5 pt-1 space-y-4">
                <Field label="Company name" required>
                  <input
                    value={values.employerCompany ?? ""}
                    onChange={(e) => set("employerCompany", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Industry">
                    <input
                      value={values.companyIndustry ?? ""}
                      onChange={(e) => set("companyIndustry", e.target.value)}
                      placeholder="Cell & gene therapy"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Company size">
                    <select
                      value={values.companySize ?? ""}
                      onChange={(e) => set("companySize", e.target.value)}
                      className={inputCls}
                    >
                      {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
                    </select>
                  </Field>
                  <Field label="HQ location">
                    <input
                      value={values.companyLocation ?? ""}
                      onChange={(e) => set("companyLocation", e.target.value)}
                      placeholder="Toronto, ON"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Founded">
                    <input
                      value={values.companyFounded ?? ""}
                      onChange={(e) => set("companyFounded", e.target.value)}
                      placeholder="2018"
                      className={inputCls}
                    />
                  </Field>
                </div>
                <Field label="Short description">
                  <textarea
                    value={values.companyDescription ?? ""}
                    onChange={(e) => set("companyDescription", e.target.value)}
                    rows={3}
                    placeholder="2-4 sentences. What you make, who it's for, what stage you're at."
                    className={`${inputCls} resize-y`}
                  />
                </Field>
                <Field label="Logo URL (override)">
                  <div className="flex items-center gap-3">
                    {values.companyLogo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={values.companyLogo}
                        alt=""
                        className="w-10 h-10 rounded-lg object-contain bg-elevated border border-line p-1 shrink-0"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <input
                      type="url"
                      value={values.companyLogo ?? ""}
                      onChange={(e) => set("companyLogo", e.target.value)}
                      placeholder="https://your-site.com/logo.png"
                      className={inputCls}
                    />
                  </div>
                  <p className="text-[10px] text-subtle mt-1 leading-snug">
                    Auto-fill grabs your favicon automatically. Paste a URL here to override.
                  </p>
                </Field>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer: save / cancel ─────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-6 sm:px-8 py-4 border-t border-line bg-elevated/40">
          <div className="min-w-0">
            {saveError && (
              <p className="text-xs text-rose-700 inline-flex items-center gap-1.5">
                <AlertCircle size={12} /> {saveError}
              </p>
            )}
            {saved && !saveError && (
              <p className="text-xs text-emerald-700 inline-flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Saved.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-muted hover:text-fg hover:bg-elevated px-3 py-2 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => save({ closeOnSuccess: true })}
              disabled={saving}
              className="text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-brand-600/25"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, required, children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-1.5">
        {label}
        {required && <span className="text-rose-600 ml-0.5 normal-case">*</span>}
      </span>
      {children}
    </label>
  );
}
