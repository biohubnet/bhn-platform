"use client";
/**
 * /employer — unified HR workspace.
 *
 * Single linear page. Every action expands inline. No drawers, no
 * dialogs, no page transitions. The recruiter scrolls top→bottom
 * once and can do every part of the hiring job from the same URL.
 *
 * Sections (top→bottom):
 *
 *   1. Hero strip — name + headline ("3 new applicants this week")
 *
 *   2. Action queue — the things genuinely needing attention right
 *      now. Each item scrolls into the relevant posting + expands the
 *      relevant applicant inline.
 *
 *   3. Postings list — one row per posting. Click → row expands in
 *      place to show that posting's funnel + applicants list. Click
 *      an applicant → row expands further to show materials, AI fit
 *      breakdown, stage transitions, comments thread, schedule-
 *      interview form, and offer composer — all inline.
 *
 *   4. "New posting" — inline composer (collapsed by default).
 *
 * Why no drawer / no dialog
 *   The previous flow opened a side drawer on applicant click. That
 *   forced the recruiter to context-switch into a modal layer and
 *   close it before they could compare with another applicant on the
 *   same posting. Inline expansion lets the recruiter scan adjacent
 *   applicants in the same scroll, with the expanded panel pushing
 *   neighbours down rather than covering them.
 */
import { useState, useMemo, useEffect } from "react";
import {
  Sparkles, AlertTriangle, ArrowRight, Inbox, Activity, CheckCircle2,
  Calendar as CalendarIcon, FilePlus, ChevronDown, ChevronRight, X,
  Briefcase, Building2, Users, Loader2, Copy, Mail,
} from "lucide-react";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { ApplicantPanel } from "@/components/employer/workspace/ApplicantPanel";
import { NewPostingInline } from "@/components/employer/workspace/NewPostingInline";
import { PostingTeamPanel } from "@/components/employer/workspace/PostingTeamPanel";
import { MessageComposer } from "@/components/employer/workspace/MessageComposer";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────

function relativeTimeShort(iso: string | Date): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60)  return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

// ── Data shapes coming from the server ──────────────────────────

export interface PostingSummary {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  status: string;
  deadline: string | null;
  contactEmail: string | null;
  createdAt: string;
  updatedAt: string;
  keySkills: string[];
  compensation: string | null;
  hours: string | null;
  duration: string | null;
  type: string | null;
  counts: {
    total: number;
    newCount: number;
    inProgress: number;
    hired: number;
    closed: number;
  };
  /** Attribution — populated once multi-user team writes begin. */
  lastTouchedAt?:     string | null;
  lastTouchedByName?: string | null;
}

export type QueueItemKind = "new" | "stale" | "offer-waiting";
export interface QueueItem {
  applicationStatusId: string;
  postingId: string;
  postingTitle: string;
  applicantId: string;
  applicantName: string;
  kind: QueueItemKind;
  daysInStage: number;
}

interface Props {
  firstName: string | null;
  companyName: string | null;
  isAdmin: boolean;
  isFresh: boolean;
  postings: PostingSummary[];
  actionQueue: QueueItem[];
  /** Optional content rendered AFTER the hero strip and BEFORE the
   *  workspace body. Used by the page shell to hang things like the
   *  admin DemoSeederBar or a "Set your password" notice without
   *  letting them slip above the hero — the hero owns the top of
   *  every page on the platform, by convention. */
  slotAboveContent?: React.ReactNode;
}

/** Applicant fetched lazily when a posting is expanded. Shape mirrors
 *  /api/employer/applications GET output. */
export interface ApplicantData {
  applicantId: string;
  submissionId: string;
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

export function HrWorkspace({
  firstName, companyName, isAdmin, isFresh, postings, actionQueue,
  slotAboveContent,
}: Props) {
  // ── Expansion state ──────────────────────────────────────
  const [expandedPostingId, setExpandedPostingId] = useState<string | null>(
    // Auto-expand the first posting on landing if there's only one or
    // it's the obvious entry. Otherwise stay collapsed.
    postings.length === 1 ? postings[0].id : null,
  );
  const [expandedApplicantId, setExpandedApplicantId] = useState<string | null>(null);
  const [composingNewPosting, setComposingNewPosting] = useState(false);

  // Deep-link handling — when a user lands here via /employer#posting-xyz
  // (e.g. from the old /employer/postings/[id] redirect or an email
  // notification), open the matching row and scroll to it.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash) return;
    const m = hash.match(/^#posting-(.+)$/);
    if (!m) return;
    const id = m[1];
    if (postings.some((p) => p.id === id)) {
      setExpandedPostingId(id);
      void ensureApplicantsLoaded(id);
      setTimeout(() => {
        const el = document.getElementById(`posting-${id}`);
        if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
      }, 120);
    }
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  // ── Lazy applicant loader per posting ────────────────────
  // Keyed by postingId so switching between postings doesn't re-fetch
  // if we've already loaded.
  const [applicantsByPosting, setApplicantsByPosting] = useState<Record<string, ApplicantData[]>>({});
  const [loadingByPosting, setLoadingByPosting] = useState<Record<string, boolean>>({});

  async function ensureApplicantsLoaded(postingId: string) {
    if (applicantsByPosting[postingId]) return;
    setLoadingByPosting((cur) => ({ ...cur, [postingId]: true }));
    try {
      const r = await fetch(`/api/employer/applications?postingId=${postingId}`, { cache: "no-store" });
      const j = await r.json();
      const rows: ApplicantData[] = (j.applicants ?? []) as ApplicantData[];
      setApplicantsByPosting((cur) => ({ ...cur, [postingId]: rows }));
    } catch {
      setApplicantsByPosting((cur) => ({ ...cur, [postingId]: [] }));
    } finally {
      setLoadingByPosting((cur) => ({ ...cur, [postingId]: false }));
    }
  }

  function togglePosting(postingId: string) {
    if (expandedPostingId === postingId) {
      setExpandedPostingId(null);
      setExpandedApplicantId(null);
    } else {
      setExpandedPostingId(postingId);
      setExpandedApplicantId(null);
      void ensureApplicantsLoaded(postingId);
    }
  }

  function toggleApplicant(applicantId: string) {
    setExpandedApplicantId((cur) => (cur === applicantId ? null : applicantId));
  }

  /** Apply a per-applicant patch to the local list so the row + parent
   *  posting counters update without a full refetch. */
  function patchApplicant(postingId: string, applicantId: string, patch: Partial<ApplicantData>) {
    setApplicantsByPosting((cur) => {
      const list = cur[postingId];
      if (!list) return cur;
      return {
        ...cur,
        [postingId]: list.map((a) => (a.applicantId === applicantId ? { ...a, ...patch } : a)),
      };
    });
  }

  // ── Click-through from the action queue ──────────────────
  async function jumpToApplicant(item: QueueItem) {
    setExpandedPostingId(item.postingId);
    await ensureApplicantsLoaded(item.postingId);
    setExpandedApplicantId(item.applicantId);
    // Scroll to the posting row after a tick so it has time to render.
    setTimeout(() => {
      const el = document.getElementById(`posting-${item.postingId}`);
      if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 80);
  }

  const totals = useMemo(() => {
    return postings.reduce(
      (acc, p) => ({
        total:      acc.total      + p.counts.total,
        newCount:   acc.newCount   + p.counts.newCount,
        inProgress: acc.inProgress + p.counts.inProgress,
        hired:      acc.hired      + p.counts.hired,
      }),
      { total: 0, newCount: 0, inProgress: 0, hired: 0 },
    );
  }, [postings]);

  return (
    <div className="space-y-8">
      {/* ── Hero — DSPageHeader picks the Studio variant via
              the route-scoped DesignSystemProvider in
              /employer/layout.tsx, so this renders the same
              full-bleed gradient + drifting blobs + curve-down
              treatment as the /employer overview hero. ─── */}
      <DSPageHeader
        eyebrow="My postings"
        icon={<Building2 size={20} />}
        title={
          firstName
            ? `Welcome back, ${firstName}.`
            : companyName ?? "Employer overview"
        }
        description={
          isFresh
            ? "Let's get your first posting up. Scroll to 'New posting' below and paste a job description — the AI fills in the rest."
            : actionQueue.length > 0
              ? `${actionQueue.length} item${actionQueue.length === 1 ? "" : "s"} need your attention. Tap any of them below to jump straight to the candidate.`
              : "Everything's caught up. Postings expand below — click any to review applicants inline."
        }
      />

      {/* Slot for content that needs to sit BELOW the hero but
          ABOVE the workspace body — admin seed bar, set-password
          notice, etc. The hero owns the top edge of the page; the
          shell hangs ancillary banners here so they don't slip above
          it. */}
      {slotAboveContent}

      {/* ── Stats strip ───────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip icon={Briefcase} label="Postings" value={postings.length} sub={`${postings.filter((p) => p.status === "active").length} active`} />
        <StatChip icon={Inbox}     label="Applicants" value={totals.total}     sub={`${totals.newCount} new`} tone={totals.newCount > 0 ? "amber" : "muted"} />
        <StatChip icon={Activity}  label="In progress" value={totals.inProgress} sub="reviewing → offer" />
        <StatChip icon={CheckCircle2} label="Hired" value={totals.hired} sub="lifetime" tone="emerald" />
      </section>

      {/* ── Action queue ──────────────────────────────────── */}
      {actionQueue.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <header className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <h2 className="text-base font-bold text-amber-900 inline-flex items-center gap-2">
              <AlertTriangle size={15} /> Needs your attention
            </h2>
            <p className="text-[11px] text-amber-800/80">
              Tap any row to jump straight to the candidate, expanded inline.
            </p>
          </header>
          <ul className="space-y-1.5">
            {actionQueue.map((q) => (
              <li key={q.applicationStatusId}>
                <button
                  type="button"
                  onClick={() => jumpToApplicant(q)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg bg-card hover:bg-elevated ring-1 ring-amber-200/70 transition-colors"
                >
                  <QueueIcon kind={q.kind} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-fg truncate">
                      {q.applicantName}{" "}
                      <span className="text-muted font-normal">·</span>{" "}
                      <span className="text-muted font-medium">{q.postingTitle}</span>
                    </p>
                    <p className="text-[11px] text-muted">
                      {queueDescription(q)}
                    </p>
                  </div>
                  <ArrowRight size={13} className="text-amber-700 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Postings list ─────────────────────────────────── */}
      <section className="space-y-3" id="postings">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-bold text-fg inline-flex items-center gap-2">
            <Briefcase size={15} className="text-brand-600" /> Postings
            {isAdmin && (
              <span className="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded px-1.5 py-0.5">
                admin · all
              </span>
            )}
          </h2>
          {postings.length > 0 && !composingNewPosting && (
            <button
              type="button"
              onClick={() => setComposingNewPosting(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-900"
            >
              <FilePlus size={12} /> New posting
            </button>
          )}
        </header>

        {postings.length === 0 && !composingNewPosting && (
          <button
            type="button"
            onClick={() => setComposingNewPosting(true)}
            className="w-full rounded-2xl border border-dashed border-line p-8 text-center hover:border-brand-300 hover:bg-elevated/30 transition-colors"
          >
            <FilePlus size={20} className="mx-auto text-brand-600 mb-2" />
            <p className="text-sm font-semibold text-fg">Post your first role</p>
            <p className="text-xs text-muted mt-1 max-w-md mx-auto leading-snug">
              Paste a job description; the AI fills in title, location, comp, key
              skills, and the position summary. Edit, publish, done.
            </p>
          </button>
        )}

        {/* Inline new-posting composer */}
        {composingNewPosting && (
          <NewPostingInline
            onClose={() => setComposingNewPosting(false)}
            onCreated={(_id) => {
              setComposingNewPosting(false);
              // Cheapest correct behaviour is a hard reload so the
              // server-rendered postings list picks up the new row +
              // its zero-applicant stats.
              window.location.reload();
            }}
          />
        )}

        {postings.map((p) => (
          <PostingRow
            key={p.id}
            posting={p}
            isExpanded={expandedPostingId === p.id}
            onToggle={() => togglePosting(p.id)}
            applicants={applicantsByPosting[p.id] ?? null}
            loadingApplicants={!!loadingByPosting[p.id]}
            expandedApplicantId={expandedApplicantId}
            onToggleApplicant={toggleApplicant}
            onApplicantPatch={(applicantId, patch) => patchApplicant(p.id, applicantId, patch)}
            onReloadApplicants={() => {
              setApplicantsByPosting((cur) => {
                const c = { ...cur };
                delete c[p.id];
                return c;
              });
              void ensureApplicantsLoaded(p.id);
            }}
          />
        ))}
      </section>
    </div>
  );
}

// ─── Posting row ────────────────────────────────────────────────

function PostingRow({
  posting, isExpanded, onToggle, applicants, loadingApplicants,
  expandedApplicantId, onToggleApplicant, onApplicantPatch, onReloadApplicants,
}: {
  posting: PostingSummary;
  isExpanded: boolean;
  onToggle: () => void;
  applicants: ApplicantData[] | null;
  loadingApplicants: boolean;
  expandedApplicantId: string | null;
  onToggleApplicant: (applicantId: string) => void;
  onApplicantPatch: (applicantId: string, patch: Partial<ApplicantData>) => void;
  onReloadApplicants: () => void;
}) {
  const c = posting.counts;

  // ── Duplicate state ─────────────────────────────────────
  const [dupeConfirm, setDupeConfirm]   = useState(false);
  const [dupeLoading, setDupeLoading]   = useState(false);

  async function duplicate(e: React.MouseEvent) {
    e.stopPropagation();
    setDupeLoading(true);
    try {
      const r = await fetch(`/api/employer/postings/${posting.id}/duplicate`, { method: "POST" });
      if (r.ok) window.location.reload();
    } finally {
      setDupeLoading(false);
      setDupeConfirm(false);
    }
  }

  // ── Bulk applicant selection for messaging ───────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggleSelect(appStatusId: string | null) {
    if (!appStatusId) return;
    setSelectedIds((prev) =>
      prev.includes(appStatusId) ? prev.filter((id) => id !== appStatusId) : [...prev, appStatusId],
    );
  }

  function toggleSelectAll() {
    if (!applicants) return;
    const allIds = applicants.map((a) => a.applicationStatusId).filter(Boolean) as string[];
    setSelectedIds(selectedIds.length === allIds.length ? [] : allIds);
  }

  // Funnel mini-bar widths
  const funnel = useMemo(() => {
    const total = c.total || 1;
    return {
      newPct: (c.newCount / total) * 100,
      inProgressPct: (c.inProgress / total) * 100,
      hiredPct: (c.hired / total) * 100,
      closedPct: (c.closed / total) * 100,
    };
  }, [c]);

  return (
    <article
      id={`posting-${posting.id}`}
      className={cn(
        "rounded-2xl border bg-card transition-colors overflow-hidden",
        isExpanded ? "border-brand-300 ring-1 ring-brand-200" : "border-line hover:border-brand-200",
      )}
    >
      {/* Header row — left is expand trigger, right has action buttons */}
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 text-left p-4 sm:p-5 min-w-0"
          aria-expanded={isExpanded}
        >
          <div className="flex items-start gap-3 flex-wrap">
            <div className="shrink-0 mt-1">
              {isExpanded ? (
                <ChevronDown size={16} className="text-brand-600" />
              ) : (
                <ChevronRight size={16} className="text-subtle" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h3 className="text-base font-bold text-fg tracking-tight">{posting.title}</h3>
                <StatusPill status={posting.status} />
                {posting.deadline && (
                  <span className="text-[11px] text-subtle inline-flex items-center gap-0.5">
                    <CalendarIcon size={10} /> {new Date(posting.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5 truncate">
                {posting.companyName}
                {posting.location && <> · {posting.location}</>}
                {posting.lastTouchedByName && posting.lastTouchedAt && (
                  <span className="ml-2 text-subtle">
                    · touched by {posting.lastTouchedByName} · {relativeTimeShort(posting.lastTouchedAt)}
                  </span>
                )}
              </p>
              {/* Funnel mini-bar */}
              {c.total > 0 && (
                <div className="mt-2 max-w-md">
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-elevated">
                    {funnel.newPct > 0       && <span className="bg-amber-500"   style={{ width: `${funnel.newPct}%` }} />}
                    {funnel.inProgressPct > 0 && <span className="bg-brand-500"   style={{ width: `${funnel.inProgressPct}%` }} />}
                    {funnel.hiredPct > 0     && <span className="bg-emerald-500" style={{ width: `${funnel.hiredPct}%` }} />}
                    {funnel.closedPct > 0    && <span className="bg-slate-400"   style={{ width: `${funnel.closedPct}%` }} />}
                  </div>
                  <p className="text-[11px] text-muted mt-1.5">
                    {c.total} applicant{c.total === 1 ? "" : "s"}
                    {c.newCount > 0    && <> · <span className="font-bold text-amber-700">{c.newCount} new</span></>}
                    {c.inProgress > 0  && <> · <span className="text-brand-700">{c.inProgress} in progress</span></>}
                    {c.hired > 0       && <> · <span className="text-emerald-700">{c.hired} hired</span></>}
                  </p>
                </div>
              )}
              {c.total === 0 && (
                <p className="text-[11px] text-subtle mt-2 italic">
                  No applicants yet — they&apos;ll surface here when trainees apply.
                </p>
              )}
            </div>
          </div>
        </button>

        {/* Duplicate button — separate from the expand trigger */}
        <div className="flex items-center pr-4 gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {dupeConfirm ? (
            <span className="flex items-center gap-1 text-xs">
              <span className="text-muted font-semibold">Duplicate?</span>
              <button
                type="button"
                disabled={dupeLoading}
                onClick={duplicate}
                className="text-[10px] font-bold text-brand-700 hover:underline disabled:opacity-50"
              >
                {dupeLoading ? <Loader2 size={10} className="animate-spin" /> : "Yes"}
              </button>
              <button type="button" onClick={() => setDupeConfirm(false)} className="text-[10px] text-muted hover:text-fg">×</button>
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDupeConfirm(true); }}
              className="p-1.5 rounded-lg text-muted hover:text-brand-700 hover:bg-brand-50 transition-colors"
              aria-label="Duplicate posting"
              title="Duplicate as draft"
            >
              <Copy size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded body ──────────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-line/70 bg-elevated/30">
          {loadingApplicants && (
            <p className="text-sm text-muted text-center py-10 inline-flex items-center justify-center gap-2 w-full">
              <Loader2 size={14} className="animate-spin" /> Loading applicants…
            </p>
          )}

          {!loadingApplicants && applicants !== null && applicants.length === 0 && (
            <p className="text-sm text-muted text-center py-10">
              No applicants yet for this posting.
            </p>
          )}

          {!loadingApplicants && applicants !== null && applicants.length > 0 && (
            <>
              {/* Bulk-select toolbar */}
              <div className="flex items-center gap-3 px-4 py-2 border-b border-line/50 bg-card/60">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted hover:text-fg">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === applicants.length && applicants.length > 0}
                    onChange={toggleSelectAll}
                    className="accent-brand-600 rounded"
                  />
                  All
                </label>
                {selectedIds.length > 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-brand-700">
                    <Mail size={11} /> {selectedIds.length} selected
                  </span>
                )}
              </div>

              <ul className="divide-y divide-line/70">
                {applicants.map((a) => (
                  <li key={a.applicantId} className="bg-card flex items-stretch">
                    {/* Checkbox column */}
                    <div
                      className="flex items-start pt-4 pl-4 pr-2 shrink-0"
                      onClick={(e) => { e.stopPropagation(); toggleSelect(a.applicationStatusId); }}
                    >
                      <input
                        type="checkbox"
                        checked={!!(a.applicationStatusId && selectedIds.includes(a.applicationStatusId))}
                        onChange={() => toggleSelect(a.applicationStatusId)}
                        className="accent-brand-600 rounded mt-0.5 cursor-pointer"
                        aria-label={`Select ${a.name ?? a.email}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <ApplicantPanel
                        a={a}
                        isExpanded={expandedApplicantId === a.applicantId}
                        onToggle={() => onToggleApplicant(a.applicantId)}
                        postingId={posting.id}
                        postingTitle={posting.title}
                        postingCompany={posting.companyName}
                        onPatch={(patch) => onApplicantPatch(a.applicantId, patch)}
                        onReloadAll={onReloadApplicants}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              {/* Bulk message composer — appears when applicants are selected */}
              <MessageComposer
                postingId={posting.id}
                selectedIds={selectedIds}
                applicants={applicants}
                onClear={() => setSelectedIds([])}
              />
            </>
          )}

          {/* Hiring team panel — always visible in expanded state */}
          <PostingTeamPanel postingId={posting.id} />

          {/* Scorecard link */}
          <div className="border-t border-line/70 px-5 py-3">
            <a
              href={`/employer/postings/${posting.id}/scorecard`}
              className="text-xs text-brand-700 hover:underline font-semibold inline-flex items-center gap-1"
            >
              Interview scorecard →
            </a>
          </div>
        </div>
      )}
    </article>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

function StatChip({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub?: string;
  tone?: "amber" | "emerald" | "muted";
}) {
  const c =
    tone === "amber"   ? "text-amber-700" :
    tone === "emerald" ? "text-emerald-700" :
                         "text-fg";
  return (
    <div className="rounded-xl bg-card border border-line p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-subtle">
        <Icon size={11} /> {label}
      </div>
      <p className={`text-2xl font-bold mt-1 tabular-nums leading-none ${c}`}>
        {value.toLocaleString()}
      </p>
      {sub && <p className="text-[11px] text-muted mt-1.5 truncate">{sub}</p>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta: Record<string, { label: string; cls: string }> = {
    active:  { label: "Active",  cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
    closed:  { label: "Closed",  cls: "bg-slate-100 text-slate-800 ring-slate-200" },
    expired: { label: "Expired", cls: "bg-amber-100 text-amber-800 ring-amber-200" },
    draft:   { label: "Draft",   cls: "bg-sky-100 text-sky-800 ring-sky-200" },
  };
  const m = meta[status] ?? { label: status, cls: "bg-elevated text-fg ring-line" };
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ring-1 ring-inset ${m.cls}`}>
      {m.label}
    </span>
  );
}

function QueueIcon({ kind }: { kind: QueueItemKind }) {
  const meta: Record<QueueItemKind, { icon: React.ElementType; cls: string }> = {
    new:            { icon: Inbox,         cls: "bg-amber-100 text-amber-800" },
    stale:          { icon: AlertTriangle, cls: "bg-rose-100 text-rose-800" },
    "offer-waiting":{ icon: CalendarIcon,  cls: "bg-violet-100 text-violet-800" },
  };
  const m = meta[kind];
  const Icon = m.icon;
  return (
    <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${m.cls}`}>
      <Icon size={13} />
    </span>
  );
}

function queueDescription(q: QueueItem): string {
  switch (q.kind) {
    case "new":            return `Just applied — waiting on first review · ${q.daysInStage}d`;
    case "stale":          return `Stuck in this stage for ${q.daysInStage} days`;
    case "offer-waiting":  return `Offer sent ${q.daysInStage}d ago — still awaiting response`;
  }
}

// Suppress unused imports if they slip out of the render tree.
void Sparkles;
void X;
void Users;
void Copy;
void Mail;
