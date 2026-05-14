"use client";
/**
 * Talent-applicant card for /employer/applicants.
 *
 * Rebuilt from the old read-only roster (anchor links to resume +
 * video, no scoring, no comments) into a 4-feature card:
 *
 *   1. Match-score chip — shows the trainee's best-fit posting from
 *      the viewing employer's active postings (computed server-side
 *      via lib/matching/fit) and the AI confidence band.
 *   2. One-click resume expand — inline <iframe> preview of the PDF
 *      (or any URL the browser can render). External link is the
 *      escape hatch for blocked PDF.js / non-PDF resumes.
 *   3. Inline 1-min video player — local-host MP4 / WebM uses the
 *      native <video> element; YouTube + Vimeo + Loom URLs render
 *      via their embed iframe.
 *   4. Comments — list + write, loaded lazily when the comments
 *      section is opened. Backed by ApplicationComment via the
 *      /api/employer/applicants/[submissionId]/comments API.
 *
 * Privacy: the card never reveals data the trainee didn't put on the
 * talent application. Comments are HR-private (gated to admin /
 * superadmin / employer / instructor in the API) and never surface
 * to the trainee.
 */
import { useState } from "react";
import Link from "next/link";
import {
  Paperclip, Video, Mail, Calendar, ChevronDown, ChevronUp,
  Sparkles, MessageSquare, ExternalLink, Loader2, Send,
} from "lucide-react";

export interface TalentApplicantMatch {
  /** Best-fit posting from the viewing employer's active set. */
  postingId: string;
  postingTitle: string;
  /** 0..100 rounded. */
  score: number;
  band: "high" | "medium" | "low";
  /** 0..1 — UI shows a confidence chip. */
  confidence: number;
}

export interface TalentApplicantSummary {
  submissionId: string;
  email: string | null;
  createdAt: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
  /** Skill / location tags shown as chips. */
  skills: string[];
  pitch: string;
  resumeUrl: string | null;
  videoUrl: string | null;
  /** When a real User row backs the submission, we can fit-score them
   *  and link out to the applicant detail / talent profile. */
  userId: string | null;
  match: TalentApplicantMatch | null;
  /** Initial count from the server load — keeps the badge accurate
   *  before the user opens the thread. */
  commentCount: number;
}

interface Comment {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

interface Props {
  applicant: TalentApplicantSummary;
}

const BAND_COPY: Record<TalentApplicantMatch["band"], { label: string; chipClass: string }> = {
  high: {
    label: "Strong fit",
    chipClass: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  },
  medium: {
    label: "Possible fit",
    chipClass: "bg-amber-100 text-amber-800 ring-amber-200",
  },
  low: {
    label: "Weak fit",
    chipClass: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

/** Detect YouTube / Vimeo / Loom and rewrite to their embeddable URL. */
function videoEmbed(url: string): { kind: "native" | "iframe"; src: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    // YouTube — youtu.be/<id> or youtube.com/watch?v=<id>.
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }
    // Vimeo — vimeo.com/<id>
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) {
        return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
      }
    }
    // Loom — loom.com/share/<id>
    if (host === "loom.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      if (id) return { kind: "iframe", src: `https://www.loom.com/embed/${id}` };
    }
    // Direct media files — render via <video>.
    if (/\.(mp4|webm|mov|m4v|ogg)$/i.test(u.pathname)) {
      return { kind: "native", src: url };
    }
    // Unknown host but valid URL — try iframe; some platforms will
    // refuse via X-Frame-Options, which is why we always show the
    // "open in new tab" escape hatch underneath.
    return { kind: "iframe", src: url };
  } catch {
    return null;
  }
}

export function TalentApplicantCard({ applicant }: Props) {
  const [showResume, setShowResume] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentCount, setCommentCount] = useState(applicant.commentCount);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadComments() {
    if (comments !== null || loadingComments) return;
    setLoadingComments(true);
    setError(null);
    try {
      const res = await fetch(`/api/employer/applicants/${applicant.submissionId}/comments`);
      const j = await res.json().catch(() => ({}));
      if (j?.ok && Array.isArray(j.comments)) {
        setComments(j.comments);
        setCommentCount(j.comments.length);
      } else {
        setError(j?.error ?? "Couldn't load comments.");
      }
    } catch {
      setError("Couldn't load comments.");
    } finally {
      setLoadingComments(false);
    }
  }

  function toggleComments() {
    setShowComments((wasOpen) => {
      const nextOpen = !wasOpen;
      if (nextOpen) void loadComments();
      return nextOpen;
    });
  }

  async function submitComment() {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/employer/applicants/${applicant.submissionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setError(j?.error ?? "Couldn't post comment.");
        return;
      }
      setComments((prev) => (prev ? [...prev, j.comment] : [j.comment]));
      setCommentCount((c) => c + 1);
      setDraft("");
    } finally {
      setPosting(false);
    }
  }

  const videoMeta = applicant.videoUrl ? videoEmbed(applicant.videoUrl) : null;
  const match = applicant.match;

  return (
    <article className="bg-card border border-line rounded-2xl p-5">
      <div className="flex gap-5 items-start">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold shrink-0">
          {applicant.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h2 className="font-semibold text-fg leading-tight">
                {applicant.firstName || "Anonymous"} {applicant.lastName}
              </h2>
              {applicant.role && (
                <p className="text-xs text-subtle mt-0.5">{applicant.role}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted shrink-0">
              {applicant.email && (
                <a
                  href={`mailto:${applicant.email}`}
                  className="inline-flex items-center gap-1 hover:text-brand-700"
                >
                  <Mail size={11} /> Contact
                </a>
              )}
            </div>
          </div>

          {/* Match score chip — receipts before recommendation. We
              show the band + score + the matched posting title so
              the chip means something concrete; the bare number on
              its own would be opaque. */}
          {match ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset ${BAND_COPY[match.band].chipClass}`}
                title={`AI fit · confidence ${(match.confidence * 100).toFixed(0)}%`}
              >
                <Sparkles size={11} /> {match.score}/100 · {BAND_COPY[match.band].label}
              </span>
              <span className="text-[11px] text-muted truncate max-w-[28ch]">
                best fit · <span className="text-fg">{match.postingTitle}</span>
              </span>
              {applicant.userId && (
                <Link
                  href={`/profile/${applicant.userId}`}
                  className="text-[11px] text-brand-700 hover:underline"
                >
                  View profile
                </Link>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-subtle italic">
              {applicant.userId
                ? "No active postings to score against."
                : "Application not linked to a BHN account — no AI match available."}
            </p>
          )}

          {applicant.pitch && (
            <p className="text-sm text-muted line-clamp-3 mt-3 leading-relaxed">
              {applicant.pitch}
            </p>
          )}

          {applicant.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
              {applicant.skills.slice(0, 6).map((sk) => (
                <span
                  key={sk}
                  className="px-2 py-0.5 rounded-full bg-elevated text-muted border border-line"
                >
                  {sk}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-1 text-[11px] text-subtle">
            <Calendar size={11} /> Applied {new Date(applicant.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Action row — toggles for resume / video / comments. Each is a
          drawer that opens in place so a recruiter can review one
          applicant top-to-bottom without leaving the page. */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {applicant.resumeUrl && (
          <button
            type="button"
            onClick={() => setShowResume((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ring-1 ring-inset transition-colors ${
              showResume
                ? "bg-brand-100 text-brand-800 ring-brand-200"
                : "bg-elevated text-fg ring-line hover:bg-card"
            }`}
            aria-expanded={showResume}
          >
            <Paperclip size={12} /> Resume {showResume ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
        {applicant.videoUrl && (
          <button
            type="button"
            onClick={() => setShowVideo((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ring-1 ring-inset transition-colors ${
              showVideo
                ? "bg-brand-100 text-brand-800 ring-brand-200"
                : "bg-elevated text-fg ring-line hover:bg-card"
            }`}
            aria-expanded={showVideo}
          >
            <Video size={12} /> 1-min video {showVideo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
        <button
          type="button"
          onClick={toggleComments}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ring-1 ring-inset transition-colors ${
            showComments
              ? "bg-brand-100 text-brand-800 ring-brand-200"
              : "bg-elevated text-fg ring-line hover:bg-card"
          }`}
          aria-expanded={showComments}
        >
          <MessageSquare size={12} /> Comments
          {commentCount > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold">
              {commentCount}
            </span>
          )}{" "}
          {showComments ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Resume preview — render the URL straight into an iframe. PDF
          works in every browser via the built-in viewer; non-PDF URLs
          (DOCX, Notion) may refuse to render, so the open-in-tab link
          is always visible. */}
      {showResume && applicant.resumeUrl && (
        <div className="mt-3 border border-line rounded-xl overflow-hidden bg-elevated">
          <div className="flex items-center justify-between px-3 py-2 text-[11px] text-muted border-b border-line">
            <span className="truncate">{applicant.resumeUrl}</span>
            <a
              href={applicant.resumeUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-brand-700 hover:underline shrink-0 ml-2"
            >
              Open in new tab <ExternalLink size={10} />
            </a>
          </div>
          <iframe
            src={applicant.resumeUrl}
            title="Applicant resume"
            className="w-full h-[600px] bg-white"
          />
        </div>
      )}

      {/* Video preview — native <video> for MP4/WebM, iframe for
          YouTube / Vimeo / Loom. The aspect-video wrapper keeps the
          card grid tidy on responsive layouts. */}
      {showVideo && applicant.videoUrl && (
        <div className="mt-3 border border-line rounded-xl overflow-hidden bg-black">
          <div className="aspect-video w-full bg-black">
            {videoMeta?.kind === "native" ? (
              <video
                src={videoMeta.src}
                controls
                className="w-full h-full"
                preload="metadata"
              />
            ) : videoMeta?.kind === "iframe" ? (
              <iframe
                src={videoMeta.src}
                title="Applicant 1-minute introduction"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-white/70 text-sm">
                Can&apos;t preview this video URL inline.
              </div>
            )}
          </div>
          <div className="flex items-center justify-end px-3 py-2 text-[11px] text-muted bg-elevated">
            <a
              href={applicant.videoUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-brand-700 hover:underline"
            >
              Open in new tab <ExternalLink size={10} />
            </a>
          </div>
        </div>
      )}

      {/* Comments — list + write. Loaded the first time the section
          opens to keep the initial page payload small. */}
      {showComments && (
        <div className="mt-3 border border-line rounded-xl bg-elevated/50">
          <div className="px-3 py-2 text-[11px] uppercase tracking-[0.2em] font-bold text-subtle border-b border-line">
            HR-private comments
          </div>
          <div className="p-3 space-y-3 max-h-72 overflow-y-auto">
            {loadingComments && (
              <p className="text-xs text-muted inline-flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Loading…
              </p>
            )}
            {!loadingComments && comments && comments.length === 0 && (
              <p className="text-xs text-muted italic">
                No comments yet. Be the first to leave a note for the team.
              </p>
            )}
            {comments?.map((c) => (
              <div key={c.id} className="bg-card border border-line rounded-lg p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold text-fg">
                    {c.authorName}{" "}
                    <span className="ml-1 text-[10px] uppercase tracking-wider font-bold text-subtle">
                      {c.authorRole}
                    </span>
                  </p>
                  <p className="text-[10px] text-subtle shrink-0">
                    {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 text-sm text-fg whitespace-pre-wrap leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-line">
            <label className="block">
              <span className="block text-[11px] font-semibold text-fg mb-1">
                Add a comment
              </span>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                disabled={posting}
                placeholder="Notes for the team — fit, follow-ups, who's already spoken to them…"
                className="w-full text-sm text-fg bg-card rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/60 resize-y disabled:opacity-50"
              />
            </label>
            {error && (
              <p className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
                {error}
              </p>
            )}
            <div className="mt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={submitComment}
                disabled={posting || draft.trim().length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Post comment
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
