"use client";
/**
 * Inline new-posting composer for the HR workspace.
 *
 * Paste a JD → AI fills in company/title/duration/comp/skills/details
 * → review → publish. Renders inside the postings list as an
 * expanding panel — no navigation away.
 *
 * Reuses
 *   POST /api/admin/internships/parse  → AI autofill from raw JD
 *   POST /api/admin/internships        → create the posting row
 *
 * Both endpoints accept employer + admin + superadmin (relaxed from
 * the original admin-only gate so this inline composer can run for
 * any HR account).
 */
import { useState } from "react";
import {
  Loader2, Sparkles, X, Wand2, FilePlus, AlertCircle, CheckCircle2,
} from "lucide-react";

interface Props {
  onClose: () => void;
  onCreated: (postingId: string) => void;
}

interface Parsed {
  companyName?: string;
  title?: string;
  duration?: string;
  hours?: string;
  location?: string;
  type?: string;
  compensation?: string;
  keySkills?: string[];
  positionDetails?: string;
  contactEmail?: string;
}

export function NewPostingInline({ onClose, onCreated }: Props) {
  const [jd, setJd] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable fields (populated by parse or filled manually)
  const [companyName, setCompanyName]   = useState("");
  const [title, setTitle]               = useState("");
  const [location, setLocation]         = useState("");
  const [duration, setDuration]         = useState("");
  const [hours, setHours]               = useState("");
  const [type, setType]                 = useState("");
  const [compensation, setCompensation] = useState("");
  const [keySkills, setKeySkills]       = useState<string>("");
  const [positionDetails, setPositionDetails] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [publishing, setPublishing] = useState(false);

  async function parse() {
    if (jd.trim().length < 40) {
      setError("Paste at least a few sentences from the JD so the AI has something to work with.");
      return;
    }
    setParsing(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/internships/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: jd }),
      });
      const j = await r.json();
      if (!r.ok || !j) {
        setError(j?.error ?? "Couldn't parse the JD.");
        return;
      }
      const p: Parsed = j;
      setParsed(p);
      // Pre-fill every form field. The user can edit before publishing.
      setCompanyName(p.companyName ?? "");
      setTitle(p.title ?? "");
      setLocation(p.location ?? "");
      setDuration(p.duration ?? "");
      setHours(p.hours ?? "");
      setType(p.type ?? "");
      setCompensation(p.compensation ?? "");
      setKeySkills((p.keySkills ?? []).join(", "));
      setPositionDetails(p.positionDetails ?? "");
      setContactEmail(p.contactEmail ?? "");
    } finally {
      setParsing(false);
    }
  }

  async function publish(asDraft: boolean) {
    if (!companyName.trim() || !title.trim() || !positionDetails.trim()) {
      setError("Company name, title, and position details are all required.");
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          title: title.trim(),
          location: location.trim() || null,
          duration: duration.trim() || null,
          hours: hours.trim() || null,
          type: type.trim() || null,
          compensation: compensation.trim() || null,
          keySkills: keySkills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5),
          positionDetails: positionDetails.trim(),
          status: asDraft ? "draft" : "active",
          contactEmail: contactEmail.trim() || null,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setError(j?.error ?? "Couldn't publish.");
        return;
      }
      onCreated(j.posting.id);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <article className="rounded-2xl border border-brand-200 bg-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line/70 bg-brand-50/30">
        <h3 className="text-base font-bold text-fg inline-flex items-center gap-2 tracking-tight">
          <FilePlus size={15} className="text-brand-600" /> New posting
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-fg p-1 rounded-lg hover:bg-elevated"
          aria-label="Cancel"
        >
          <X size={16} />
        </button>
      </header>

      {/* Stage 1 — paste + parse */}
      {!parsed && (
        <div className="p-5 space-y-3">
          <label className="block">
            <span className="block text-sm font-semibold text-fg mb-1.5">
              Paste a job description
            </span>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={10}
              placeholder="Paste the JD here — even a rough one. The AI will pull out title, location, comp, key skills, and the position summary."
              className="w-full text-sm text-fg bg-card border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-y"
            />
          </label>
          {error && (
            <p className="text-xs text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-lg px-3 py-2 inline-flex items-start gap-1.5">
              <AlertCircle size={11} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={parse}
              disabled={parsing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-50 shadow-md shadow-brand-600/25"
            >
              {parsing ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
              {parsing ? "Parsing…" : "AI autofill"}
            </button>
            <button
              type="button"
              onClick={() => setParsed({} as Parsed)}
              className="text-xs text-muted hover:text-fg"
            >
              Skip & fill manually →
            </button>
          </div>
        </div>
      )}

      {/* Stage 2 — review + edit + publish */}
      {parsed && (
        <div className="p-5 space-y-4">
          {Object.keys(parsed).length > 0 && (
            <p className="text-xs text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-lg px-3 py-2 inline-flex items-start gap-1.5">
              <Sparkles size={11} className="mt-0.5 shrink-0" />
              AI autofilled what it could find. Review every field below — you&apos;re the source of truth.
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Company name *" value={companyName} onChange={setCompanyName} placeholder="Veridiom Therapeutics" />
            <Field label="Job title *" value={title} onChange={setTitle} placeholder="Manufacturing Process Associate" />
            <Field label="Location" value={location} onChange={setLocation} placeholder="Toronto, ON" />
            <Field label="Duration" value={duration} onChange={setDuration} placeholder="16 weeks" />
            <Field label="Hours" value={hours} onChange={setHours} placeholder="37.5 hrs/week" />
            <Field label="Type" value={type} onChange={setType} placeholder="Full-time, in-person" />
            <Field label="Compensation" value={compensation} onChange={setCompensation} placeholder="$24/hr + transit pass" />
            <Field label="Contact email" value={contactEmail} onChange={setContactEmail} placeholder="hiring@company.com" />
          </div>

          <label className="block">
            <span className="block text-sm font-semibold text-fg mb-1.5">
              Key skills (comma-separated, up to 5)
            </span>
            <input
              type="text"
              value={keySkills}
              onChange={(e) => setKeySkills(e.target.value)}
              placeholder="GMP, Aseptic technique, Bioreactor operations"
              className="w-full text-sm bg-card border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-semibold text-fg mb-1.5">
              Position details *
            </span>
            <textarea
              value={positionDetails}
              onChange={(e) => setPositionDetails(e.target.value)}
              rows={8}
              placeholder="What the trainee will do, who they'll work with, what success looks like…"
              className="w-full text-sm text-fg bg-card border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-y"
            />
          </label>

          {error && (
            <p className="text-xs text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-lg px-3 py-2 inline-flex items-start gap-1.5">
              <AlertCircle size={11} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => publish(true)}
              disabled={publishing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-fg ring-1 ring-line hover:bg-elevated disabled:opacity-50"
            >
              {publishing ? <Loader2 size={13} className="animate-spin" /> : null}
              Save as draft
            </button>
            <button
              type="button"
              onClick={() => publish(false)}
              disabled={publishing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 shadow-md shadow-brand-600/25"
            >
              {publishing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Publish now
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-fg mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm bg-card border border-line rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      />
    </label>
  );
}
