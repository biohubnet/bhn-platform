"use client";

/**
 * Version-history drawer for /profile/resume.
 *
 * Lists every ResumeRevision on the calling user's resume in
 * reverse-version order. Each row exposes:
 *   • Preview — full read-only render of that version in a modal
 *               overlay (uses the same ResumeViewer the mentor side
 *               renders), so the user can scan what they'd be
 *               reverting to before they pull the trigger.
 *   • Revert  — overwrites the current resume with that revision's
 *               content. Non-destructive: revisions between source
 *               and now stay in the table so the user can undo the
 *               undo if they want.
 *
 * Opens from a "Versions" button in the editor's top toolbar.
 * Closes on background click / X / escape.
 *
 * After a successful revert the drawer asks the parent to remount
 * via the onReverted callback — the page's existing key-based remount
 * pattern then loads the now-current resume into a fresh editor
 * instance, so the user sees the reverted content instantly with no
 * stale-state bug.
 */

import { useCallback, useEffect, useState } from "react";
import {
  X, Clock, RotateCcw, Eye, Loader2, Sparkles, Wand2, FileText, RefreshCw, AlertTriangle, CheckCircle2, Bookmark,
} from "lucide-react";
import type { ResumeContent } from "@/lib/resume/types";
import { ResumeViewer } from "@/components/resume/ResumeViewer";

interface RevisionRow {
  id: string;
  version: number;
  triggeredBy: string;
  note: string | null;
  createdAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after a successful revert with the new current version.
   *  The parent should clear local state / trigger a router.refresh()
   *  so the editor reflects the now-current content. */
  onReverted: (newVersion: number) => void;
  /** User id whose resume is being inspected — always the calling
   *  user (this drawer is self-only) but we pass it explicitly so
   *  the embedded ResumeViewer can render correctly. */
  ownerId: string;
  /** Current resume version, used to flag the row that matches. */
  currentVersion: number;
}

export function VersionHistoryDrawer({ open, onClose, onReverted, ownerId, currentVersion }: Props) {
  const [list, setList] = useState<RevisionRow[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Preview modal — when set, we've fetched a revision's full content
  // and want to render it in the read-only viewer.
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<ResumeContent | null>(null);
  const [previewMeta, setPreviewMeta] = useState<RevisionRow | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Revert state — id of the row that's mid-revert (loading spinner)
  // plus the last error message if one came back.
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [revertError, setRevertError] = useState<string | null>(null);

  // Manual snapshot — fires POST /revisions/snapshot which creates an
  // always-fresh revision tagged "snapshot" so it stands out from
  // coalesced auto-saves.
  const [snapshotting, setSnapshotting] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const r = await fetch("/api/profile/resume/structure/revisions", { cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean; error?: string; revisions?: RevisionRow[];
      };
      if (!r.ok || !j.ok) {
        setListError(j.error ?? "Couldn't load version history.");
        return;
      }
      setList(j.revisions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) void loadList(); }, [open, loadList]);

  // Escape closes — drawer-level, only when the preview isn't on top.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !previewId) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, previewId, onClose]);

  async function openPreview(rev: RevisionRow) {
    setPreviewId(rev.id);
    setPreviewMeta(rev);
    setPreviewContent(null);
    setPreviewLoading(true);
    try {
      const r = await fetch(`/api/profile/resume/structure/revisions/${rev.id}`, { cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean; error?: string;
        revision?: { content: unknown };
      };
      if (!r.ok || !j.ok || !j.revision) {
        // Fall through — the modal renders an error state instead.
        setPreviewContent(null);
        return;
      }
      setPreviewContent(j.revision.content as ResumeContent);
    } finally {
      setPreviewLoading(false);
    }
  }
  function closePreview() {
    setPreviewId(null);
    setPreviewContent(null);
    setPreviewMeta(null);
  }

  async function takeSnapshot() {
    setSnapshotError(null);
    const note = window.prompt(
      "Name this snapshot (optional)",
      "Before restructuring",
    );
    // window.prompt returns null on cancel — bail without writing.
    // Empty string still creates a snapshot with the default note.
    if (note === null) return;
    setSnapshotting(true);
    try {
      const r = await fetch("/api/profile/resume/structure/revisions/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        setSnapshotError(j.error ?? "Snapshot failed.");
        return;
      }
      await loadList();
    } finally {
      setSnapshotting(false);
    }
  }

  async function revert(rev: RevisionRow) {
    setRevertError(null);
    if (rev.version === currentVersion) return;
    const ok = window.confirm(
      `Revert to v${rev.version}? Your current resume will be replaced.\n\n` +
      `Your work between v${rev.version} and v${currentVersion} stays in the version history — you can revert back if you change your mind.`,
    );
    if (!ok) return;
    setRevertingId(rev.id);
    try {
      const r = await fetch(`/api/profile/resume/structure/revisions/${rev.id}/revert`, {
        method: "POST",
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean; error?: string; reverted?: boolean; version?: number; note?: string;
      };
      if (!r.ok || !j.ok) {
        setRevertError(j.error ?? "Revert failed.");
        return;
      }
      // Close preview first, then bubble up so the parent can remount.
      closePreview();
      onClose();
      onReverted(j.version ?? rev.version);
    } finally {
      setRevertingId(null);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Drawer ------------------------------------------------- */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 bottom-0 z-40 w-full max-w-[460px] bg-card-solid border-l border-line shadow-2xl flex flex-col"
        role="dialog"
        aria-label="Resume version history"
      >
        <header className="px-4 py-3 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex w-7 h-7 rounded-md bg-brand-100 text-brand-700 items-center justify-center">
              <Clock size={13} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-fg leading-tight">Version history</h2>
              <p className="text-[11px] text-fg-muted">Continuous edits coalesce; AI events &amp; snapshots stand alone.</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void takeSnapshot()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] uppercase tracking-[0.14em] font-bold bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-100 disabled:opacity-50"
              disabled={snapshotting}
              title="Capture the current resume as a named snapshot — always creates a new row, never coalesces."
            >
              {snapshotting ? <Loader2 size={10} className="animate-spin" /> : <Bookmark size={10} />}
              Snapshot now
            </button>
            <button
              type="button"
              onClick={() => void loadList()}
              className="p-1.5 rounded-md text-fg-muted hover:bg-elevated"
              title="Refresh list"
              disabled={loading}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-fg-muted hover:bg-elevated"
              aria-label="Close"
            >
              <X size={13} />
            </button>
          </div>
        </header>

        {revertError && (
          <div className="px-4 py-2 text-[11px] text-rose-700 bg-rose-50 ring-1 ring-rose-200 m-3 rounded-md inline-flex items-center gap-1.5">
            <AlertTriangle size={11} /> {revertError}
          </div>
        )}
        {listError && (
          <div className="px-4 py-2 text-[11px] text-rose-700 bg-rose-50 ring-1 ring-rose-200 m-3 rounded-md inline-flex items-center gap-1.5">
            <AlertTriangle size={11} /> {listError}
          </div>
        )}
        {snapshotError && (
          <div className="px-4 py-2 text-[11px] text-rose-700 bg-rose-50 ring-1 ring-rose-200 m-3 rounded-md inline-flex items-center gap-1.5">
            <AlertTriangle size={11} /> {snapshotError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading && !list && (
            <div className="text-xs text-fg-muted inline-flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" /> Loading…
            </div>
          )}
          {list && list.length === 0 && (
            <div className="text-xs text-fg-muted italic">No revisions yet. Edit your resume and revisions will start showing here.</div>
          )}
          {list && list.length > 0 && (
            <ul className="space-y-1.5">
              {list.map((rev) => {
                const isCurrent = rev.version === currentVersion;
                const triggerMeta = TRIGGER_META[rev.triggeredBy] ?? TRIGGER_META.user;
                return (
                  <li
                    key={rev.id}
                    className={
                      "rounded-lg border p-2.5 transition-colors " +
                      (isCurrent
                        ? "border-brand-300 bg-brand-50/40"
                        : "border-line bg-card hover:bg-elevated")
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold text-fg-muted tabular-nums">
                            v{rev.version}
                          </span>
                          <span
                            className={
                              "inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-bold px-1.5 py-0.5 rounded ring-1 ring-inset " +
                              triggerMeta.cls
                            }
                          >
                            <triggerMeta.Icon size={9} /> {triggerMeta.label}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-bold text-brand-800">
                              · current
                            </span>
                          )}
                          <span className="text-[10.5px] text-fg-subtle ml-auto">
                            {formatTimestamp(rev.createdAt)}
                          </span>
                        </div>
                        {rev.note && (
                          <p className="mt-1 text-[12px] text-fg-muted line-clamp-2 break-words">{rev.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => void openPreview(rev)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] uppercase tracking-[0.16em] font-bold text-fg-muted hover:bg-fg/5"
                      >
                        <Eye size={10} /> Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => void revert(rev)}
                        disabled={isCurrent || revertingId === rev.id}
                        className={
                          "inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] uppercase tracking-[0.16em] font-bold ring-1 ring-inset transition-colors " +
                          (isCurrent
                            ? "text-fg-subtle ring-line opacity-50 cursor-not-allowed"
                            : "text-rose-800 bg-rose-50 ring-rose-200 hover:bg-rose-100")
                        }
                        title={isCurrent ? "Already at this version" : `Revert to v${rev.version}`}
                      >
                        {revertingId === rev.id
                          ? <Loader2 size={10} className="animate-spin" />
                          : <RotateCcw size={10} />}
                        Revert
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Preview modal ----------------------------------------- */}
      {previewId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closePreview}
          role="dialog"
          aria-label="Revision preview"
        >
          <div
            className="bg-bg rounded-2xl border border-line shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-4 py-3 border-b border-line flex items-center justify-between">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold text-fg-muted tabular-nums">
                  {previewMeta && `v${previewMeta.version}`}
                </span>
                {previewMeta?.note && (
                  <p className="text-xs text-fg-muted truncate">{previewMeta.note}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {previewMeta && previewMeta.version !== currentVersion && (
                  <button
                    type="button"
                    onClick={() => previewMeta && void revert(previewMeta)}
                    disabled={revertingId !== null}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-[0.16em] bg-rose-50 text-rose-800 ring-1 ring-rose-200 hover:bg-rose-100 disabled:opacity-50"
                  >
                    {revertingId === previewMeta.id
                      ? <Loader2 size={11} className="animate-spin" />
                      : <RotateCcw size={11} />}
                    Revert to this version
                  </button>
                )}
                <button
                  type="button"
                  onClick={closePreview}
                  className="p-1.5 rounded-md text-fg-muted hover:bg-elevated"
                >
                  <X size={13} />
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              {previewLoading && (
                <div className="text-xs text-fg-muted inline-flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" /> Loading revision…
                </div>
              )}
              {!previewLoading && !previewContent && (
                <p className="text-xs text-fg-muted italic">Couldn&apos;t load this revision.</p>
              )}
              {previewContent && previewMeta && (
                <ResumeViewer
                  ownerId={ownerId}
                  content={previewContent}
                  canComment={false}
                  viewerId={ownerId}
                  viewerRole="trainee"
                  initialComments={[]}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Trigger metadata ────────────────────────────────────────────

interface TriggerMeta {
  label: string;
  cls: string;
  Icon: React.ComponentType<{ size?: number }>;
}
const TRIGGER_META: Record<string, TriggerMeta> = {
  user:       { label: "Edit session", cls: "bg-card-solid text-fg-muted ring-line",                       Icon: FileText },
  ai_parse:   { label: "AI parse",     cls: "bg-violet-50 text-violet-800 ring-violet-200",                Icon: Sparkles },
  ai_suggest: { label: "AI rewrite",   cls: "bg-brand-50 text-brand-800 ring-brand-200",                   Icon: Wand2 },
  ai_tailor:  { label: "AI tailor",    cls: "bg-brand-50 text-brand-800 ring-brand-200",                   Icon: Wand2 },
  revert:     { label: "Revert",       cls: "bg-amber-50 text-amber-900 ring-amber-200",                   Icon: RotateCcw },
  snapshot:   { label: "Snapshot",     cls: "bg-emerald-50 text-emerald-800 ring-emerald-200",             Icon: Bookmark },
};

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
