"use client";

/**
 * SubmissionsPanel — displays submitted interviewer scorecards for a posting.
 *
 * Live-fetches from GET /api/employer/postings/[postingId]/scorecard/submissions
 * on mount so the server pass (SSR initial state) stays fast and submissions
 * stay up-to-date on revisit.
 */

import { useEffect, useState } from "react";
import { ClipboardList, Loader2, ThumbsUp, ThumbsDown, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import type { ScorecardData } from "./ScorecardBuilder";

// ── Types ─────────────────────────────────────────────────────────

export interface SubmissionData {
  id:                  string;
  applicationStatusId: string;
  interviewerId:       string;
  interviewerName:     string | null;
  scores:              Record<string, { score: number; note?: string }>;
  recommendation:      string;
  summary:             string | null;
  status:              string;
  submittedAt:         string | null;
}

interface Props {
  postingId:   string;
  submissions: SubmissionData[];   // SSR initial state (may be empty)
  scorecard:   ScorecardData | null;
}

// ── Recommendation chip config ────────────────────────────────────

const REC_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  strong_yes:  { label: "Strong yes",  className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  yes:         { label: "Yes",         className: "bg-brand/10 text-brand ring-brand/30" },
  no_decision: { label: "No decision", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  no:          { label: "No",          className: "bg-rose-50 text-rose-700 ring-rose-200" },
  strong_no:   { label: "Strong no",   className: "bg-red-100 text-red-800 ring-red-300" },
};

function RecChip({ rec }: { rec: string }) {
  const cfg = REC_CONFIG[rec];
  if (!cfg) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

// ── Component ────────────────────────────────────────────────────

export function SubmissionsPanel({ postingId, submissions: initialSubmissions, scorecard }: Props) {
  const [submissions, setSubmissions] = useState<SubmissionData[]>(initialSubmissions);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/employer/postings/${postingId}/scorecard/submissions`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setSubmissions(data.submissions ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load submissions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [postingId]);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-subtle">
            Interviewer submissions
          </p>
          <p className="text-xs text-muted mt-0.5">
            {loading ? "Loading…" : `${submissions.length} submission${submissions.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {loading && <Loader2 size={15} className="animate-spin text-muted" />}
      </div>

      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2 ring-1 ring-inset ring-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && submissions.length === 0 && (
        <div className="py-10 text-center">
          <ClipboardList size={28} className="mx-auto text-muted mb-3" />
          <p className="text-sm font-medium text-fg">No submissions yet</p>
          <p className="text-xs text-muted mt-1">
            Interviewers can submit their evaluations from the candidate detail page.
          </p>
        </div>
      )}

      {!loading && submissions.length > 0 && (
        <div className="space-y-3">
          {submissions.map((s) => {
            const scoreCount  = Object.keys(s.scores).length;
            const totalScore  = Object.values(s.scores).reduce(
              (acc, v) => acc + v.score, 0,
            );
            const avgScore = scoreCount > 0
              ? (totalScore / scoreCount).toFixed(1)
              : null;

            return (
              <div
                key={s.id}
                className="rounded-xl border border-line bg-elevated/30 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-sm font-semibold text-fg">
                      {s.interviewerName ?? "Unknown interviewer"}
                    </span>
                    {s.submittedAt && (
                      <span className="text-xs text-muted ml-2">
                        {new Date(s.submittedAt).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {avgScore && (
                      <span className="text-xs font-mono text-muted bg-elevated px-2 py-0.5 rounded-md border border-line">
                        avg {avgScore}
                      </span>
                    )}
                    <RecChip rec={s.recommendation} />
                  </div>
                </div>

                {/* Criteria scores */}
                {scorecard && scorecard.criteria.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {scorecard.criteria.map((c) => {
                      const entry = s.scores[c.id];
                      return (
                        <div key={c.id} className="text-xs">
                          <span className="text-muted truncate block">{c.label}</span>
                          <span className="font-semibold text-fg">
                            {entry ? `${entry.score} / ${c.scale}` : "—"}
                          </span>
                          {entry?.note && (
                            <span className="text-muted italic block truncate">{entry.note}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Summary */}
                {s.summary && (
                  <p className="text-xs text-muted leading-relaxed border-t border-line pt-2 mt-2">
                    {s.summary}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
