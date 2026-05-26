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
import { useRouter } from "next/navigation";
import {
  FileText, Mail, BookOpen, Briefcase, Save, Loader2, CheckCircle2, Sparkles, X, ExternalLink, AlertTriangle,
  Theater, Hourglass, Play, RotateCcw, Download, Copy, Printer, StickyNote, Activity, Calendar, User as UserIcon, Link2,
  Target, ArrowRightLeft, Inbox, Share2, Trash2, Gauge,
} from "lucide-react";
import { scoreSkillMatch, type SkillMatchResult } from "@/lib/job-folders/skill-match";

interface FolderInitial {
  id: string;
  title: string;
  jdSnippet: string;
  coverLetter: string;
  interviewPrep: string;
  notes: string;
  status: string;
  resumeId: string | null;
  postingId: string | null;
  resume: { id: string; name: string; version: number } | null;
  posting: { id: string; title: string; companyName: string; positionDetails: string | null } | null;
  // Application tracker fields — all ISO strings on the wire,
  // converted to / from native Date in the inputs.
  applicationUrl: string | null;
  appliedAt: string | null;
  deadline: string | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  referredBy: string | null;
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
  events: Array<{
    id: string;
    kind: string;
    body: string;
    createdAt: string;
  }>;
  /** Raw ResumeContent JSON for the linked resume — drives client-
   *  side skill-match scoring without a server round-trip on every
   *  JD keystroke. Null when no resume is linked. */
  resumeContent: unknown;
  /** Other folders' cover letters (latest 10, non-empty) — fuel for
   *  the "Pull from past" sidebar on the cover-letter tab. */
  pastCoverLetters: Array<{
    id: string;
    title: string;
    coverLetter: string;
    updatedAt: string;
  }>;
  /** Trainee's Story Bank entries — fuel for the STAR cross-link
   *  sidebar on the interview-prep tab. */
  starStories: Array<{
    id: string;
    title: string;
    situation: string;
    skills: string[];
  }>;
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

type TabId = "jd" | "resume" | "cover" | "prep" | "notes" | "sim" | "timeline";

const DEBOUNCE_MS = 700;

export function JobFolderEditor({ initialFolder, resumes }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialFolder.title);
  const [jdSnippet, setJdSnippet] = useState(initialFolder.jdSnippet);
  const [coverLetter, setCoverLetter] = useState(initialFolder.coverLetter);
  const [interviewPrep, setInterviewPrep] = useState(initialFolder.interviewPrep);
  const [notes, setNotes] = useState(initialFolder.notes);
  const [status, setStatus] = useState(initialFolder.status);
  const [resumeId, setResumeId] = useState<string | null>(initialFolder.resumeId);
  const [tab, setTab] = useState<TabId>(jdSnippet ? (initialFolder.coverLetter ? "cover" : "jd") : "jd");

  // Application tracker fields — held as local state so the meta strip
  // auto-saves the same way the body fields do.
  const [applicationUrl, setApplicationUrl] = useState(initialFolder.applicationUrl ?? "");
  const [appliedAt, setAppliedAt] = useState(toDateInputValue(initialFolder.appliedAt));
  const [deadline, setDeadline] = useState(toDateInputValue(initialFolder.deadline));
  const [recruiterName, setRecruiterName] = useState(initialFolder.recruiterName ?? "");
  const [recruiterEmail, setRecruiterEmail] = useState(initialFolder.recruiterEmail ?? "");
  const [referredBy, setReferredBy] = useState(initialFolder.referredBy ?? "");

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const isFirst = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Snapshot — used to PATCH only the diff.
  const snapshot = useMemo(
    () => ({
      title,
      jdSnippet,
      coverLetter,
      interviewPrep,
      notes,
      status,
      resumeId,
      applicationUrl: applicationUrl.trim() || null,
      appliedAt: fromDateInputValue(appliedAt),
      deadline: fromDateInputValue(deadline),
      recruiterName: recruiterName.trim() || null,
      recruiterEmail: recruiterEmail.trim() || null,
      referredBy: referredBy.trim() || null,
    }),
    [title, jdSnippet, coverLetter, interviewPrep, notes, status, resumeId, applicationUrl, appliedAt, deadline, recruiterName, recruiterEmail, referredBy],
  );

  async function duplicate() {
    if (duplicating) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/profile/job-folders/${initialFolder.id}/duplicate`, {
        method: "POST",
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        folder?: { id: string };
        error?: string;
      };
      if (res.ok && j.ok && j.folder) {
        router.push(`/profile/job-folders/${j.folder.id}`);
        return;
      }
      // Surface a soft error rather than throwing — user can retry.
      console.error("[duplicate] failed:", j.error);
      setDuplicating(false);
    } catch (err) {
      console.error("[duplicate] threw:", err);
      setDuplicating(false);
    }
  }

  // Days-until-deadline banner — shows when within 7 days.
  const deadlineCountdown = useMemo(() => {
    if (!deadline) return null;
    const d = new Date(deadline);
    if (Number.isNaN(d.getTime())) return null;
    const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
    if (days < -1 || days > 7) return null;
    return { date: d, days };
  }, [deadline]);

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
          <a
            href={`/api/profile/job-folders/${initialFolder.id}/download`}
            download
            title="Download JD, Resume, Cover letter, Interview prep, and Notes as one Markdown file. Role-play sim is not included."
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200 px-3 py-1.5 text-[12px] font-semibold hover:bg-brand-100 transition-colors"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Download</span>
          </a>
          <Link
            href={`/profile/job-folders/${initialFolder.id}/print`}
            target="_blank"
            title="Print-ready view — cover letter + resume only, formatted for attaching to an application."
            className="inline-flex items-center gap-1.5 rounded-md bg-elevated text-fg ring-1 ring-inset ring-line px-3 py-1.5 text-[12px] font-semibold hover:bg-line transition-colors"
          >
            <Printer size={13} />
            <span className="hidden sm:inline">Print</span>
          </Link>
          <button
            type="button"
            onClick={duplicate}
            disabled={duplicating}
            title="Create a copy of this folder with the JD, resume link, and recruiter info — but with a blank cover letter and interview prep."
            className="inline-flex items-center gap-1.5 rounded-md bg-elevated text-fg ring-1 ring-inset ring-line px-3 py-1.5 text-[12px] font-semibold hover:bg-line transition-colors disabled:opacity-50"
          >
            {duplicating ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
            <span className="hidden sm:inline">Duplicate</span>
          </button>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            title="Generate a read-only share link to send a mentor for review."
            className="inline-flex items-center gap-1.5 rounded-md bg-elevated text-fg ring-1 ring-inset ring-line px-3 py-1.5 text-[12px] font-semibold hover:bg-line transition-colors"
          >
            <Share2 size={13} />
            <span className="hidden sm:inline">Share</span>
          </button>
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

      {/* Deadline-soon banner */}
      {deadlineCountdown && (
        <div
          className={`rounded-xl px-4 py-3 text-[13px] ring-1 ring-inset flex items-start gap-2 ${
            deadlineCountdown.days < 0
              ? "bg-rose-50 ring-rose-200 text-rose-900"
              : deadlineCountdown.days <= 2
                ? "bg-amber-50 ring-amber-200 text-amber-900"
                : "bg-sky-50 ring-sky-200 text-sky-900"
          }`}
        >
          <Calendar size={14} className="shrink-0 mt-0.5" />
          <span>
            {deadlineCountdown.days < 0
              ? `Deadline was ${deadlineCountdown.date.toLocaleDateString()} — ${Math.abs(deadlineCountdown.days)} day${Math.abs(deadlineCountdown.days) === 1 ? "" : "s"} ago.`
              : deadlineCountdown.days === 0
                ? `Deadline is TODAY (${deadlineCountdown.date.toLocaleDateString()}). Submit if you're going to.`
                : `Deadline ${deadlineCountdown.date.toLocaleDateString()} — ${deadlineCountdown.days} day${deadlineCountdown.days === 1 ? "" : "s"} out.`}
          </span>
        </div>
      )}

      {/* Application tracker strip */}
      <TrackerStrip
        applicationUrl={applicationUrl}
        appliedAt={appliedAt}
        deadline={deadline}
        recruiterName={recruiterName}
        recruiterEmail={recruiterEmail}
        referredBy={referredBy}
        onChange={{
          applicationUrl: setApplicationUrl,
          appliedAt: setAppliedAt,
          deadline: setDeadline,
          recruiterName: setRecruiterName,
          recruiterEmail: setRecruiterEmail,
          referredBy: setReferredBy,
        }}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-line overflow-x-auto">
        <TabButton id="jd"       active={tab === "jd"}       onClick={() => setTab("jd")}       icon={FileText}   label="JD" />
        <TabButton id="resume"   active={tab === "resume"}   onClick={() => setTab("resume")}   icon={FileText}   label="Resume" />
        <TabButton id="cover"    active={tab === "cover"}    onClick={() => setTab("cover")}    icon={Mail}       label="Cover letter" />
        <TabButton id="prep"     active={tab === "prep"}     onClick={() => setTab("prep")}     icon={BookOpen}   label="Interview prep" />
        <TabButton id="notes"    active={tab === "notes"}    onClick={() => setTab("notes")}    icon={StickyNote} label="Notes" />
        <TabButton id="sim"      active={tab === "sim"}      onClick={() => setTab("sim")}      icon={Theater}    label="Role-play" />
        <TabButton id="timeline" active={tab === "timeline"} onClick={() => setTab("timeline")} icon={Activity}   label="Timeline" />
      </div>

      {/* Panels */}
      {tab === "jd" && (
        <JdPanel
          folderId={initialFolder.id}
          value={jdSnippet}
          onChange={setJdSnippet}
          posting={initialFolder.posting}
          resumeContent={initialFolder.resumeContent}
          resumeLinked={!!initialFolder.resume}
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
          <GeneratorPanel
            kind="cover_letter"
            folderId={initialFolder.id}
            value={coverLetter}
            onChange={setCoverLetter}
            jdEmpty={!jdSnippet.trim()}
            placeholder="Paste or write your cover letter here. Click 'AI generate' to draft from the JD + linked resume."
            subtitle="3-4 paragraphs. Tone: professional, plain, no clichés."
          />
          <PullFromPastSidebar
            pastCoverLetters={initialFolder.pastCoverLetters}
            onInsert={(text) =>
              setCoverLetter((cur) => (cur.trim() ? `${cur.trimEnd()}\n\n${text}` : text))
            }
          />
        </div>
      )}
      {tab === "prep" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
          <GeneratorPanel
            kind="interview_prep"
            folderId={initialFolder.id}
            value={interviewPrep}
            onChange={setInterviewPrep}
            jdEmpty={!jdSnippet.trim()}
            placeholder="Your interview prep notes. Click 'AI generate' for a starter guide tailored to the JD + your resume."
            subtitle="Likely questions, STAR-framed answers, questions to ask back."
          />
          <StarStorySidebar
            stories={initialFolder.starStories}
            jd={jdSnippet}
            onInsert={(story) =>
              setInterviewPrep((cur) => {
                const block =
                  `### ${story.title}\n\n` +
                  `**Situation.** ${story.situation}\n\n` +
                  `*(Pulled from your Story Bank — flesh out Task / Action / Result inline.)*`;
                return cur.trim() ? `${cur.trimEnd()}\n\n${block}` : block;
              })
            }
          />
        </div>
      )}
      {tab === "notes" && (
        <NotesPanel value={notes} onChange={setNotes} />
      )}
      {tab === "sim" && (
        <SimPanel
          folderId={initialFolder.id}
          simulationRequest={initialFolder.simulationRequest}
          jdEmpty={!jdSnippet.trim()}
        />
      )}
      {tab === "timeline" && (
        <TimelinePanel events={initialFolder.events} />
      )}
      {shareOpen && (
        <ShareDialog
          folderId={initialFolder.id}
          folderTitle={initialFolder.title}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

// ── Share dialog ────────────────────────────────────────────────

interface ShareTokenRow {
  id: string;
  token: string;
  label: string | null;
  expiresAt: string | null;
  createdAt: string;
}

function ShareDialog({
  folderId,
  folderTitle,
  onClose,
}: {
  folderId: string;
  folderTitle: string;
  onClose: () => void;
}) {
  const [tokens, setTokens] = useState<ShareTokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [expiresInHours, setExpiresInHours] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState<string | null>(null);

  // Load tokens once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/profile/job-folders/${folderId}/share`);
      const j = (await res.json().catch(() => null)) as { ok?: boolean; tokens?: ShareTokenRow[] } | null;
      if (!cancelled) {
        setTokens(j?.tokens ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [folderId]);

  // Lock scroll while open + ESC closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function createToken() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/profile/job-folders/${folderId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || null,
          expiresInHours: expiresInHours ? Number(expiresInHours) : null,
        }),
      });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; token?: ShareTokenRow; error?: string } | null;
      if (!res.ok || !j?.ok || !j.token) {
        setError(j?.error ?? "Couldn't generate link.");
        return;
      }
      setTokens((cur) => [j.token!, ...cur]);
      setLabel("");
      setExpiresInHours("");
    } finally { setCreating(false); }
  }

  async function revoke(id: string) {
    await fetch(`/api/profile/job-folders/${folderId}/share?tokenId=${id}`, { method: "DELETE" });
    setTokens((cur) => cur.filter((t) => t.id !== id));
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/share/folder/${token}`;
    navigator.clipboard.writeText(url).catch(() => null);
    setJustCopied(token);
    setTimeout(() => setJustCopied(null), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-card-solid shadow-2xl ring-1 ring-line overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-subtle inline-flex items-center gap-1.5">
              <Share2 size={11} /> Share folder
            </p>
            <h2 className="text-[16px] font-bold text-fg mt-0.5 truncate">{folderTitle}</h2>
            <p className="text-[11.5px] text-fg-muted mt-0.5">
              Read-only · no login required for the recipient
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-md hover:bg-elevated text-fg-subtle"
          >
            <X size={16} />
          </button>
        </header>

        <div className="p-5 space-y-4">
          {/* New link form */}
          <div className="rounded-xl bg-elevated/40 ring-1 ring-inset ring-line p-3 space-y-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-fg-subtle">
                Label (optional)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. For Diane to review before Friday"
                maxLength={80}
                className="mt-1 w-full bg-card border border-line rounded px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-fg-subtle">
                Expires after
              </label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(e.target.value)}
                className="mt-1 w-full bg-card border border-line rounded px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Never (until I revoke)</option>
                <option value="24">24 hours</option>
                <option value="168">7 days</option>
                <option value="720">30 days</option>
              </select>
            </div>
            {error && (
              <p className="text-[12px] text-rose-700">{error}</p>
            )}
            <button
              type="button"
              onClick={createToken}
              disabled={creating}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-brand-600 text-white px-3 py-2 text-[12.5px] font-semibold hover:bg-brand-700 disabled:opacity-50"
            >
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
              Generate new share link
            </button>
          </div>

          {/* Existing links */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fg-subtle mb-2">
              Active links ({tokens.length})
            </p>
            {loading ? (
              <div className="text-[12px] text-fg-muted inline-flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Loading…
              </div>
            ) : tokens.length === 0 ? (
              <p className="text-[12px] text-fg-muted italic">No active links. Generate one above.</p>
            ) : (
              <ul className="space-y-2">
                {tokens.map((t) => {
                  const url = `/share/folder/${t.token}`;
                  const expired = t.expiresAt && new Date(t.expiresAt).getTime() < Date.now();
                  return (
                    <li
                      key={t.id}
                      className="rounded-md bg-card ring-1 ring-inset ring-line p-2.5 text-[12px]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {t.label && (
                            <p className="font-semibold text-fg">{t.label}</p>
                          )}
                          <p className="text-[10.5px] font-mono text-fg-muted truncate">
                            {url}
                          </p>
                          <p className="text-[10.5px] text-fg-subtle mt-0.5">
                            Created {new Date(t.createdAt).toLocaleDateString()}
                            {t.expiresAt
                              ? ` · ${expired ? "EXPIRED" : `expires ${new Date(t.expiresAt).toLocaleDateString()}`}`
                              : " · no expiry"}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => copyLink(t.token)}
                            className="p-1.5 rounded hover:bg-elevated text-fg-muted hover:text-fg"
                            title="Copy share URL"
                          >
                            {justCopied === t.token ? (
                              <CheckCircle2 size={13} className="text-emerald-700" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => revoke(t.id)}
                            className="p-1.5 rounded hover:bg-rose-50 text-rose-700"
                            title="Revoke"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="text-[10.5px] text-fg-subtle leading-relaxed">
            Mentor sees JD, resume, cover letter, interview prep, and notes — no role-play sim. Anyone with the link can read; nobody can edit.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Date input helpers ──────────────────────────────────────────

/** ISO string from DB → "YYYY-MM-DD" for <input type="date">. */
function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" from input → ISO string for the PATCH body, or null
 *  when cleared. Treats date-only as local midnight so the date the
 *  user picked doesn't drift across timezones. */
function fromDateInputValue(v: string): string | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  // Build at noon local to avoid the "saved as the day before" off-
  // by-one when the user is east of UTC.
  const d = new Date(trimmed + "T12:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ── Application tracker strip ────────────────────────────────────

function TrackerStrip({
  applicationUrl, appliedAt, deadline, recruiterName, recruiterEmail, referredBy,
  onChange,
}: {
  applicationUrl: string;
  appliedAt: string;
  deadline: string;
  recruiterName: string;
  recruiterEmail: string;
  referredBy: string;
  onChange: {
    applicationUrl: (v: string) => void;
    appliedAt: (v: string) => void;
    deadline: (v: string) => void;
    recruiterName: (v: string) => void;
    recruiterEmail: (v: string) => void;
    referredBy: (v: string) => void;
  };
}) {
  return (
    <details className="rounded-2xl border border-line bg-card-solid">
      <summary className="cursor-pointer select-none px-4 py-2.5 flex items-center gap-2 text-[12px] text-fg-muted hover:bg-elevated/40 rounded-2xl">
        <Activity size={12} />
        <span className="font-semibold text-fg">Application tracker</span>
        <span className="text-fg-subtle">— deadline, applied date, recruiter</span>
      </summary>
      <div className="px-4 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-[12.5px]">
        <FieldGroup label="Applied on" icon={Calendar}>
          <input
            type="date"
            value={appliedAt}
            onChange={(e) => onChange.appliedAt(e.target.value)}
            className="trackerInput"
          />
        </FieldGroup>
        <FieldGroup label="Deadline" icon={Calendar}>
          <input
            type="date"
            value={deadline}
            onChange={(e) => onChange.deadline(e.target.value)}
            className="trackerInput"
          />
        </FieldGroup>
        <FieldGroup label="Application URL" icon={Link2}>
          <input
            type="url"
            value={applicationUrl}
            onChange={(e) => onChange.applicationUrl(e.target.value)}
            placeholder="https://…"
            className="trackerInput"
          />
        </FieldGroup>
        <FieldGroup label="Recruiter / hiring manager" icon={UserIcon}>
          <input
            type="text"
            value={recruiterName}
            onChange={(e) => onChange.recruiterName(e.target.value)}
            placeholder="Name"
            className="trackerInput"
          />
        </FieldGroup>
        <FieldGroup label="Recruiter email" icon={Mail}>
          <input
            type="email"
            value={recruiterEmail}
            onChange={(e) => onChange.recruiterEmail(e.target.value)}
            placeholder="name@example.com"
            className="trackerInput"
          />
        </FieldGroup>
        <FieldGroup label="Referred by" icon={UserIcon}>
          <input
            type="text"
            value={referredBy}
            onChange={(e) => onChange.referredBy(e.target.value)}
            placeholder="(optional)"
            className="trackerInput"
          />
        </FieldGroup>
      </div>
      <style>{`.trackerInput{display:block;width:100%;background:var(--card,#fff);border:1px solid var(--line,#e5e7eb);border-radius:6px;padding:6px 9px;font-size:12.5px;color:var(--fg,#111);outline:none;}.trackerInput:focus{border-color:#6366f1;box-shadow:0 0 0 2px rgba(99,102,241,.18);}`}</style>
    </details>
  );
}

function FieldGroup({
  label, icon: Icon, children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-subtle inline-flex items-center gap-1.5 mb-1">
        <Icon size={10} /> {label}
      </span>
      {children}
    </label>
  );
}

// ── Notes panel ──────────────────────────────────────────────────

function NotesPanel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-5 py-5 sm:px-7 sm:py-7">
      <div className="mb-3">
        <h3 className="text-[14px] font-semibold text-fg">Folder notes</h3>
        <p className="text-[12.5px] text-muted mt-1">
          A scratchpad for things that don&apos;t fit anywhere else — recruiter conversations, salary band, things to remember before the interview. Markdown OK. Auto-saves.
        </p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={16}
        placeholder={"e.g.\n\n- Recruiter called Tuesday 3pm — agreed to phone screen May 28\n- Salary band: $74–82k + bonus, mentioned in 2nd round\n- They specifically asked about my Pichia work — emphasise that in cover letter\n- Met someone from the team at ESMO; they recommended I mention X"}
        className="w-full rounded-md border border-line bg-card-solid px-3 py-2.5 text-sm font-mono resize-y min-h-[280px] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
      />
    </div>
  );
}

// ── Timeline panel ───────────────────────────────────────────────

const EVENT_ACCENT: Record<string, string> = {
  created:             "bg-brand-100   text-brand-800   ring-brand-200",
  status_changed:      "bg-sky-100     text-sky-900     ring-sky-200",
  applied:             "bg-emerald-100 text-emerald-900 ring-emerald-200",
  sim_requested:       "bg-violet-100  text-violet-900  ring-violet-200",
  sim_ready:           "bg-emerald-100 text-emerald-900 ring-emerald-200",
  sim_rejected:        "bg-rose-100    text-rose-900    ring-rose-200",
  sim_failed:          "bg-rose-100    text-rose-900    ring-rose-200",
  duplicated:          "bg-amber-100   text-amber-900   ring-amber-200",
  interview_scheduled: "bg-cyan-100    text-cyan-900    ring-cyan-200",
  deadline_set:        "bg-amber-100   text-amber-900   ring-amber-200",
  deadline_cleared:    "bg-card-solid  text-fg-muted    ring-line",
  manual:              "bg-card-solid  text-fg-muted    ring-line",
};

function TimelinePanel({
  events,
}: {
  events: FolderInitial["events"];
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card px-5 py-10 text-center">
        <Activity size={20} className="mx-auto text-fg-subtle" />
        <p className="mt-2 text-[13px] font-semibold text-fg">
          No timeline events yet
        </p>
        <p className="text-[12px] text-muted mt-1 max-w-md mx-auto">
          We auto-log status changes, sim requests, applied date, deadline updates,
          and duplicates as you work. The history of this application will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-line bg-card overflow-hidden">
      <header className="px-5 py-3 border-b border-line bg-elevated/40">
        <h3 className="text-[13px] font-semibold text-fg inline-flex items-center gap-2">
          <Activity size={13} /> Timeline ({events.length})
        </h3>
      </header>
      <ul className="divide-y divide-line">
        {events.map((e) => {
          const accent = EVENT_ACCENT[e.kind] ?? EVENT_ACCENT.manual;
          return (
            <li key={e.id} className="px-5 py-3 flex items-start gap-3">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.14em] font-bold ring-1 ring-inset shrink-0 ${accent}`}>
                {e.kind.replace(/_/g, " ")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-fg">{e.body}</p>
                <p className="text-[10.5px] text-fg-subtle mt-0.5">
                  {new Date(e.createdAt).toLocaleString()}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
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
  const router = useRouter();
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
      // Server-side refresh — re-fetches the page's data including
      // the new simulationRequest row without losing tab state or
      // unsaved field edits.
      router.refresh();
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

// ── Pull-from-past sidebar (cover letter tab) ───────────────────

function PullFromPastSidebar({
  pastCoverLetters,
  onInsert,
}: {
  pastCoverLetters: FolderInitial["pastCoverLetters"];
  onInsert: (text: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (pastCoverLetters.length === 0) {
    return (
      <aside className="rounded-2xl border border-dashed border-line bg-card-solid p-4 text-[12px] text-fg-muted h-fit">
        <div className="inline-flex items-center gap-1.5 text-fg-subtle text-[10px] font-bold uppercase tracking-[0.18em] mb-2">
          <ArrowRightLeft size={11} /> Pull from past
        </div>
        <p className="leading-relaxed">
          Once you&apos;ve drafted other cover letters, paragraphs from them will surface here so you can re-use phrasings.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-2xl border border-line bg-card-solid h-fit overflow-hidden">
      <header className="px-3 py-2 border-b border-line bg-elevated/40">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle inline-flex items-center gap-1.5">
          <ArrowRightLeft size={11} /> Pull from past
        </p>
        <p className="text-[11px] text-fg-muted mt-0.5">
          {pastCoverLetters.length} cover letter{pastCoverLetters.length === 1 ? "" : "s"} you&apos;ve written
        </p>
      </header>
      <ul className="divide-y divide-line max-h-[420px] overflow-y-auto">
        {pastCoverLetters.map((p) => {
          const isOpen = expandedId === p.id;
          // Paragraph split — first non-empty paragraph as a preview;
          // rest available on expand.
          const paragraphs = p.coverLetter
            .split(/\n{2,}/)
            .map((s) => s.trim())
            .filter(Boolean);
          return (
            <li key={p.id} className="px-3 py-2.5">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : p.id)}
                className="w-full text-left"
              >
                <p className="text-[12px] font-semibold text-fg line-clamp-1">{p.title}</p>
                <p className="text-[11px] text-fg-muted line-clamp-2 mt-0.5">
                  {paragraphs[0] ?? "(empty)"}
                </p>
              </button>
              {isOpen && (
                <div className="mt-2 space-y-1.5">
                  {paragraphs.map((para, i) => (
                    <div key={i} className="rounded-md bg-elevated/40 ring-1 ring-inset ring-line px-2 py-1.5">
                      <p className="text-[11px] text-fg leading-relaxed line-clamp-4">{para}</p>
                      <button
                        type="button"
                        onClick={() => onInsert(para)}
                        className="mt-1 text-[10.5px] font-semibold text-brand-700 hover:underline"
                      >
                        Insert into draft →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

// ── STAR story sidebar (interview prep tab) ─────────────────────

function StarStorySidebar({
  stories,
  jd,
  onInsert,
}: {
  stories: FolderInitial["starStories"];
  jd: string;
  onInsert: (story: FolderInitial["starStories"][number]) => void;
}) {
  // Surface JD-relevant stories first by computing a simple overlap
  // between the story's skill tags and any keyword in the JD.
  const ranked = useMemo(() => {
    if (stories.length === 0) return [];
    const jdLower = jd.toLowerCase();
    return [...stories]
      .map((s) => {
        const skillHits = s.skills.filter((sk) =>
          jdLower.includes(sk.toLowerCase()),
        ).length;
        return { story: s, score: skillHits };
      })
      .sort((a, b) => b.score - a.score);
  }, [stories, jd]);

  if (stories.length === 0) {
    return (
      <aside className="rounded-2xl border border-dashed border-line bg-card-solid p-4 text-[12px] text-fg-muted h-fit">
        <div className="inline-flex items-center gap-1.5 text-fg-subtle text-[10px] font-bold uppercase tracking-[0.18em] mb-2">
          <Inbox size={11} /> Story Bank
        </div>
        <p className="leading-relaxed">
          STAR stories you save to{" "}
          <Link href="/profile/stories" className="text-brand-700 hover:underline">
            your Story Bank
          </Link>{" "}
          will surface here, sorted by how well they fit this JD.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-2xl border border-line bg-card-solid h-fit overflow-hidden">
      <header className="px-3 py-2 border-b border-line bg-elevated/40">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle inline-flex items-center gap-1.5">
          <Inbox size={11} /> Story Bank
        </p>
        <p className="text-[11px] text-fg-muted mt-0.5">
          {ranked.length} stories · top-ranked match this JD
        </p>
      </header>
      <ul className="divide-y divide-line max-h-[460px] overflow-y-auto">
        {ranked.map(({ story, score }) => (
          <li key={story.id} className="px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] font-semibold text-fg flex-1 min-w-0">
                {story.title}
              </p>
              {score > 0 && (
                <span
                  title={`${score} skill tag${score === 1 ? "" : "s"} match this JD`}
                  className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-200"
                >
                  ✓ {score}
                </span>
              )}
            </div>
            <p className="text-[11px] text-fg-muted line-clamp-2 mt-0.5">
              {story.situation}
            </p>
            {story.skills.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {story.skills.slice(0, 3).map((sk) => (
                  <span
                    key={sk}
                    className="text-[9.5px] font-semibold uppercase tracking-[0.12em] px-1 py-0.5 rounded bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => onInsert(story)}
              className="mt-1.5 text-[10.5px] font-semibold text-brand-700 hover:underline"
            >
              Insert into prep →
            </button>
          </li>
        ))}
      </ul>
      <footer className="px-3 py-2 border-t border-line bg-elevated/30">
        <Link
          href="/profile/stories"
          className="text-[11px] font-semibold text-brand-700 hover:underline"
        >
          Manage Story Bank →
        </Link>
      </footer>
    </aside>
  );
}

// ── Skill match panel (JD tab) ───────────────────────────────────

function SkillMatchPanel({
  match,
  resumeLinked,
}: {
  match: SkillMatchResult;
  resumeLinked: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!resumeLinked) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-card px-4 py-3 text-[12.5px] text-fg-muted flex items-start gap-2">
        <Target size={14} className="shrink-0 mt-0.5 text-fg-subtle" />
        <span>
          Link a resume on the Resume tab to see how well it matches this JD&apos;s keywords.
        </span>
      </div>
    );
  }
  if (match.total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-card px-4 py-3 text-[12.5px] text-fg-muted flex items-start gap-2">
        <Target size={14} className="shrink-0 mt-0.5 text-fg-subtle" />
        <span>Paste a JD here and we&apos;ll surface the keywords + how many your resume covers.</span>
      </div>
    );
  }

  const tone =
    match.percent >= 70
      ? "bg-emerald-50 ring-emerald-200 text-emerald-900"
      : match.percent >= 40
        ? "bg-amber-50 ring-amber-200 text-amber-900"
        : "bg-rose-50 ring-rose-200 text-rose-900";
  const bar =
    match.percent >= 70 ? "bg-emerald-500"
      : match.percent >= 40 ? "bg-amber-500" : "bg-rose-500";
  const missingCount = match.total - match.matched;
  const sorted = [...match.skills].sort(
    (a, b) => Number(b.present) - Number(a.present) || a.term.localeCompare(b.term),
  );
  const show = expanded ? sorted : sorted.slice(0, 12);

  return (
    <div className={`rounded-xl ring-1 ring-inset px-4 py-3 ${tone}`}>
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <p className="text-[13px] font-semibold inline-flex items-center gap-2">
          <Target size={14} />
          Skill match · {match.matched}/{match.total} keywords covered
          <span className="text-[11px] font-normal opacity-70">
            ({missingCount} missing)
          </span>
        </p>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-[11px] font-semibold underline-offset-2 hover:underline"
        >
          {expanded ? "Show top 12" : `Show all ${match.total}`}
        </button>
      </header>
      <div className="mt-2 h-1.5 w-full rounded-full bg-white/40 overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${match.percent}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {show.map((s) => (
          <span
            key={s.term}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ring-inset ${
              s.present
                ? "bg-emerald-100 text-emerald-900 ring-emerald-200"
                : "bg-white/60 text-fg-muted ring-line"
            }`}
            title={s.present ? "Found in your resume" : "Not found — consider adding"}
          >
            {s.present ? "✓ " : ""}{s.term}
          </span>
        ))}
      </div>
      {missingCount > 0 && (
        <p className="mt-2.5 text-[11px] leading-relaxed opacity-80">
          Add the missing keywords as bullets on your linked resume, or tailor an existing
          bullet to use the JD&apos;s phrasing.
        </p>
      )}
    </div>
  );
}

// ── Rate-my-fit panel (JD tab) ──────────────────────────────────

interface FitAssessment {
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  nextMove: string;
}

function RateMyFitPanel({
  folderId, resumeLinked, jdEmpty,
}: {
  folderId: string;
  resumeLinked: boolean;
  jdEmpty: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<FitAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runRating() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/profile/job-folders/${folderId}/rate-fit`, {
        method: "POST",
      });
      const j = (await res.json().catch(() => null)) as {
        ok?: boolean;
        assessment?: FitAssessment;
        error?: string;
      } | null;
      if (!res.ok || !j?.ok || !j.assessment) {
        setError(j?.error ?? `Rating failed (HTTP ${res.status}).`);
        return;
      }
      setAssessment(j.assessment);
    } finally { setLoading(false); }
  }

  const tone =
    assessment === null ? "neutral"
      : assessment.score >= 75 ? "emerald"
      : assessment.score >= 55 ? "amber"
      : "rose";
  const toneClasses = {
    neutral: "bg-card ring-line",
    emerald: "bg-emerald-50 ring-emerald-200",
    amber:   "bg-amber-50 ring-amber-200",
    rose:    "bg-rose-50 ring-rose-200",
  }[tone];
  const scoreColor = {
    neutral: "text-fg",
    emerald: "text-emerald-900",
    amber:   "text-amber-900",
    rose:    "text-rose-900",
  }[tone];

  return (
    <div className={`rounded-xl px-4 py-3 ring-1 ring-inset ${toneClasses}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold inline-flex items-center gap-2">
            <Gauge size={14} /> Rate my fit
          </p>
          <p className="text-[11.5px] text-fg-muted mt-0.5">
            Honest AI read of your resume vs this JD — strengths, gaps, and the highest-leverage next move.
          </p>
        </div>
        <button
          type="button"
          onClick={runRating}
          disabled={loading || jdEmpty || !resumeLinked}
          title={
            !resumeLinked ? "Link a resume on the Resume tab first."
              : jdEmpty   ? "Paste a JD first."
              : undefined
          }
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 text-white px-3 py-1.5 text-[12px] font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {assessment ? "Re-rate" : "Run rating"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[12px] text-rose-700">{error}</p>
      )}
      {assessment && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-start">
          <div className="flex flex-col items-center justify-center sm:min-w-[110px]">
            <div className={`text-[44px] font-bold tabular-nums leading-none ${scoreColor}`}>
              {assessment.score}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-subtle mt-1">
              / 100 fit
            </div>
          </div>
          <div className="text-[13px] leading-relaxed">
            <p className="font-semibold">{assessment.verdict}</p>
            {assessment.strengths.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-emerald-800 mb-1">Strengths</p>
                <ul className="space-y-0.5">
                  {assessment.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px]">
                      <span className="text-emerald-600 mt-0.5">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {assessment.gaps.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-rose-800 mb-1">Gaps</p>
                <ul className="space-y-0.5">
                  {assessment.gaps.map((g, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px]">
                      <span className="text-rose-600 mt-0.5">·</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {assessment.nextMove && (
              <div className="mt-2 rounded-md bg-white/60 ring-1 ring-inset ring-line px-2.5 py-1.5">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-fg-muted mb-0.5">Next move</p>
                <p className="text-[12.5px]">{assessment.nextMove}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function JdPanel({
  folderId, value, onChange, posting, resumeContent, resumeLinked,
}: {
  folderId: string;
  value: string;
  onChange: (v: string) => void;
  posting: FolderInitial["posting"];
  resumeContent: unknown;
  resumeLinked: boolean;
}) {
  // Recompute the skill match on every JD edit. The scorer is fast
  // (regex tokenise + substring check) so doing it on every keystroke
  // is fine and the user gets a live signal.
  const skillMatch = useMemo(
    () => scoreSkillMatch(value, resumeContent as Parameters<typeof scoreSkillMatch>[1]),
    [value, resumeContent],
  );

  return (
    <div className="space-y-3">
      {/* Skill-match summary — pops to the top so it stays visible
          when the JD textarea gets long. */}
      <SkillMatchPanel match={skillMatch} resumeLinked={resumeLinked} />
      <RateMyFitPanel folderId={folderId} resumeLinked={resumeLinked} jdEmpty={!value.trim()} />
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
