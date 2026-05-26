"use client";

/**
 * ShowcaseAdminClient — grid of showcase submissions on
 * /admin/showcase.
 *
 * Each row carries: headshot thumbnail, name, LinkedIn link,
 * created date, last-downloaded date (if any), and three actions —
 *   Download    — opens the photo URL + the LinkedIn URL in new
 *                 tabs; on success calls the mark-downloaded API
 *                 (so the row records who/when).
 *   Mark done   — explicit toggle (sets/clears last-downloaded
 *                 manually, in case the auto-mark missed).
 *   Delete      — hard-deletes the row + drops the R2 object.
 *
 * Filtering: program tab + a "show only undownloaded" toggle.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, CheckCircle2, Circle, ExternalLink, Filter, AlertCircle } from "lucide-react";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Submission {
  id: string;
  programSlug: string;
  name: string;
  linkedinHandle: string;
  linkedinUrl: string | null;
  photoUrl: string;
  photoKey: string;
  submittedFromIp: string | null;
  submittedFromUa: string | null;
  createdAt: string;
  lastDownloadedAt: string | null;
  lastDownloadedBy: string | null;
  adminNote: string | null;
}

interface Props {
  initialSubmissions: Submission[];
  adminName: string;
}

export function ShowcaseAdminClient({ initialSubmissions, adminName }: Props) {
  const router = useRouter();
  const { confirmDialog, node: confirmNode } = useConfirmDialog();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [onlyUndownloaded, setOnlyUndownloaded] = useState(false);
  const [programFilter, setProgramFilter] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const programs = Array.from(new Set(submissions.map((s) => s.programSlug)));
  const visible = submissions.filter((s) => {
    if (onlyUndownloaded && s.lastDownloadedAt) return false;
    if (programFilter && s.programSlug !== programFilter) return false;
    return true;
  });

  async function markDownloaded(s: Submission, mark: boolean) {
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/showcase/${s.id}/mark-downloaded`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        submission?: Submission;
        error?: string;
      };
      if (!res.ok || !j.submission) {
        setError(j.error ?? `Update failed (HTTP ${res.status}).`);
        return;
      }
      setSubmissions((cur) => cur.map((x) => (x.id === s.id ? j.submission! : x)));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteRow(s: Submission) {
    const ok = await confirmDialog({
      title: `Delete ${s.name}'s submission?`,
      description: "Removes the row AND deletes the headshot from storage. Cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Keep it",
      tone: "destructive",
    });
    if (!ok) return;
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/showcase/${s.id}`, { method: "DELETE" });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? `Delete failed (HTTP ${res.status}).`);
        return;
      }
      setSubmissions((cur) => cur.filter((x) => x.id !== s.id));
    } finally {
      setBusyId(null);
    }
  }

  function downloadPhoto(s: Submission) {
    // Open the photo URL in a new tab — browser handles the actual
    // save. Then in the background, mark this row as downloaded.
    window.open(s.photoUrl, "_blank");
    startTransition(() => {
      void markDownloaded(s, true);
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line/70 bg-card-solid px-4 py-2.5">
        <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] font-bold text-fg-subtle">
          <Filter size={11} /> Filters
        </div>
        <button
          type="button"
          onClick={() => setProgramFilter(null)}
          className={
            "text-[11.5px] px-2 py-1 rounded-md transition-colors " +
            (programFilter === null
              ? "bg-brand-600 text-white font-semibold"
              : "text-fg-muted hover:text-fg hover:bg-elevated")
          }
        >
          All ({submissions.length})
        </button>
        {programs.map((p) => {
          const n = submissions.filter((s) => s.programSlug === p).length;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setProgramFilter(p)}
              className={
                "text-[11.5px] px-2 py-1 rounded-md transition-colors " +
                (programFilter === p
                  ? "bg-brand-600 text-white font-semibold"
                  : "text-fg-muted hover:text-fg hover:bg-elevated")
              }
            >
              {p} ({n})
            </button>
          );
        })}
        <span className="text-line">·</span>
        <label className="inline-flex items-center gap-1.5 text-[11.5px] text-fg-muted">
          <input
            type="checkbox"
            checked={onlyUndownloaded}
            onChange={(e) => setOnlyUndownloaded(e.target.checked)}
            className="accent-brand-600"
          />
          Only show un-downloaded
        </label>
        <div className="flex-1" />
        <p className="text-[11px] text-fg-subtle">
          Signed in as <span className="font-semibold">{adminName}</span>
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="inline-flex items-start gap-2 rounded-lg bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 text-[12px] text-rose-900">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-[13px] text-fg-subtle">
          {submissions.length === 0
            ? "No submissions yet. Share /showcase/regulatory-affairs and they'll appear here."
            : "No submissions match the current filter."}
        </div>
      ) : (
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <li key={s.id}>
              <SubmissionCard
                submission={s}
                busy={busyId === s.id}
                onDownload={() => downloadPhoto(s)}
                onToggleMark={() => markDownloaded(s, !s.lastDownloadedAt)}
                onDelete={() => deleteRow(s)}
              />
            </li>
          ))}
        </ol>
      )}

      <p className="text-[11.5px] text-fg-muted italic">
        Public submission URL: <code className="text-fg-subtle">/showcase/regulatory-affairs</code>
        {" · "}
        <button
          type="button"
          onClick={() => router.refresh()}
          className="font-semibold hover:underline"
        >
          Refresh list
        </button>
      </p>
      {confirmNode}
    </div>
  );
}

function SubmissionCard({
  submission, busy, onDownload, onToggleMark, onDelete,
}: {
  submission: Submission;
  busy: boolean;
  onDownload: () => void;
  onToggleMark: () => void;
  onDelete: () => void;
}) {
  const downloaded = !!submission.lastDownloadedAt;
  return (
    <article
      className={
        "relative rounded-xl border bg-card-solid overflow-hidden " +
        (downloaded ? "border-line opacity-90" : "border-brand-200 ring-1 ring-brand-100/50")
      }
    >
      {/* Status strip across the top */}
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ backgroundColor: downloaded ? "var(--fg-subtle)" : "var(--brand-500)" }}
      />

      <div className="p-3.5 flex gap-3">
        {/* Headshot */}
        <a
          href={submission.photoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 w-20 h-20 rounded-full overflow-hidden ring-2 ring-line bg-elevated"
          title="Open full-size"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={submission.photoUrl}
            alt={`${submission.name}'s headshot`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </a>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-fg leading-tight truncate">
            {submission.name}
          </p>
          {submission.linkedinUrl && (
            <a
              href={submission.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-brand-700 hover:underline truncate"
            >
              {submission.linkedinHandle} <ExternalLink size={9} />
            </a>
          )}
          <p className="mt-1.5 text-[11px] text-fg-subtle">
            Submitted {new Date(submission.createdAt).toLocaleString()}
          </p>
          {downloaded && (
            <p className="text-[10.5px] text-fg-subtle italic">
              Downloaded {new Date(submission.lastDownloadedAt!).toLocaleDateString()} by {submission.lastDownloadedBy ?? "—"}
            </p>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-1 border-t border-line/60 px-3 py-2">
        <button
          type="button"
          onClick={onDownload}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          title="Open the headshot in a new tab + mark this row as downloaded"
        >
          <Download size={11} /> Download
        </button>
        <button
          type="button"
          onClick={onToggleMark}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold text-fg-muted hover:bg-elevated disabled:opacity-50"
          title={downloaded ? "Mark as not-yet-downloaded" : "Manually mark as downloaded"}
        >
          {downloaded ? <CheckCircle2 size={11} /> : <Circle size={11} />}
          {downloaded ? "Mark undone" : "Mark done"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          title="Delete this row + the headshot file"
        >
          <Trash2 size={11} /> Delete
        </button>
      </div>
    </article>
  );
}
