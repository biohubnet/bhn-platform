"use client";

/**
 * Tabbed editor for a single job folder.
 *
 * Tabs:
 *   • JD            — paste / edit the job description (markdown)
 *   • Resume        — pick the tailored resume linked to this folder
 *   • Cover letter  — long-form letter, AI-generate from JD + resume
 *   • Interview prep— prep guide, AI-generate from JD + resume
 *   • Role-play     — request, track, and launch the sim built from
 *                     this folder's JD (uses the SimulationRequest
 *                     queue under the hood)
 *
 * All fields auto-save (debounced) via PATCH /api/profile/job-folders/[id].
 * AI generate endpoints return a draft; user previews + accepts
 * before it overwrites the field.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FileText, Mail, BookOpen, Briefcase, Save, Loader2, CheckCircle2, Sparkles, X, ExternalLink, AlertTriangle,
  Theater, Hourglass, Play, RotateCcw,
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
  simulationRequest: {
    id: string;
    status: string;
    adminNotes: string | null;
    createdAt: string;
    simulation: { id: string; jobTitle: string; companyName: string | null } | null;
    /** Resolved server-side: the calling user's most recent attempt
     *  against the produced Simulation, if status === "ready". */
    attemptId: string | null;
  } | null;
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

type TabId = "jd" | "resume" | "cover" | "prep" | "sim";

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
        <TabButton id="sim"    active={tab === "sim"}    onClick={() => setTab("sim")}    icon={Theater}  label="Role-play" />
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
      {tab === "sim" && (
        <SimPanel
          folderId={initialFolder.id}
          simulationRequest={initialFolder.simulationRequest}
          jdEmpty={!jdSnippet.trim()}
        />
      )}
    </div>
  );
}

// ── Sim panel ────────────────────────────────────────────────────

/**
 * Role-play simulator tab. State-driven:
 *   • no request yet      → "Build a sim from this JD" CTA
 *   • pending / generating→ waiting state, soft refresh link
 *   • ready               → "Play your simulation" CTA + open the player
 *   • failed / rejected   → admin note + "Try again" button
 *
 * Submits to POST /api/profile/job-folders/[id]/sim-request which
 * either reuses the user's existing recent request for this JD (cache
 * hit) or creates a new one and atomically links the folder to it.
 */
function SimPanel({
  folderId,
  simulationRequest,
  jdEmpty,
}: {
  folderId: string;
  simulationRequest: FolderInitial["simulationRequest"];
  jdEmpty: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function buildSim() {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const res = await fetch(
        `/api/profile/job-folders/${folderId}/sim-request`,
        { method: "POST" },
      );
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setError(j.error ?? `Couldn't request the sim (HTTP ${res.status}).`);
        return;
      }
      setFlash(j.message ?? "Sim request submitted.");
      // Soft-refresh by hard-reload — the folder page state needs the
      // newly-linked SimulationRequest record to drive this panel.
      setTimeout(() => window.location.reload(), 600);
    } finally {
      setBusy(false);
    }
  }

  // ── 1. No request yet ─────────────────────────────────────────
  if (!simulationRequest) {
    return (
      <div className="rounded-2xl border border-line bg-card px-5 py-7 sm:px-8 sm:py-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-800 ring-1 ring-inset ring-brand-200">
            <Theater className="h-3 w-3" />
            Role-play game
          </div>
          <h3 className="mt-3 text-[18px] font-semibold tracking-tight text-fg">
            Build a 12-week role-play sim from this folder
          </h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
            We&apos;ll use your JD as the source. Our team builds the team,
            the scenarios, and the manager who hired you — usually within
            24 hours. You&apos;ll see it land on the Role-play page; this
            tab will switch to a Play button when it&apos;s ready.
          </p>

          {jdEmpty && (
            <div className="mt-4 rounded-md bg-amber-50 ring-1 ring-inset ring-amber-200 px-3 py-2 text-[12px] text-amber-900">
              Paste the JD body in the first tab first — sims need ≥300 characters of source text to build.
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 text-[12px] text-rose-900 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {flash && (
            <div className="mt-4 rounded-md bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-3 py-2 text-[12px] text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{flash}</span>
            </div>
          )}

          <button
            type="button"
            onClick={buildSim}
            disabled={busy || jdEmpty}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Build a role-play sim from this JD
          </button>
        </div>
      </div>
    );
  }

  // ── 2. Pending / generating ───────────────────────────────────
  const status = simulationRequest.status;
  if (status === "pending" || status === "generating") {
    return (
      <SimStatePanel
        accent="amber"
        icon={Hourglass}
        title={status === "generating" ? "Sim is being generated" : "Sim request submitted"}
        body={
          status === "generating"
            ? "An admin is generating the simulation right now. Refresh in a minute."
            : "An admin will publish your simulation to this folder soon — usually within 24 hours. We'll surface a Play button here once it's ready."
        }
        secondary={`Submitted ${new Date(simulationRequest.createdAt).toLocaleDateString()}`}
      />
    );
  }

  // ── 3. Ready ──────────────────────────────────────────────────
  if (status === "ready" && simulationRequest.simulation) {
    const sim = simulationRequest.simulation;
    return (
      <div className="rounded-2xl border border-line bg-card px-5 py-7 sm:px-8 sm:py-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Sim ready
          </div>
          <h3 className="mt-3 text-[18px] font-semibold tracking-tight text-fg">
            {sim.jobTitle}
          </h3>
          {sim.companyName && (
            <p className="text-[12.5px] text-fg-muted">{sim.companyName}</p>
          )}
          <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
            Twelve weeks of decisions tailored to this folder&apos;s JD.
            Decisions move five stats. End with a written performance review.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {simulationRequest.attemptId ? (
              <Link
                href={`/simulator/${simulationRequest.attemptId}`}
                className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                <Play className="h-4 w-4 fill-current" />
                Resume your simulation
              </Link>
            ) : (
              <Link
                href="/simulator"
                className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                <Play className="h-4 w-4 fill-current" />
                Open the player
              </Link>
            )}
            <Link
              href="/simulator"
              className="text-[12.5px] font-medium text-fg-muted hover:text-fg"
            >
              All simulations →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. Rejected / failed ──────────────────────────────────────
  return (
    <div className="rounded-2xl border border-line bg-card px-5 py-7 sm:px-8 sm:py-10">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-800 ring-1 ring-inset ring-rose-200">
          <X className="h-3 w-3" />
          {status === "rejected" ? "Request rejected" : "Generation failed"}
        </div>
        <h3 className="mt-3 text-[18px] font-semibold tracking-tight text-fg">
          {status === "rejected"
            ? "An admin sent your request back"
            : "The sim couldn't be built"}
        </h3>
        {simulationRequest.adminNotes && (
          <p className="mt-3 rounded-md bg-amber-50 ring-1 ring-inset ring-amber-200 px-3 py-2 text-[12.5px] italic text-amber-900">
            &ldquo;{simulationRequest.adminNotes}&rdquo;
          </p>
        )}
        <p className="mt-3 text-[13.5px] leading-relaxed text-fg-muted">
          Adjust the JD in the first tab — adding more of the posting body, more
          requirements, or more of the role responsibilities usually helps — and
          submit a new request.
        </p>

        {error && (
          <div className="mt-4 rounded-md bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 text-[12px] text-rose-900 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={buildSim}
          disabled={busy || jdEmpty}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Submit a new request
        </button>
      </div>
    </div>
  );
}

function SimStatePanel({
  accent,
  icon: Icon,
  title,
  body,
  secondary,
}: {
  accent: "amber" | "emerald" | "rose";
  icon: React.ElementType;
  title: string;
  body: string;
  secondary?: string;
}) {
  const accentMap = {
    amber: "bg-amber-50 text-amber-900 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    rose: "bg-rose-50 text-rose-900 ring-rose-200",
  };
  return (
    <div className={`rounded-2xl px-5 py-7 sm:px-8 sm:py-10 ring-1 ring-inset ${accentMap[accent]}`}>
      <div className="max-w-2xl flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 ring-1 ring-inset ring-current/15">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-[16px] font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-[13.5px] leading-relaxed opacity-90">{body}</p>
          {secondary && (
            <p className="mt-2 text-[11.5px] opacity-70">{secondary}</p>
          )}
        </div>
      </div>
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
