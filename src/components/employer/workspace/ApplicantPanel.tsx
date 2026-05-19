"use client";
/**
 * Inline applicant detail panel — replaces the previous side-drawer
 * pattern. Click a row → it expands in place to show everything the
 * recruiter needs: materials preview, AI fit breakdown, stage
 * transitions, team-private comments, schedule interview, send
 * offer. No modal, no drawer, no navigation away.
 *
 * Why inline beats the drawer
 *   The drawer covered the rest of the applicant list, forcing the
 *   recruiter to dismiss before they could compare a neighbour.
 *   Inline expansion pushes neighbours down so the recruiter can
 *   scroll back and forth between adjacent candidates without losing
 *   context.
 *
 * Lazy work
 *   The AI fit breakdown + the comment thread are fetched on first
 *   expand (not on the parent list load) so the workspace stays
 *   snappy with 50+ applicants. Results are cached per applicant; a
 *   second expand renders from memory.
 */
import { useEffect, useState } from "react";
import {
  Loader2, Sparkles, Star, MessageSquare, Calendar, FileText, Video, Mail,
  FileSignature, ExternalLink, ChevronDown, ChevronRight, Send,
  CheckCircle2, AlertTriangle, XCircle, Clock, Inbox, Plus, X, Save,
  GraduationCap, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FitExplain } from "@/components/matching/FitExplain";
import type { FitResult } from "@/lib/matching/fit";
import type { ApplicantData } from "@/components/employer/workspace/HrWorkspace";

interface Props {
  a: ApplicantData;
  isExpanded: boolean;
  onToggle: () => void;
  postingId: string;
  postingTitle: string;
  postingCompany: string;
  onPatch: (patch: Partial<ApplicantData>) => void;
  onReloadAll: () => void;
}

// Stage labels — used by the collapsed-row pill chip on each
// applicant. Restrained palette: only the current stage gets a tone;
// everything else is neutral.
const STAGE_LABEL: Record<string, string> = {
  new:                 "New",
  reviewing:           "Reviewing",
  shortlisted:         "Shortlisted",
  phone_screen:        "Phone screen",
  interview_scheduled: "Interview scheduled",
  interviewed:         "Interviewed",
  onsite:              "Onsite",
  offer:               "Offer sent",
  hired:               "Hired",
  passed:              "Passed",
  rejected:            "Rejected",
  withdrawn:           "Withdrawn",
  closed:              "Closed",
};
const STAGE_PILL_CLS: Record<string, string> = {
  new:                 "bg-slate-100 text-slate-700 ring-slate-200",
  reviewing:           "bg-brand-100 text-brand-800 ring-brand-200",
  shortlisted:         "bg-brand-100 text-brand-800 ring-brand-200",
  phone_screen:        "bg-brand-100 text-brand-800 ring-brand-200",
  interview_scheduled: "bg-brand-100 text-brand-800 ring-brand-200",
  interviewed:         "bg-brand-100 text-brand-800 ring-brand-200",
  onsite:              "bg-brand-100 text-brand-800 ring-brand-200",
  offer:               "bg-brand-100 text-brand-800 ring-brand-200",
  hired:               "bg-emerald-100 text-emerald-800 ring-emerald-200",
  passed:              "bg-slate-100 text-slate-700 ring-slate-200",
  rejected:            "bg-slate-100 text-slate-700 ring-slate-200",
  withdrawn:           "bg-slate-100 text-slate-700 ring-slate-200",
  closed:              "bg-slate-100 text-slate-700 ring-slate-200",
};

// Quick-action stages, presented in pipeline order. Each carries a
// lucide icon for identity instead of relying on colour. The button
// row uses a single neutral tone for everything except the current
// stage (filled brand) and the reject action (rose-hover only).
const QUICK_STAGES: Array<{
  id: "reviewing" | "shortlisted" | "interview_scheduled" | "offer" | "hired";
  label: string;
  icon: React.ElementType;
}> = [
  { id: "reviewing",           label: "Reviewing",  icon: Eye },
  { id: "shortlisted",         label: "Shortlist",  icon: Star },
  { id: "interview_scheduled", label: "Interview",  icon: Calendar },
  { id: "offer",               label: "Offer",      icon: Send },
  { id: "hired",               label: "Hired",      icon: CheckCircle2 },
];
const REJECT_STAGE = { id: "rejected", label: "Reject", icon: X } as const;

interface Comment {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

export function ApplicantPanel({
  a, isExpanded, onToggle, postingId, postingTitle, postingCompany,
  onPatch, onReloadAll,
}: Props) {
  // ── Lazy state per-applicant ─────────────────────────────
  const [fit, setFit] = useState<FitResult | null>(null);
  const [fitLoading, setFitLoading] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  /** Server-side comment errors (e.g. eligibility-gate rejection
   *  with code "not_commentable"). Previously a failed post silently
   *  no-op'd and the employer thought commenting was working. */
  const [commentError, setCommentError] = useState<string | null>(null);
  const [showResume, setShowResume] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [busyStage, setBusyStage] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  // Inline action modes — toggle one open at a time so the panel
  // stays focused.
  const [actionMode, setActionMode] = useState<"none" | "interview" | "offer">("none");

  useEffect(() => {
    if (!isExpanded) return;
    // loadFit / loadComments are function declarations defined below
    // (hoisted); the lint rule's strict reading flags the forward
    // reference but the runtime behaviour is fine.
    /* eslint-disable react-hooks/exhaustive-deps, react-hooks/immutability */
    if (fit === null && !fitLoading) {
      void loadFit();
    }
    if (comments === null) {
      void loadComments();
    }
    /* eslint-enable react-hooks/exhaustive-deps, react-hooks/immutability */
  }, [isExpanded]);

  async function loadFit() {
    setFitLoading(true);
    try {
      const r = await fetch(`/api/employer/applications/fit?postingId=${postingId}&applicantId=${a.applicantId}`, { cache: "no-store" });
      const j = await r.json();
      if (j?.ok && j.fit) setFit(j.fit as FitResult);
    } finally {
      setFitLoading(false);
    }
  }

  async function loadComments() {
    try {
      const r = await fetch(`/api/employer/applicants/${a.submissionId}/comments`, { cache: "no-store" });
      const j = await r.json();
      if (j?.ok && Array.isArray(j.comments)) setComments(j.comments as Comment[]);
    } catch {
      setComments([]);
    }
  }

  async function postComment() {
    const body = commentDraft.trim();
    if (!body || postingComment) return;
    setPostingComment(true);
    setCommentError(null);
    try {
      const r = await fetch(`/api/employer/applicants/${a.submissionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        comment?: Comment;
        error?: string;
        code?: string;
      };
      if (r.ok && j?.ok && j.comment) {
        setComments((cur) => (cur ? [...cur, j.comment as Comment] : [j.comment as Comment]));
        setCommentDraft("");
        onPatch({ commentCount: a.commentCount + 1 });
      } else {
        // Surface server-side errors — most importantly the
        // not_commentable eligibility gate that previously failed
        // silently. Without this, an employer trying to comment on
        // a pending/rejected applicant would see no feedback and
        // wonder if the submit button was broken.
        setCommentError(j?.error ?? "Couldn't post comment.");
      }
    } finally {
      setPostingComment(false);
    }
  }

  async function changeStage(toStage: string) {
    if (busyStage || toStage === a.status) return;
    setBusyStage(true);
    setStageError(null);
    try {
      // The /transition endpoint requires an ApplicationStatus id.
      // If the trainee submitted the talent app but hasn't formally
      // applied to this posting yet, we mint a fresh row via the
      // simpler /api/employer/applications POST and then retry.
      let appId = a.applicationStatusId;
      if (!appId) {
        const seed = await fetch("/api/employer/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postingId, applicantId: a.applicantId, status: "new" }),
        });
        const seedJ = await seed.json();
        appId = seedJ?.status?.id ?? null;
        if (appId) onPatch({ applicationStatusId: appId, status: "new" });
      }
      // Now run the proper transition with audit + email.
      if (appId) {
        const r = await fetch(`/api/employer/applications/${appId}/transition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toStage }),
        });
        const j = await r.json();
        if (!r.ok || !j?.ok) {
          setStageError(j?.error ?? "Couldn't move stage.");
          return;
        }
        onPatch({
          status: toStage,
          daysInStage: 0,
          stageEnteredAt: new Date().toISOString(),
        });
      }
    } finally {
      setBusyStage(false);
    }
  }

  // ── Collapsed row (default) ──────────────────────────────
  const tone = a.score >= 70 ? "emerald" : a.score >= 40 ? "amber" : "rose";
  const stageLabel = STAGE_LABEL[a.status] ?? a.status;
  const stagePill = STAGE_PILL_CLS[a.status] ?? STAGE_PILL_CLS.new;

  return (
    <div className={cn(isExpanded ? "bg-card" : "")}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-elevated/40 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="shrink-0">
          {isExpanded ? (
            <ChevronDown size={14} className="text-brand-600" />
          ) : (
            <ChevronRight size={14} className="text-subtle" />
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs flex items-center justify-center font-bold shrink-0">
          {(a.name ?? a.email)[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-sm font-semibold text-fg truncate">{a.name ?? a.email}</p>
            <span className={cn("text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md",
              tone === "emerald" ? "bg-emerald-100 text-emerald-800" :
              tone === "amber"   ? "bg-amber-100 text-amber-800" :
                                   "bg-rose-100 text-rose-700")}>
              {a.score}
            </span>
            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ring-1 ring-inset", stagePill)}>
              {stageLabel}
            </span>
          </div>
          <p className="text-[11px] text-muted truncate">
            {a.email}{a.country && ` · ${a.country}`}
            <> · <Clock size={9} className="inline -mt-0.5" /> {a.daysInStage}d in stage</>
            {a.commentCount > 0 && <> · <MessageSquare size={9} className="inline -mt-0.5" /> {a.commentCount}</>}
          </p>
        </div>
        <MaterialsIcons a={a} />
      </button>

      {/* ── Expanded inline detail ───────────────────────── */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-2 space-y-5 border-t border-line/70 bg-elevated/30">
          {/* ── Stage transitions ───────────────────────
              Pipeline-order row: Reviewing → Shortlist →
              Interview → Offer → Hired, with Reject visually
              separated to the right. Single neutral palette —
              identity comes from the icon, not the colour. The
              current stage is the only one filled in (brand);
              everything else is ghost, with a subtle brand-tinted
              hover. Reject hovers rose. */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2">
              Move to stage
            </p>
            <div className="flex flex-wrap items-center gap-1">
              {QUICK_STAGES.map((s, i) => {
                const Icon = s.icon;
                const isCurrent = s.id === a.status;
                return (
                  <div key={s.id} className="inline-flex items-center">
                    <button
                      type="button"
                      onClick={() => changeStage(s.id)}
                      disabled={busyStage || isCurrent}
                      title={isCurrent ? `Current stage: ${s.label}` : `Move to ${s.label}`}
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-all disabled:cursor-default",
                        isCurrent
                          ? "bg-brand-600 text-white ring-1 ring-inset ring-brand-700 shadow-sm"
                          : "bg-card text-fg ring-1 ring-inset ring-line hover:ring-brand-300 hover:bg-brand-50/60 hover:-translate-y-0.5",
                      )}
                    >
                      <Icon size={12} className={isCurrent ? "" : "text-muted"} />
                      {s.label}
                    </button>
                    {/* Connector tick — visually links the stages
                        as a pipeline. Hidden after the last
                        forward stage. */}
                    {i < QUICK_STAGES.length - 1 && (
                      <span className="mx-0.5 w-2 h-px bg-line shrink-0" aria-hidden />
                    )}
                  </div>
                );
              })}
              {/* Divider before the reject action */}
              <span className="mx-1 sm:mx-2 h-5 w-px bg-line shrink-0" aria-hidden />
              <button
                type="button"
                onClick={() => changeStage(REJECT_STAGE.id)}
                disabled={busyStage || a.status === REJECT_STAGE.id}
                title={a.status === REJECT_STAGE.id ? "Already rejected" : "Reject this candidate"}
                className={cn(
                  "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-all disabled:cursor-default",
                  a.status === REJECT_STAGE.id
                    ? "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-300"
                    : "bg-card text-muted ring-1 ring-inset ring-line hover:ring-rose-300 hover:bg-rose-50 hover:text-rose-800 hover:-translate-y-0.5",
                )}
              >
                <REJECT_STAGE.icon size={12} />
                {REJECT_STAGE.label}
              </button>
              {busyStage && <Loader2 size={12} className="animate-spin text-muted ml-1" />}
            </div>
            {stageError && (
              <p className="text-xs text-rose-700 mt-2">{stageError}</p>
            )}
          </section>

          {/* ── Materials + contact ─────────────────── */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2">
              Materials
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {a.resumeUrl && (
                <button
                  type="button"
                  onClick={() => setShowResume((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-brand-50 text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100"
                >
                  <FileText size={11} /> Resume {showResume ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                </button>
              )}
              {a.videoUrl && (
                <button
                  type="button"
                  onClick={() => setShowVideo((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-violet-50 text-violet-800 ring-1 ring-violet-200 hover:bg-violet-100"
                >
                  <Video size={11} /> 1-min video {showVideo ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                </button>
              )}
              <a
                href={`mailto:${a.email}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-elevated text-fg ring-1 ring-line hover:bg-card"
              >
                <Mail size={11} /> Email
              </a>
              {!a.resumeUrl && !a.videoUrl && (
                <span className="text-[11px] text-subtle italic">No external materials uploaded.</span>
              )}
            </div>

            {/* Resume preview — Collapse smooths the height change.
                The iframe stays mounted while collapsed (avoiding a
                second network load on re-open) but is aria-hidden +
                pointer-events skipped by the wrapper. */}
            {a.resumeUrl && (
              <Collapse open={showResume}>
                <div className="mt-3 rounded-xl border border-line overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 text-[11px] text-muted bg-elevated/40 border-b border-line/70">
                    <span className="truncate">{a.resumeUrl}</span>
                    <a
                      href={a.resumeUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-brand-700 hover:underline shrink-0 ml-2"
                    >
                      Open in new tab <ExternalLink size={10} />
                    </a>
                  </div>
                  <iframe src={a.resumeUrl} title="Resume" className="w-full h-[500px] bg-white" />
                </div>
              </Collapse>
            )}
            {a.videoUrl && (
              <Collapse open={showVideo}>
                <div className="mt-3 rounded-xl border border-line overflow-hidden bg-black">
                  <div className="aspect-video w-full">
                    <iframe src={a.videoUrl} title="1-min video" allow="autoplay; fullscreen" allowFullScreen className="w-full h-full" />
                  </div>
                </div>
              </Collapse>
            )}

            {a.coverLetter && (
              <div className="mt-3 rounded-xl bg-emerald-50/30 ring-1 ring-emerald-200/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-emerald-900 mb-1 inline-flex items-center gap-1">
                  <FileSignature size={10} /> Cover letter
                </p>
                <p className="text-sm text-fg whitespace-pre-wrap leading-relaxed">{a.coverLetter}</p>
              </div>
            )}
            {a.pitch && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-1 inline-flex items-center gap-1">
                  <Sparkles size={10} /> Elevator pitch
                </p>
                <p className="text-sm text-muted leading-relaxed">{a.pitch}</p>
              </div>
            )}
          </section>

          {/* ── AI fit breakdown ────────────────────── */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2 inline-flex items-center gap-1">
              <Sparkles size={10} className="text-brand-600" /> AI fit breakdown
            </p>
            {fitLoading && (
              <p className="text-xs text-muted inline-flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Computing…
              </p>
            )}
            {fit && !fitLoading && <FitExplain fit={fit} variant="panel" heading="" />}
          </section>

          {/* ── Top skills (compact) ──────────────────── */}
          {a.topSkills.length > 0 && (
            <section>
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2">Top skills</p>
              <div className="flex flex-wrap gap-1.5">
                {a.topSkills.map((s) => (
                  <span key={s.name} className="text-[11px] inline-flex items-center gap-1 bg-elevated text-fg rounded-full px-2 py-0.5 border border-line">
                    {s.name}
                    {s.source === "inferred" && <GraduationCap size={9} className="text-brand-600" />}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ── Inline action toggles ────────────────── */}
          <section className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActionMode((m) => (m === "interview" ? "none" : "interview"))}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ring-1 ring-inset transition-colors",
                actionMode === "interview"
                  ? "bg-amber-100 text-amber-900 ring-amber-300"
                  : "bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100",
              )}
            >
              <Calendar size={12} />
              {actionMode === "interview" ? "Hide interview form" : "Schedule interview"}
            </button>
            <button
              type="button"
              onClick={() => setActionMode((m) => (m === "offer" ? "none" : "offer"))}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ring-1 ring-inset transition-colors",
                actionMode === "offer"
                  ? "bg-violet-100 text-violet-900 ring-violet-300"
                  : "bg-violet-50 text-violet-800 ring-violet-200 hover:bg-violet-100",
              )}
            >
              <Send size={12} />
              {actionMode === "offer" ? "Hide offer composer" : "Send offer"}
            </button>
          </section>

          {/* Inline action forms — height-animated open/close via
              Collapse so the transition feels intentional. Forms
              stay mounted while collapsed so a half-typed draft
              survives toggling. */}
          <Collapse open={actionMode === "interview"}>
            <InterviewForm
              applicantId={a.applicantId}
              applicationStatusId={a.applicationStatusId}
              postingId={postingId}
              onSent={() => {
                setActionMode("none");
                onReloadAll();
              }}
            />
          </Collapse>
          <Collapse open={actionMode === "offer"}>
            <OfferForm
              applicantId={a.applicantId}
              applicationStatusId={a.applicationStatusId}
              postingId={postingId}
              postingTitle={postingTitle}
              postingCompany={postingCompany}
              onSent={() => {
                setActionMode("none");
                onReloadAll();
              }}
            />
          </Collapse>

          {/* ── Comments thread ─────────────────────── */}
          <section>
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2 inline-flex items-center gap-1">
              <MessageSquare size={10} /> Team-private comments
              {a.commentCount > 0 && <span className="text-fg">· {a.commentCount}</span>}
            </p>
            {comments === null && (
              <p className="text-xs text-muted inline-flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" /> Loading…
              </p>
            )}
            {comments && comments.length > 0 && (
              <ul className="space-y-2">
                {comments.map((c) => (
                  <li key={c.id} className="rounded-lg bg-card ring-1 ring-line px-3 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold text-fg">
                        {c.authorName}{" "}
                        <span className="text-[10px] uppercase tracking-wider text-subtle font-bold">{c.authorRole}</span>
                      </p>
                      <p className="text-[10px] text-subtle">{new Date(c.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="text-sm text-fg mt-1 leading-relaxed whitespace-pre-wrap">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
            {comments && comments.length === 0 && (
              <p className="text-xs text-muted italic">No comments yet. Be the first to leave a note for the team.</p>
            )}
            <div className="mt-2">
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                rows={2}
                disabled={postingComment}
                placeholder="Notes for the team — fit, follow-ups, who's already spoken to them…"
                className="w-full text-sm text-fg bg-card rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-y disabled:opacity-50"
              />
              {commentError && (
                // Inline error — most often the eligibility-gate
                // rejection ("Commenting is locked until an admin
                // approves this applicant's eligibility."). Used to
                // fail silently; the employer would click Post and
                // wonder if it was broken.
                <p className="mt-1.5 text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-md px-2.5 py-1.5">
                  {commentError}
                </p>
              )}
              <div className="mt-1.5 flex items-center justify-end">
                <button
                  type="button"
                  onClick={postComment}
                  disabled={postingComment || commentDraft.trim().length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {postingComment ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                  Post comment
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ─── Materials icon row (right side of collapsed) ───────────────

function MaterialsIcons({ a }: { a: ApplicantData }) {
  return (
    <span className="inline-flex items-center gap-1 text-subtle shrink-0">
      {a.hasResume       && <FileText      size={11} className="text-brand-700" />}
      {a.hasVideo        && <Video         size={11} className="text-violet-700" />}
      {a.hasPitch        && <Sparkles      size={11} className="text-amber-700" />}
      {a.hasCoverLetter  && <FileSignature size={11} className="text-emerald-700" />}
      {a.rating != null && (
        <span className="inline-flex items-center gap-0.5 text-amber-600 text-[10px] font-bold tabular-nums">
          <Star size={10} fill="currentColor" /> {a.rating}
        </span>
      )}
    </span>
  );
}

// ─── Inline interview form ──────────────────────────────────────

function InterviewForm({
  applicationStatusId, applicantId, postingId, onSent,
}: {
  applicationStatusId: string | null;
  applicantId: string;
  postingId: string;
  onSent: () => void;
}) {
  const [slots, setSlots] = useState<string[]>([""]);
  const [format, setFormat] = useState<"phone" | "video" | "onsite">("video");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      // Make sure an ApplicationStatus row exists so the API can
      // anchor the Interview row. Mint one in "reviewing" if missing.
      let appId = applicationStatusId;
      if (!appId) {
        const seed = await fetch("/api/employer/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postingId, applicantId, status: "reviewing" }),
        });
        const seedJ = await seed.json();
        appId = seedJ?.status?.id ?? null;
      }
      if (!appId) {
        setError("Couldn't create an application row.");
        return;
      }
      const proposedSlots = slots
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => new Date(s).toISOString());
      if (proposedSlots.length === 0) {
        setError("Add at least one time slot.");
        return;
      }
      const r = await fetch(`/api/employer/applications/${appId}/interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposedSlots,
          format,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setError(j?.error ?? "Couldn't send the interview proposal.");
        return;
      }
      onSent();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl bg-amber-50/40 ring-1 ring-amber-200 p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-amber-900 mb-2 inline-flex items-center gap-1">
        <Calendar size={11} /> Propose interview slots
      </p>
      <p className="text-[11px] text-amber-900/80 mb-3 leading-snug">
        Propose 1-5 datetime options. The candidate picks one in their tracker; both sides see the confirmed time.
      </p>

      <div className="space-y-2">
        {slots.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={s}
              onChange={(e) => setSlots((cur) => cur.map((v, j) => (j === i ? e.target.value : v)))}
              className="text-sm bg-card border border-line rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            {slots.length > 1 && (
              <button
                type="button"
                onClick={() => setSlots((cur) => cur.filter((_, j) => j !== i))}
                className="text-amber-700 hover:text-amber-900"
                aria-label="Remove slot"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
        {slots.length < 5 && (
          <button
            type="button"
            onClick={() => setSlots((cur) => [...cur, ""])}
            className="text-xs text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
          >
            <Plus size={11} /> Add another slot
          </button>
        )}
      </div>

      <div className="mt-3 grid sm:grid-cols-2 gap-2 text-xs">
        <label>
          <span className="block font-semibold text-amber-900 mb-1">Format</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as typeof format)}
            className="w-full bg-card border border-line rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="video">Video</option>
            <option value="phone">Phone</option>
            <option value="onsite">Onsite</option>
          </select>
        </label>
        <label>
          <span className="block font-semibold text-amber-900 mb-1">
            {format === "onsite" ? "Address" : "Meeting link (optional)"}
          </span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={format === "onsite" ? "123 Front St, Toronto" : "https://zoom.us/j/…"}
            className="w-full bg-card border border-line rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </label>
      </div>

      <label className="block mt-2 text-xs">
        <span className="block font-semibold text-amber-900 mb-1">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Prep details, what they should bring, who they'll meet…"
          className="w-full bg-card border border-line rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-y"
        />
      </label>

      {error && <p className="text-xs text-rose-700 mt-2">{error}</p>}

      <div className="mt-3 flex items-center justify-end">
        <button
          type="button"
          onClick={send}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          Send proposal
        </button>
      </div>
    </section>
  );
}

// ─── Inline offer form ──────────────────────────────────────────

const OFFER_TEMPLATE_BODIES: Record<string, string> = {
  paid_internship:
    "Dear {{name}},\n\nWe're pleased to extend an offer for the {{title}} role at {{company}}. The position is a paid internship at {{compensation}} for {{duration}}, starting {{startDate}}.\n\nAccept by {{acceptBy}} to confirm. Looking forward to working with you.",
  academic_credit:
    "Dear {{name}},\n\nWe'd like to offer you the {{title}} placement at {{company}} as an academic-credit co-op for {{duration}}, starting {{startDate}}.\n\nPlease coordinate with your institution to confirm credit eligibility. Accept by {{acceptBy}}.",
  contract:
    "Dear {{name}},\n\nWe're offering you the {{title}} role at {{company}} on a contract basis ({{compensation}} for {{duration}}), starting {{startDate}}. Accept by {{acceptBy}}.",
};

function OfferForm({
  applicationStatusId, applicantId, postingId, postingTitle, postingCompany, onSent,
}: {
  applicationStatusId: string | null;
  applicantId: string;
  postingId: string;
  postingTitle: string;
  postingCompany: string;
  onSent: () => void;
}) {
  const [template, setTemplate] = useState<"paid_internship" | "academic_credit" | "contract">("paid_internship");
  const [compensation, setCompensation] = useState("");
  const [duration, setDuration] = useState("");
  const [startDate, setStartDate] = useState("");
  const [acceptBy, setAcceptBy] = useState("");
  const [body, setBody] = useState(OFFER_TEMPLATE_BODIES.paid_internship);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  function applyTemplate(key: typeof template) {
    setTemplate(key);
    setBody(OFFER_TEMPLATE_BODIES[key]);
  }

  const filledBody = body
    .replace(/{{title}}/g,        postingTitle)
    .replace(/{{company}}/g,      postingCompany)
    .replace(/{{compensation}}/g, compensation || "[compensation]")
    .replace(/{{duration}}/g,     duration || "[duration]")
    .replace(/{{startDate}}/g,    startDate || "[start date]")
    .replace(/{{acceptBy}}/g,     acceptBy || "[deadline]")
    .replace(/{{name}}/g,         "[candidate name]");

  async function submit(send: boolean) {
    setBusy(true);
    setError(null);
    try {
      let appId = applicationStatusId;
      if (!appId) {
        const seed = await fetch("/api/employer/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postingId, applicantId, status: "interviewed" }),
        });
        const seedJ = await seed.json();
        appId = seedJ?.status?.id ?? null;
      }
      if (!appId) {
        setError("Couldn't anchor the offer to an application row.");
        return;
      }
      const r = await fetch(`/api/employer/applications/${appId}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: template,
          body: filledBody,
          compensation: compensation || undefined,
          startDate: startDate || undefined,
          acceptDeadline: acceptBy || undefined,
          send,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setError(j?.error ?? "Couldn't save the offer.");
        return;
      }
      if (send) onSent();
      else {
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 3000);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl bg-violet-50/40 ring-1 ring-violet-200 p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-violet-900 mb-2 inline-flex items-center gap-1">
        <Send size={11} /> Compose offer
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {(["paid_internship", "academic_credit", "contract"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => applyTemplate(k)}
            className={cn(
              "text-[11px] font-bold px-2 py-1 rounded-md ring-1 ring-inset transition-colors",
              template === k
                ? "bg-violet-600 text-white ring-violet-700"
                : "bg-card text-violet-900 ring-violet-200 hover:bg-violet-100",
            )}
          >
            {k === "paid_internship" ? "Paid internship" : k === "academic_credit" ? "Academic credit" : "Contract"}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-2 mb-3 text-xs">
        <Input label="Compensation" value={compensation} onChange={setCompensation} placeholder="$24/hr" />
        <Input label="Duration" value={duration} onChange={setDuration} placeholder="16 weeks" />
        <Input label="Start date" value={startDate} onChange={setStartDate} placeholder="2025-01-13" />
        <Input label="Accept by" value={acceptBy} onChange={setAcceptBy} placeholder="2024-12-20" />
      </div>

      <label className="block text-xs">
        <span className="block font-semibold text-violet-900 mb-1">Body (markdown)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="w-full bg-card border border-line rounded-md px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-y"
        />
      </label>
      <p className="text-[10px] text-violet-900/70 mt-1">
        Placeholders <code className="font-mono">{"{{title}}"}</code>, <code className="font-mono">{"{{company}}"}</code>,
        <code className="font-mono"> {"{{compensation}}"}</code>, etc. are filled in on send.
      </p>

      {error && <p className="text-xs text-rose-700 mt-2">{error}</p>}
      {draftSaved && <p className="text-xs text-emerald-700 mt-2 inline-flex items-center gap-1"><CheckCircle2 size={11} /> Draft saved.</p>}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-violet-900 ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-50"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          Save draft
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          Send offer
        </button>
      </div>
    </section>
  );
}

function Input({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block font-semibold text-violet-900 mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-card border border-line rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
      />
    </label>
  );
}

// Silence unused imports.
void AlertTriangle;
void Inbox;
void XCircle;

// ─── <Collapse>: snappy height-animated open/close ──────────────
//
// Uses the modern grid-template-rows trick: animating from 0fr →
// 1fr lets the browser smoothly interpolate the row's height without
// us having to measure the inner content first. The inner div is
// min-h-0 + overflow-hidden so as the row shrinks, content gets
// clipped instead of overflowing.
//
// Why this pattern beats max-height
//   max-height transitions require a known max value — too small
//   and content clips; too large and the easing curve eats most of
//   the duration before anything visible happens. grid-template-rows
//   is auto-sized, so the transition feels snappy regardless of
//   content height.
//
// We pair it with an opacity fade so the inner content doesn't pop
// in at zero height, and aria-hidden so screen readers don't
// re-read collapsed content.
function Collapse({
  open, children, durationMs = 220,
}: {
  open: boolean;
  children: React.ReactNode;
  durationMs?: number;
}) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateRows: open ? "1fr" : "0fr",
        transition: `grid-template-rows ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
      aria-hidden={!open}
    >
      <div
        className="min-h-0 overflow-hidden"
        style={{
          opacity: open ? 1 : 0,
          transition: `opacity ${durationMs}ms ease-out`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
