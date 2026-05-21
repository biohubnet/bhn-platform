"use client";

/**
 * Tabbed editor for a single job folder.
 *
 * Tabs:
 *   • JD            — paste / edit the job description (markdown)
 *   • Resume        — pick the tailored resume linked to this folder
 *   • Cover letter  — long-form letter, AI-generate from JD + resume
 *   • Interview prep— prep guide, AI-generate from JD + resume
 *
 * All fields auto-save (debounced) via PATCH /api/profile/job-folders/[id].
 * AI generate endpoints return a draft; user previews + accepts
 * before it overwrites the field.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FileText, Mail, BookOpen, Briefcase, Save, Loader2, CheckCircle2, Sparkles, X, ExternalLink, AlertTriangle,
} from "lucide-react";

interface FolderInitial {
  id: string;
  title: string;
  jdSnippet: string;
  coverLetter: string;
  interviewPrep: string;
  status: string;
  resumeId: string | null;
  postingId: string | null;
  resume: { id: string; name: string; version: number } | null;
  posting: { id: string; title: string; companyName: string; positionDetails: string | null } | null;
}

interface ResumeOption { id: string; name: string }

interface Props {
  initialFolder: FolderInitial;
  resumes: ResumeOption[];
}

const STATUS_OPTIONS = [
  { value: "drafting",     label: "Drafting" },
  { value: "submitted",    label: "Submitted" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer",        label: "Offer" },
  { value: "rejected",     label: "Rejected" },
  { value: "closed",       label: "Closed" },
];

type TabId = "jd" | "resume" | "cover" | "prep";

const DEBOUNCE_MS = 700;

export function JobFolderEditor({ initialFolder, resumes }: Props) {
  const [title, setTitle] = useState(initialFolder.title);
  const [jdSnippet, setJdSnippet] = useState(initialFolder.jdSnippet);
  const [coverLetter, setCoverLetter] = useState(initialFolder.coverLetter);
  const [interviewPrep, setInterviewPrep] = useState(initialFolder.interviewPrep);
  const [status, setStatus] = useState(initialFolder.status);
  const [resumeId, setResumeId] = useState<string | null>(initialFolder.resumeId);
  const [tab, setTab] = useState<TabId>(jdSnippet ? (initialFolder.coverLetter ? "cover" : "jd") : "jd");

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const isFirst = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Snapshot — used to PATCH only the diff.
  const snapshot = useMemo(() => ({
    title, jdSnippet, coverLetter, interviewPrep, status, resumeId,
  }), [title, jdSnippet, coverLetter, interviewPrep, status, resumeId]);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/profile/job-folders/${initialFolder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        });
        setSavedAt(new Date());
      } finally { setSaving(false); }
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [snapshot, initialFolder.id]);

  return (
    <div className="space-y-4">
      {/* Header row — title + status + save indicator */}
      <div className="rounded-2xl border border-line bg-card-solid p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="inline-flex w-10 h-10 rounded-xl bg-brand-600 text-white items-center justify-center shrink-0">
            <Briefcase size={18} />
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Folder name"
            className="flex-1 min-w-0 text-base font-semibold text-fg bg-transparent border-0 focus:outline-none focus:bg-elevated rounded px-2 py-1"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-elevated border border-line rounded-md px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <p className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-fg-subtle inline-flex items-center gap-1.5">
            {saving
              ? <><Loader2 size={11} className="animate-spin" /> Saving</>
              : savedAt
                ? <><CheckCircle2 size={11} className="text-emerald-700" /> Saved</>
                : <><Save size={11} /> Auto-saves</>}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-line">
        <TabButton id="jd"     active={tab === "jd"}     onClick={() => setTab("jd")}     icon={FileText} label="Job description" />
        <TabButton id="resume" active={tab === "resume"} onClick={() => setTab("resume")} icon={FileText} label="Resume" />
        <TabButton id="cover"  active={tab === "cover"}  onClick={() => setTab("cover")}  icon={Mail}     label="Cover letter" />
        <TabButton id="prep"   active={tab === "prep"}   onClick={() => setTab("prep")}   icon={BookOpen} label="Interview prep" />
      </div>

      {/* Panels */}
      {tab === "jd" && (
        <JdPanel
          value={jdSnippet}
          onChange={setJdSnippet}
          posting={initialFolder.posting}
        />
      )}
      {tab === "resume" && (
        <ResumePanel
          resumeId={resumeId}
          resumes={resumes}
          currentResume={initialFolder.resume}
          onChange={setResumeId}
        />
      )}
      {tab === "cover" && (
        <GeneratorPanel
          kind="cover_letter"
          folderId={initialFolder.id}
          value={coverLetter}
          onChange={setCoverLetter}
          jdEmpty={!jdSnippet.trim()}
          placeholder="Paste or write your cover letter here. Click 'AI generate' to draft from the JD + linked resume."
          subtitle="3-4 paragraphs. Tone: professional, plain, no clichés."
        />
      )}
      {tab === "prep" && (
        <GeneratorPanel
          kind="interview_prep"
          folderId={initialFolder.id}
          value={interviewPrep}
          onChange={setInterviewPrep}
          jdEmpty={!jdSnippet.trim()}
          placeholder="Your interview prep notes. Click 'AI generate' for a starter guide tailored to the JD + your resume."
          subtitle="Likely questions, STAR-framed answers, questions to ask back."
        />
      )}
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────

function TabButton({
  id, active, onClick, icon: Icon, label,
}: {
  id: TabId;
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  void id;
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 -mb-px transition-colors " +
        (active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-fg-muted hover:text-fg")
      }
    >
      <Icon size={12} /> {label}
    </button>
  );
}

// ── Panels ───────────────────────────────────────────────────────

function JdPanel({
  value, onChange, posting,
}: {
  value: string;
  onChange: (v: string) => void;
  posting: FolderInitial["posting"];
}) {
  return (
    <div className="space-y-2">
      {posting && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-cyan-900">Linked posting</p>
            <p className="text-sm font-semibold text-fg mt-0.5">{posting.title}</p>
            <p className="text-[12px] text-fg-muted">{posting.companyName}</p>
          </div>
          <Link
            href={`/internships/${posting.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-cyan-900 ring-1 ring-cyan-200 hover:bg-cyan-100"
          >
            <ExternalLink size={11} /> Open
          </Link>
        </div>
      )}
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-fg-subtle">
          Job description
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={18}
          placeholder="Paste the full JD here — or just the parts that matter (responsibilities, requirements, nice-to-haves)."
          className="mt-1 w-full bg-card-solid border border-line rounded-lg px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 resize-y min-h-[300px]"
        />
      </label>
      <p className="text-[11px] text-fg-subtle">
        Markdown allowed. The AI uses this text directly to draft your cover letter + interview prep.
      </p>
    </div>
  );
}

function ResumePanel({
  resumeId, resumes, currentResume, onChange,
}: {
  resumeId: string | null;
  resumes: ResumeOption[];
  currentResume: FolderInitial["resume"];
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-card-solid p-4">
        <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-fg-subtle mb-2">
          Tailored resume
        </p>
        <select
          value={resumeId ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full bg-card-solid border border-line rounded-md px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          <option value="">— No resume linked —</option>
          {resumes.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        {currentResume && (
          <div className="mt-3 flex items-center gap-2">
            <Link
              href={`/profile/resume?id=${currentResume.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold bg-brand-600 text-white hover:bg-brand-700"
            >
              <FileText size={12} /> Open resume
            </Link>
            <Link
              href={`/profile/resume/preview?id=${currentResume.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold bg-brand-50 text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100"
            >
              <ExternalLink size={12} /> Preview PDF
            </Link>
            <p className="ml-auto text-[11px] text-fg-muted">v{currentResume.version}</p>
          </div>
        )}
      </div>
      <p className="text-[11px] text-fg-subtle">
        Linking a resume lets the AI use its actual content when drafting your cover letter + interview prep. You can change it any time.
      </p>
    </div>
  );
}

function GeneratorPanel({
  kind, folderId, value, onChange, jdEmpty, placeholder, subtitle,
}: {
  kind: "cover_letter" | "interview_prep";
  folderId: string;
  value: string;
  onChange: (v: string) => void;
  jdEmpty: boolean;
  placeholder: string;
  subtitle: string;
}) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runGenerate() {
    setError(null);
    setPreview(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/profile/job-folders/${folderId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, save: false }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; text?: string };
      if (!r.ok || !j.ok || !j.text) {
        setError(j.error ?? "AI generation failed.");
        return;
      }
      setPreview(j.text);
    } finally {
      setBusy(false);
    }
  }

  function accept() {
    if (preview === null) return;
    onChange(preview);
    setPreview(null);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-card-solid p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-subtle">
            {kind === "cover_letter" ? "Cover letter" : "Interview prep"}
          </p>
          <p className="text-[12px] text-fg-muted mt-0.5">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={runGenerate}
          disabled={busy || jdEmpty}
          title={jdEmpty
            ? "Add a job description on the JD tab first — the AI needs something to tailor to."
            : "Generate a draft from the JD + linked resume. You'll preview before it lands."}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          AI generate
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 inline-flex items-center gap-1.5">
          <AlertTriangle size={11} /> {error}
        </div>
      )}

      {/* AI preview — overwrite-confirm pattern. */}
      {preview !== null && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] font-bold text-brand-800 inline-flex items-center gap-1.5">
            <Sparkles size={10} /> AI draft — edit before accepting
          </p>
          <textarea
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
            rows={kind === "cover_letter" ? 14 : 18}
            className="w-full bg-card-solid border border-line rounded-md px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 resize-y"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-fg-muted hover:bg-fg/5"
            >
              <X size={11} /> Dismiss
            </button>
            <button
              type="button"
              onClick={accept}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-brand-600 text-white text-[11px] font-bold hover:bg-brand-700"
            >
              <CheckCircle2 size={11} /> {value.trim() ? "Replace current text" : "Use this draft"}
            </button>
          </div>
        </div>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={kind === "cover_letter" ? 18 : 22}
        placeholder={placeholder}
        className="w-full bg-card-solid border border-line rounded-lg px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 resize-y min-h-[360px]"
      />
    </div>
  );
}
