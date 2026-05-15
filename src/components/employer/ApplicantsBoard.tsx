"use client";
/**
 * /employer/postings/[id]/applicants — board orchestrator.
 *
 * Replaces the old bare Kanban with a recruiter-workflow surface:
 *
 *   Toolbar (search · filter chips · sort · view toggle)
 *     │
 *     ├── Bulk-actions bar  (visible when ≥1 selected)
 *     │
 *     ├── Kanban view    OR    List view
 *     │     7 columns         Sortable table — denser, faster scanning
 *     │     with rich cards   on high-volume postings.
 *     │
 *     └── Drawer (when clicked)
 *           Materials · Cover letter · FitExplain · Skills · Notes ·
 *           Rating · Interview scheduling
 *
 * What the recruiter gets that they didn't before
 *   • Search by name / email
 *   • Filter by stage, score band (Strong/Possible/Weak), materials
 *     present, has-interview, or "stale only" (≥7d in current stage)
 *   • Sort by Score / Applied date / Stage time-in-stage
 *   • View toggle (Kanban for triage, List for volume scanning)
 *   • Bulk select + bulk stage change — move 10 to "reviewing" in
 *     two clicks instead of ten drag-drops
 *   • Per-card surface signals: time-in-stage, stale flag, materials
 *     icons (resume / video / cover letter / pitch), comments count
 *   • Drawer now shows cover letter + the full FitExplain panel
 *     (fetched on-demand so the list view stays snappy)
 *   • Per-session "what's new since I last visited" marker tracked
 *     via localStorage so a recruiter can spot fresh arrivals at a
 *     glance.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sparkles, X, BookOpen, Star, Calendar, MessageSquare, GraduationCap,
  Search, Filter, ArrowUpDown, LayoutGrid, List as ListIcon,
  CheckSquare, Square, FileText, Video, Mail, FileSignature,
  ChevronRight, Clock, AlertTriangle, Loader2, ExternalLink, Trash2,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InterviewSchedulerDialog } from "./InterviewSchedulerDialog";
import { FitExplain } from "@/components/matching/FitExplain";
import type { FitResult } from "@/lib/matching/fit";

// ── Types ────────────────────────────────────────────────────────

interface Applicant {
  applicantId: string;
  submissionId: string;
  /** ApplicationStatus row id — distinct from applicantId (User PK)
   *  and submissionId (EventFormSubmission PK). Needed so the drawer
   *  link to /employer/postings/[id]/applicants/[appId] can route to
   *  the right row. Null when the trainee submitted the talent
   *  application but hasn't formally applied to this specific
   *  posting yet — in that case the detail page link hides. */
  applicationStatusId: string | null;
  submittedAt: string;
  name: string | null;
  email: string;
  country: string | null;
  score: number;
  matched: number;
  missingRequired: number;
  completedCourses: number;
  status: string;
  stageEnteredAt: string | null;
  daysInStage: number;
  rating: number | null;
  notes: string | null;
  coverLetter: string | null;
  hasResume: boolean;
  hasVideo: boolean;
  hasPitch: boolean;
  hasCoverLetter: boolean;
  resumeUrl: string | null;
  videoUrl: string | null;
  pitch: string | null;
  commentCount: number;
  interview: { status: string; acceptedSlot: string | null; proposedSlots: unknown } | null;
  topSkills: { name: string; category: string | null; level: number; source: string }[];
}

type StatusKey =
  | "new" | "reviewing" | "shortlisted" | "phone_screen"
  | "onsite" | "offer" | "hired" | "rejected" | "closed";

type SortKey = "score" | "appliedDesc" | "appliedAsc" | "stageTime";
type ViewMode = "kanban" | "list";
type ScoreBand = "all" | "high" | "medium" | "low";

const COLUMNS: { id: StatusKey; label: string; tone: string }[] = [
  { id: "new",          label: "New",          tone: "bg-card-solid border-line text-muted" },
  { id: "reviewing",    label: "Reviewing",    tone: "bg-brand-50 border-brand-200 text-brand-700" },
  { id: "shortlisted",  label: "Shortlisted",  tone: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { id: "phone_screen", label: "Phone screen", tone: "bg-amber-50 border-amber-200 text-amber-800" },
  { id: "onsite",       label: "Onsite",       tone: "bg-amber-50 border-amber-200 text-amber-800" },
  { id: "offer",        label: "Offer",        tone: "bg-violet-50 border-violet-200 text-violet-700" },
];
const COLLAPSED: { id: StatusKey; label: string }[] = [
  { id: "hired",    label: "Hired" },
  { id: "rejected", label: "Rejected" },
  { id: "closed",   label: "Closed" },
];
const ALL_STAGES = [...COLUMNS, ...COLLAPSED] as const;
const STAGE_LABEL: Record<string, string> = Object.fromEntries(
  ALL_STAGES.map((s) => [s.id, s.label]),
);

// 7-day stale threshold for the rose "still in stage" flag.
const STALE_DAYS = 7;

export function ApplicantsBoard({ postingId }: { postingId: string }) {
  // Server data
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // UI state
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<Set<StatusKey>>(new Set());
  const [scoreBand, setScoreBand] = useState<ScoreBand>("all");
  const [staleOnly, setStaleOnly] = useState(false);
  const [withMaterials, setWithMaterials] = useState(false);
  const [withInterview, setWithInterview] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const [view, setView] = useState<ViewMode>("kanban");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Drawer state
  const [drawer, setDrawer] = useState<Applicant | null>(null);
  const [interviewing, setInterviewing] = useState<Applicant | null>(null);
  const [fitCache, setFitCache] = useState<Record<string, FitResult>>({});
  const [fitLoading, setFitLoading] = useState(false);
  const [fitError, setFitError] = useState<string | null>(null);

  // "What's new since I last visited" — tracked in localStorage so
  // the recruiter can spot fresh applicants on every revisit.
  const [lastVisit, setLastVisit] = useState<number | null>(null);

  // ── Load ─────────────────────────────────────────────────────
  // Defined as useCallback so the bulk-action handlers + the
  // post-interview success callback can reuse it without redefining.
  // The setState calls inside the async body are legitimate data-
  // fetch lifecycle updates; the linter's strict reading of
  // react-hooks/set-state-in-effect flags them as cascading-render
  // risks, but they're not — the state isn't derived from other state
  // synchronously, it's an awaited HTTP response.
  /* eslint-disable react-hooks/set-state-in-effect */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/employer/applications?postingId=${postingId}`, { cache: "no-store" });
      const j = await r.json();
      setApplicants(j.applicants ?? []);
    } finally {
      setLoading(false);
    }
  }, [postingId]);
  useEffect(() => { void load(); }, [load]);

  // Bookmark the last-visit timestamp so refreshing the page in a
  // long session doesn't lose the "what's new" marker.
  useEffect(() => {
    try {
      const key = `bhn-applicants-lastvisit-${postingId}`;
      const stored = localStorage.getItem(key);
      if (stored) setLastVisit(parseInt(stored, 10));
      // Set new marker after a small delay so the badge has time to
      // render against the OLD marker first.
      const t = setTimeout(() => {
        localStorage.setItem(key, String(Date.now()));
      }, 30_000);
      return () => clearTimeout(t);
    } catch {
      // localStorage unavailable — silently skip the badge
    }
  }, [postingId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Derived ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applicants.filter((a) => {
      if (q) {
        const hay = `${a.name ?? ""} ${a.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (stageFilter.size > 0 && !stageFilter.has(a.status as StatusKey)) return false;
      if (scoreBand === "high"   && a.score < 70) return false;
      if (scoreBand === "medium" && (a.score < 40 || a.score >= 70)) return false;
      if (scoreBand === "low"    && a.score >= 40) return false;
      if (staleOnly) {
        const isActive = ["new", "reviewing", "shortlisted", "phone_screen", "onsite", "offer"].includes(a.status);
        if (!(isActive && a.daysInStage >= STALE_DAYS)) return false;
      }
      if (withMaterials && !(a.hasResume || a.hasVideo || a.hasCoverLetter || a.hasPitch)) return false;
      if (withInterview && !a.interview) return false;
      return true;
    });
  }, [applicants, query, stageFilter, scoreBand, staleOnly, withMaterials, withInterview]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "score":
        arr.sort((a, b) => b.score - a.score);
        break;
      case "appliedDesc":
        arr.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        break;
      case "appliedAsc":
        arr.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
        break;
      case "stageTime":
        arr.sort((a, b) => b.daysInStage - a.daysInStage);
        break;
    }
    return arr;
  }, [filtered, sort]);

  const grouped = useMemo(() => {
    const m = new Map<StatusKey, Applicant[]>();
    for (const a of sorted) {
      const k = (a.status as StatusKey) ?? "new";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    }
    return m;
  }, [sorted]);

  const newSinceLastVisit = useMemo(() => {
    if (!lastVisit) return 0;
    return applicants.filter((a) => new Date(a.submittedAt).getTime() > lastVisit).length;
  }, [applicants, lastVisit]);

  // ── Mutations ────────────────────────────────────────────────
  async function setStatus(a: Applicant, status: StatusKey) {
    setBusy(true);
    try {
      const r = await fetch("/api/employer/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postingId, applicantId: a.applicantId, status }),
      });
      // Read the new ApplicationStatus row id from the response so the
      // drawer's "Open full applicant detail" link can light up
      // immediately. Without this, an applicant moved out of the
      // talent-pool-only state would keep showing the disabled-link
      // copy until the next full reload.
      const j = await r.json().catch(() => ({})) as { ok?: boolean; status?: { id?: string } };
      const newAppId = j?.status?.id ?? a.applicationStatusId ?? null;
      setApplicants((cur) =>
        cur.map((c) => (c.applicantId === a.applicantId
          ? {
              ...c,
              status,
              daysInStage: 0,
              stageEnteredAt: new Date().toISOString(),
              applicationStatusId: newAppId,
            }
          : c)),
      );
    } finally { setBusy(false); }
  }

  async function bulkSetStatus(status: StatusKey) {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const applicantIds = Array.from(selected);
      const r = await fetch("/api/employer/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postingId, applicantIds, status }),
      });
      if (r.ok) {
        setSelected(new Set());
        // The bulk endpoint doesn't echo back per-applicant row ids,
        // so just refetch to pick up the freshly-minted
        // ApplicationStatus PKs (and any concurrent updates from
        // teammates).
        await load();
      }
    } finally { setBusy(false); }
  }

  function toggleSelect(applicantId: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(applicantId)) next.delete(applicantId);
      else next.add(applicantId);
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setStageFilter(new Set());
    setScoreBand("all");
    setStaleOnly(false);
    setWithMaterials(false);
    setWithInterview(false);
  }
  const hasActiveFilter =
    query !== "" || stageFilter.size > 0 || scoreBand !== "all" || staleOnly || withMaterials || withInterview;

  // ── Drawer FitExplain fetch ──────────────────────────────────
  // The setState calls below are legitimate effect-driven data
  // fetches; the linter's strict reading of react-hooks/set-state-in-
  // effect flags them as cascading-render risks. They're not — the
  // state isn't used to derive other state synchronously.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!drawer) return;
    if (fitCache[drawer.applicantId]) return;
    let cancelled = false;
    setFitLoading(true);
    setFitError(null);
    fetch(`/api/employer/applications/fit?postingId=${postingId}&applicantId=${drawer.applicantId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.ok && j.fit) {
          setFitCache((cur) => ({ ...cur, [drawer.applicantId]: j.fit as FitResult }));
        } else {
          setFitError(j?.error ?? "Couldn't load AI fit breakdown.");
        }
      })
      .catch(() => !cancelled && setFitError("Couldn't load AI fit breakdown."))
      .finally(() => !cancelled && setFitLoading(false));
    return () => { cancelled = true; };
  }, [drawer, postingId, fitCache]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return <p className="text-sm text-muted text-center py-12">Loading applicants…</p>;
  }
  if (applicants.length === 0) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <Inbox size={26} className="mx-auto text-subtle mb-2" />
        <p className="text-sm text-muted">No applicants yet for this posting.</p>
        <p className="text-xs text-subtle mt-1">Trainees will show up here automatically when they apply.</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Toolbar ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-line bg-card overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-line/70">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email…"
              className="w-full text-sm bg-elevated rounded-lg border border-line pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40 placeholder:text-subtle"
            />
          </div>

          {/* Sort */}
          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            <ArrowUpDown size={12} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-elevated rounded-lg border border-line px-2 py-1.5 text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="score">Best match first</option>
              <option value="appliedDesc">Newest applications</option>
              <option value="appliedAsc">Oldest applications</option>
              <option value="stageTime">Longest in current stage</option>
            </select>
          </label>

          {/* View toggle */}
          <div className="inline-flex rounded-lg bg-elevated border border-line p-0.5">
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors",
                view === "kanban" ? "bg-card text-fg ring-1 ring-line" : "text-muted hover:text-fg",
              )}
              title="Kanban view — drag-friendly stage columns"
            >
              <LayoutGrid size={12} /> Kanban
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors",
                view === "list" ? "bg-card text-fg ring-1 ring-line" : "text-muted hover:text-fg",
              )}
              title="List view — denser, sortable rows for high volume"
            >
              <ListIcon size={12} /> List
            </button>
          </div>
        </div>

        {/* Filter chips row */}
        <div className="px-4 py-2.5 flex flex-wrap items-center gap-2 text-xs">
          <Filter size={11} className="text-subtle" />
          <span className="uppercase tracking-[0.18em] text-subtle font-bold text-[10px] mr-1">Filter</span>

          {/* Score band */}
          <FilterChipGroup
            value={scoreBand}
            options={[
              { id: "all",    label: "Any score" },
              { id: "high",   label: "Strong fit (70+)" },
              { id: "medium", label: "Possible fit (40-69)" },
              { id: "low",    label: "Weak fit (<40)" },
            ]}
            onChange={(v) => setScoreBand(v as ScoreBand)}
          />

          {/* Stage multi-select via popover-light: render chips inline */}
          <StageFilter
            value={stageFilter}
            onChange={setStageFilter}
          />

          {/* Boolean toggles */}
          <ToggleChip active={staleOnly} onClick={() => setStaleOnly(!staleOnly)} icon={AlertTriangle} label={`Stale only (${STALE_DAYS}d+)`} />
          <ToggleChip active={withMaterials} onClick={() => setWithMaterials(!withMaterials)} icon={FileText} label="Has materials" />
          <ToggleChip active={withInterview} onClick={() => setWithInterview(!withInterview)} icon={Calendar} label="Has interview" />

          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-1 text-[11px] text-rose-700 hover:underline inline-flex items-center gap-0.5"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-[11px] text-muted tabular-nums">
            Showing <span className="font-bold text-fg">{sorted.length}</span> of {applicants.length}
            {newSinceLastVisit > 0 && (
              <>{" "}· <span className="text-emerald-700 font-semibold">{newSinceLastVisit} new since last visit</span></>
            )}
          </span>
        </div>

        {/* Bulk-action bar */}
        {selected.size > 0 && (
          <div className="px-4 py-2.5 bg-brand-50/60 border-t border-brand-200 flex flex-wrap items-center gap-2 text-xs">
            <p className="text-sm font-semibold text-brand-900">
              {selected.size} selected
            </p>
            <span className="flex-1" />
            <p className="text-[11px] text-muted">Move to:</p>
            {COLUMNS.slice(1).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => bulkSetStatus(c.id)}
                disabled={busy}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold ring-1 ring-inset transition-colors hover:-translate-y-0.5 disabled:opacity-50",
                  c.tone,
                )}
              >
                {c.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => bulkSetStatus("rejected")}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-300 hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 size={11} /> Reject
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={busy}
              className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-fg"
            >
              <X size={11} /> Clear
            </button>
          </div>
        )}
      </section>

      {/* ── Views ──────────────────────────────────────────────── */}
      {view === "kanban" ? (
        <KanbanView
          grouped={grouped}
          onOpen={setDrawer}
          onMove={setStatus}
          busy={busy}
          selected={selected}
          onToggleSelect={toggleSelect}
          lastVisit={lastVisit}
        />
      ) : (
        <ListView
          rows={sorted}
          onOpen={setDrawer}
          onMove={setStatus}
          busy={busy}
          selected={selected}
          onToggleSelect={toggleSelect}
          lastVisit={lastVisit}
        />
      )}

      {/* ── Drawer ─────────────────────────────────────────────── */}
      {drawer && (
        <Drawer
          a={drawer}
          onClose={() => setDrawer(null)}
          onChange={(patch) => {
            setApplicants((cur) => cur.map((c) => (c.applicantId === drawer.applicantId ? { ...c, ...patch } : c)));
            setDrawer((d) => (d ? { ...d, ...patch } : d));
          }}
          postingId={postingId}
          onScheduleInterview={() => setInterviewing(drawer)}
          fit={fitCache[drawer.applicantId] ?? null}
          fitLoading={fitLoading}
          fitError={fitError}
        />
      )}

      {interviewing && (
        <InterviewSchedulerDialog
          postingId={postingId}
          applicantId={interviewing.applicantId}
          applicantName={interviewing.name ?? interviewing.email}
          onClose={() => setInterviewing(null)}
          onScheduled={() => { setInterviewing(null); load(); }}
        />
      )}
    </>
  );
}

// ─── Toolbar primitives ──────────────────────────────────────────

function FilterChipGroup({
  value, options, onChange,
}: {
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-elevated border border-line p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "text-[11px] px-2 py-0.5 rounded-md transition-colors",
            value === o.id ? "bg-card text-fg font-semibold ring-1 ring-line" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ToggleChip({
  active, onClick, icon: Icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md ring-1 ring-inset transition-colors",
        active
          ? "bg-brand-100 text-brand-800 ring-brand-200"
          : "bg-elevated text-muted ring-line hover:text-fg",
      )}
    >
      <Icon size={11} /> {label}
    </button>
  );
}

function StageFilter({
  value, onChange,
}: {
  value: Set<StatusKey>;
  onChange: (v: Set<StatusKey>) => void;
}) {
  function toggle(id: StatusKey) {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }
  return (
    <details className="relative">
      <summary className={cn(
        "inline-flex items-center gap-1 cursor-pointer text-[11px] px-2.5 py-1 rounded-md ring-1 ring-inset transition-colors list-none",
        value.size > 0
          ? "bg-brand-100 text-brand-800 ring-brand-200"
          : "bg-elevated text-muted ring-line hover:text-fg",
      )}>
        Stage{value.size > 0 && ` (${value.size})`} <ChevronRight size={11} className="rotate-90" />
      </summary>
      <div className="absolute top-full left-0 mt-1 z-10 bg-card-solid border border-line rounded-lg p-2 shadow-lg min-w-[160px]">
        {ALL_STAGES.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-xs py-1 cursor-pointer hover:bg-elevated rounded px-1">
            <input
              type="checkbox"
              checked={value.has(s.id)}
              onChange={() => toggle(s.id)}
              className="rounded border-line text-brand-600"
            />
            {s.label}
          </label>
        ))}
      </div>
    </details>
  );
}

// ─── Views ───────────────────────────────────────────────────────

function KanbanView({
  grouped, onOpen, onMove, busy, selected, onToggleSelect, lastVisit,
}: {
  grouped: Map<StatusKey, Applicant[]>;
  onOpen: (a: Applicant) => void;
  onMove: (a: Applicant, s: StatusKey) => void;
  busy: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  lastVisit: number | null;
}) {
  return (
    <>
      <div className="overflow-x-auto pb-4">
        <div className="inline-flex gap-3 min-w-full">
          {COLUMNS.map((col) => {
            const items = grouped.get(col.id) ?? [];
            return (
              <div key={col.id} className="w-[300px] shrink-0">
                <div className={cn("rounded-lg border px-3 py-2 mb-2 flex items-center justify-between", col.tone)}>
                  <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs tabular-nums opacity-80">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((a) => (
                    <ApplicantCard
                      key={a.applicantId}
                      a={a}
                      onOpen={() => onOpen(a)}
                      onMove={(s) => onMove(a, s)}
                      busy={busy}
                      selected={selected.has(a.applicantId)}
                      onToggleSelect={() => onToggleSelect(a.applicantId)}
                      isNew={lastVisit ? new Date(a.submittedAt).getTime() > lastVisit : false}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="text-[11px] text-subtle px-2 py-3 text-center italic">empty</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsed terminal columns — separate area below the
          active funnel so closed candidates don't clutter the eye. */}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-muted hover:text-fg select-none">
          Closed: {COLLAPSED.reduce((acc, c) => acc + (grouped.get(c.id)?.length ?? 0), 0)} applicant(s)
        </summary>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          {COLLAPSED.map((col) => (
            <div key={col.id}>
              <p className="text-[10px] uppercase tracking-wider text-subtle font-semibold mb-1.5">{col.label}</p>
              <div className="space-y-1.5">
                {(grouped.get(col.id) ?? []).map((a) => (
                  <ApplicantCard
                    key={a.applicantId}
                    a={a}
                    onOpen={() => onOpen(a)}
                    onMove={(s) => onMove(a, s)}
                    busy={busy}
                    compact
                    selected={selected.has(a.applicantId)}
                    onToggleSelect={() => onToggleSelect(a.applicantId)}
                    isNew={lastVisit ? new Date(a.submittedAt).getTime() > lastVisit : false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}

function ListView({
  rows, onOpen, onMove, busy, selected, onToggleSelect, lastVisit,
}: {
  rows: Applicant[];
  onOpen: (a: Applicant) => void;
  onMove: (a: Applicant, s: StatusKey) => void;
  busy: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  lastVisit: number | null;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-elevated/60 border-b border-line text-[10px] uppercase tracking-wider text-subtle font-bold">
            <tr>
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2 text-left">Candidate</th>
              <th className="px-3 py-2 text-left">Score</th>
              <th className="px-3 py-2 text-left">Stage</th>
              <th className="px-3 py-2 text-left">Applied</th>
              <th className="px-3 py-2 text-left">Days in stage</th>
              <th className="px-3 py-2 text-left">Materials</th>
              <th className="px-3 py-2 text-left">Notes</th>
              <th className="px-3 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((a) => {
              const isSel = selected.has(a.applicantId);
              const isNew = lastVisit ? new Date(a.submittedAt).getTime() > lastVisit : false;
              const isStale = a.daysInStage >= STALE_DAYS
                && ["new", "reviewing", "shortlisted", "phone_screen", "onsite", "offer"].includes(a.status);
              const tone = a.score >= 70 ? "emerald" : a.score >= 40 ? "amber" : "rose";
              return (
                <tr
                  key={a.applicantId}
                  className={cn(
                    "hover:bg-elevated/30 transition-colors",
                    isSel && "bg-brand-50/40",
                  )}
                >
                  <td className="px-3 py-2 align-middle">
                    <button
                      type="button"
                      onClick={() => onToggleSelect(a.applicantId)}
                      className="text-muted hover:text-brand-700"
                      aria-label={isSel ? "Deselect" : "Select"}
                    >
                      {isSel ? <CheckSquare size={14} className="text-brand-600" /> : <Square size={14} />}
                    </button>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <button
                      type="button"
                      onClick={() => onOpen(a)}
                      className="inline-flex items-center gap-2 text-left group"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                        {(a.name ?? a.email)[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg truncate group-hover:text-brand-700 transition-colors">
                          {a.name ?? a.email}
                          {isNew && <span className="ml-1.5 inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">NEW</span>}
                        </p>
                        <p className="text-[11px] text-subtle truncate">{a.email}{a.country ? ` · ${a.country}` : ""}</p>
                      </div>
                    </button>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums",
                      tone === "emerald" ? "bg-emerald-100 text-emerald-800"
                        : tone === "amber" ? "bg-amber-100 text-amber-800"
                                            : "bg-rose-100 text-rose-700",
                    )}>
                      {a.score}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <select
                      value={a.status}
                      onChange={(e) => onMove(a, e.target.value as StatusKey)}
                      disabled={busy}
                      className="text-[11px] bg-card-solid border border-line rounded px-1.5 py-0.5 focus:outline-none"
                    >
                      {ALL_STAGES.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted whitespace-nowrap align-middle">
                    {new Date(a.submittedAt).toLocaleDateString()}
                  </td>
                  <td className={cn(
                    "px-3 py-2 text-xs whitespace-nowrap align-middle",
                    isStale ? "text-rose-700 font-bold" : "text-muted",
                  )}>
                    {a.daysInStage}d
                    {isStale && <AlertTriangle size={10} className="inline ml-1 -mt-0.5" />}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <MaterialsIcons a={a} />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    {a.commentCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-brand-700">
                        <MessageSquare size={11} /> {a.commentCount}
                      </span>
                    )}
                    {a.rating != null && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-amber-600">
                        <Star size={10} fill="currentColor" />
                        <span className="text-[11px] font-semibold tabular-nums">{a.rating}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-middle text-right">
                    <button
                      type="button"
                      onClick={() => onOpen(a)}
                      className="text-xs text-brand-700 hover:underline inline-flex items-center gap-0.5"
                    >
                      Open <ChevronRight size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-sm text-muted">
                  No applicants match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────

function MaterialsIcons({ a }: { a: Applicant }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-subtle">
      {a.hasResume       && <FileText      size={11} className="text-brand-700" />}
      {a.hasVideo        && <Video         size={11} className="text-violet-700" />}
      {a.hasPitch        && <Sparkles      size={11} className="text-amber-700" />}
      {a.hasCoverLetter  && <FileSignature size={11} className="text-emerald-700" />}
      {!a.hasResume && !a.hasVideo && !a.hasPitch && !a.hasCoverLetter && (
        <span className="text-[10px] text-subtle italic">none</span>
      )}
    </div>
  );
}

function ApplicantCard({
  a, onOpen, onMove, busy, compact, selected, onToggleSelect, isNew,
}: {
  a: Applicant;
  onOpen: () => void;
  onMove: (s: StatusKey) => void;
  busy: boolean;
  compact?: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  isNew?: boolean;
}) {
  const tone = a.score >= 70 ? "emerald" : a.score >= 40 ? "amber" : "rose";
  const isActive = ["new", "reviewing", "shortlisted", "phone_screen", "onsite", "offer"].includes(a.status);
  const isStale = isActive && a.daysInStage >= STALE_DAYS;

  return (
    <div
      className={cn(
        "bg-card border rounded-lg p-2.5 transition-all cursor-pointer group relative",
        selected ? "border-brand-400 ring-1 ring-brand-200 bg-brand-50/30" : "border-line hover:border-brand-200 hover:shadow-sm",
        compact && "p-2",
      )}
      onClick={onOpen}
    >
      {/* Select checkbox — top-left, visible-on-hover when not
          selected, always when selected. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        className={cn(
          "absolute top-2 left-2 text-muted hover:text-brand-700 transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
        aria-label={selected ? "Deselect" : "Select for bulk action"}
      >
        {selected ? <CheckSquare size={13} className="text-brand-600" /> : <Square size={13} />}
      </button>

      <div className={cn("flex items-center gap-2 mb-1", "pl-5")}>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
          {(a.name ?? a.email)[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-fg truncate inline-flex items-center gap-1">
            {a.name ?? a.email}
            {isNew && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">NEW</span>}
          </p>
          {!compact && a.country && <p className="text-[11px] text-subtle truncate">{a.country}</p>}
        </div>
        <div className={cn(
          "rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums shrink-0",
          tone === "emerald" ? "bg-emerald-100 text-emerald-800"
            : tone === "amber" ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-700",
        )}>
          {a.score}
        </div>
      </div>

      {!compact && (
        <>
          <p className="text-[11px] text-muted mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="inline-flex items-center gap-0.5">
              <Sparkles size={9} /> {a.matched} skills
            </span>
            {a.completedCourses > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <BookOpen size={9} /> {a.completedCourses} courses
              </span>
            )}
            {a.interview && (
              <span className="inline-flex items-center gap-0.5 text-amber-700">
                <Calendar size={9} /> interview
              </span>
            )}
            {a.commentCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-brand-700">
                <MessageSquare size={9} /> {a.commentCount}
              </span>
            )}
            {a.rating != null && (
              <span className="inline-flex items-center gap-0.5 text-amber-600">
                <Star size={9} fill="currentColor" /> {a.rating}
              </span>
            )}
          </p>

          {/* Time-in-stage + stale flag */}
          <p className={cn(
            "text-[11px] mt-1 inline-flex items-center gap-0.5",
            isStale ? "text-rose-700 font-bold" : "text-subtle",
          )}>
            {isStale ? <AlertTriangle size={10} /> : <Clock size={10} />}
            {a.daysInStage}d in {STAGE_LABEL[a.status] ?? a.status}
            {isStale && <span className="ml-1">— stale, nudge it</span>}
          </p>

          {a.topSkills.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {a.topSkills.slice(0, 3).map((s) => (
                <span key={s.name} className="text-[10px] bg-elevated text-muted border border-line rounded px-1.5 py-0.5">
                  {s.name}
                </span>
              ))}
              {a.topSkills.length > 3 && (
                <span className="text-[10px] text-subtle">+{a.topSkills.length - 3}</span>
              )}
            </div>
          )}

          {/* Materials icon row — quick at-a-glance: who has what */}
          <div className="mt-1.5">
            <MaterialsIcons a={a} />
          </div>
        </>
      )}

      <div className="mt-2 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <select
          value={a.status}
          onChange={(e) => { e.stopPropagation(); onMove(e.target.value as StatusKey); }}
          onClick={(e) => e.stopPropagation()}
          disabled={busy}
          className="text-[10px] bg-card-solid border border-line rounded px-1.5 py-0.5 focus:outline-none"
        >
          {ALL_STAGES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <ChevronRight size={11} className="text-subtle" />
      </div>
    </div>
  );
}

// ─── Drawer ──────────────────────────────────────────────────────

function Drawer({
  a, onClose, onChange, postingId, onScheduleInterview, fit, fitLoading, fitError,
}: {
  a: Applicant;
  onClose: () => void;
  onChange: (patch: Partial<Applicant>) => void;
  postingId: string;
  onScheduleInterview: () => void;
  fit: FitResult | null;
  fitLoading: boolean;
  fitError: string | null;
}) {
  const [notes, setNotes] = useState(a.notes ?? "");
  const [rating, setRating] = useState(a.rating ?? 0);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const r = await fetch("/api/employer/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postingId, applicantId: a.applicantId, notes, rating: rating || undefined }),
      });
      if (r.ok) onChange({ notes, rating: rating || null });
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-backdrop animate-fade-in" onClick={onClose}>
      <div className="bg-card-solid w-full max-w-xl h-full overflow-y-auto p-6 border-l border-line animate-slide-up-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="text-subtle hover:text-fg float-right p-1"><X size={16} /></button>
        <h2 className="text-xl font-bold text-fg">{a.name ?? a.email}</h2>
        <p className="text-sm text-muted">{a.email}{a.country ? ` · ${a.country}` : ""}</p>

        {/* Detail-page link — only renders when an ApplicationStatus
            row exists for this (applicant, posting) pair. Without
            one, the detail page would 404 because it keys on
            ApplicationStatus.id. */}
        {a.applicationStatusId ? (
          <a
            href={`/employer/postings/${postingId}/applicants/${a.applicationStatusId}`}
            className="mt-2 inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
          >
            Open full applicant detail page <ExternalLink size={11} />
          </a>
        ) : (
          <p className="mt-2 text-[11px] text-subtle italic">
            Trainee hasn&apos;t formally applied to this posting yet — they&apos;re
            in the talent pool but no ApplicationStatus row exists. Move them
            to &quot;Reviewing&quot; (or any active stage) to create one and
            unlock the full detail page.
          </p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="bg-elevated/60 rounded-lg p-2"><p className="text-2xl font-bold tabular-nums">{a.score}</p><p className="text-[10px] uppercase tracking-wider text-subtle">match</p></div>
          <div className="bg-elevated/60 rounded-lg p-2"><p className="text-2xl font-bold tabular-nums">{a.matched}</p><p className="text-[10px] uppercase tracking-wider text-subtle">skills hit</p></div>
          <div className="bg-elevated/60 rounded-lg p-2"><p className="text-2xl font-bold tabular-nums">{a.completedCourses}</p><p className="text-[10px] uppercase tracking-wider text-subtle">courses</p></div>
        </div>

        {/* Materials — direct external links so the recruiter can
            jump straight to the resume / video / contact without
            backtracking to the per-applicant page. */}
        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5">Materials</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {a.resumeUrl && (
              <a href={a.resumeUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-brand-50 text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100">
                <FileText size={11} /> Resume <ExternalLink size={9} />
              </a>
            )}
            {a.videoUrl && (
              <a href={a.videoUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-50 text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100">
                <Video size={11} /> 1-min video <ExternalLink size={9} />
              </a>
            )}
            <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-elevated text-fg ring-1 ring-line hover:bg-card">
              <Mail size={11} /> Email
            </a>
            {!a.resumeUrl && !a.videoUrl && (
              <span className="text-[11px] text-subtle italic">No external materials uploaded.</span>
            )}
          </div>
        </div>

        {/* Cover letter — surfaced inline if the trainee provided one
            on the apply form. Persists per posting. */}
        {a.coverLetter && (
          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5 inline-flex items-center gap-1">
              <FileSignature size={10} /> Cover letter
            </p>
            <p className="text-sm text-fg whitespace-pre-wrap leading-relaxed bg-emerald-50/30 ring-1 ring-emerald-200/60 rounded-lg px-3 py-2">
              {a.coverLetter}
            </p>
          </div>
        )}

        {/* Elevator pitch (from the talent application form) */}
        {a.pitch && (
          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5 inline-flex items-center gap-1">
              <Sparkles size={10} /> Elevator pitch
            </p>
            <p className="text-sm text-muted leading-relaxed">{a.pitch}</p>
          </div>
        )}

        {/* AI fit breakdown — fetched on drawer open via the new
            /api/employer/applications/fit endpoint. */}
        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5 inline-flex items-center gap-1">
            <Sparkles size={10} className="text-brand-600" /> AI fit breakdown
          </p>
          {fitLoading && (
            <p className="text-xs text-muted inline-flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Computing…
            </p>
          )}
          {fitError && (
            <p className="text-xs text-rose-700">{fitError}</p>
          )}
          {fit && !fitLoading && (
            <FitExplain fit={fit} variant="panel" heading="" />
          )}
        </div>

        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5">Top skills</p>
          <div className="flex flex-wrap gap-1.5">
            {a.topSkills.length === 0 && <p className="text-xs text-subtle">No skill profile yet.</p>}
            {a.topSkills.map((s) => (
              <span key={s.name} className="text-[11px] inline-flex items-center gap-1 bg-elevated text-fg rounded-full px-2 py-0.5 border border-line">
                {s.name}
                {s.source === "inferred" && <GraduationCap size={9} className="text-brand-600" />}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5">Rating</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(rating === n ? 0 : n)}
                className="text-amber-500 hover:text-amber-600"
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
              >
                <Star size={20} fill={n <= rating ? "currentColor" : "transparent"} />
              </button>
            ))}
            {rating > 0 && <button className="text-[10px] text-subtle ml-2 hover:text-fg" onClick={() => setRating(0)}>clear</button>}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-1.5 inline-flex items-center gap-1">
            <MessageSquare size={10} /> Private notes (per-posting)
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="What stood out? Concerns? Questions for the screen call?"
            className="w-full text-sm bg-card border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-brand-600 text-white border border-brand-700 hover:bg-brand-700 disabled:opacity-60"
          >
            Save
          </button>
          <button
            onClick={onScheduleInterview}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 inline-flex items-center gap-1.5"
          >
            <Calendar size={12} /> Schedule interview
          </button>
        </div>

        {/* Stage timeline placeholder — for now, just show when the
            current stage was entered. Future: full audit-log chronology. */}
        {a.stageEnteredAt && (
          <div className="mt-4 text-xs text-muted">
            In {STAGE_LABEL[a.status] ?? a.status} since {new Date(a.stageEnteredAt).toLocaleDateString()}
            {" "}({a.daysInStage}d).
          </div>
        )}

        {a.interview && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
            <p className="font-semibold text-amber-900">Interview {a.interview.status}</p>
            {a.interview.acceptedSlot && (
              <p className="text-amber-800 mt-0.5">Confirmed for {new Date(a.interview.acceptedSlot).toLocaleString()}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
