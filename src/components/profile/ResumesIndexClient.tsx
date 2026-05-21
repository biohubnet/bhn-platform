"use client";

/**
 * Client list for /profile/resumes. Owns the row-level mutations
 * (rename / archive / restore / duplicate / new) so the page can
 * stay in-flight without full reloads — each action just patches
 * the local list after the API call returns.
 *
 * The page server-renders the initial list; this component takes
 * over from there.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, FileText, Clock, MessageCircle, Archive, RotateCcw, Pencil, Copy, Eye, Sparkles, Loader2,
  Trash2, CheckSquare, Square, X, ExternalLink,
} from "lucide-react";
import type { ResumeContent } from "@/lib/resume/types";
import { ResumeThumbnail } from "./ResumeThumbnail";
import { LaunchSwitch } from "@/components/ui/LaunchSwitch";
import { useInputDialog } from "@/components/ui/InputDialog";

interface PostingChip {
  id: string;
  title: string;
  companyName: string;
}

interface ResumeRow {
  id: string;
  name: string;
  isArchived: boolean;
  lastEditedAt: string;
  version: number;
  hasParsed: boolean;
  /** Uploaded PDF / DOCX backing this resume. Lets the index show a
   *  "Parse from PDF" CTA on the card when an upload exists but the
   *  structured tree hasn't been seeded yet — the most common
   *  "where's my resume?" UX gap when users come from /profile/application. */
  sourceFileUrl: string | null;
  /** Full content tree — used by ResumeThumbnail to render the
   *  paper-style mini preview on each card. */
  content: ResumeContent;
  derivedFrom: { id: string; name: string } | null;
  derivedForPosting: PostingChip | null;
  commentCount: number;
  revisionCount: number;
}

interface Props {
  initialResumes: ResumeRow[];
}

export function ResumesIndexClient({ initialResumes }: Props) {
  const router = useRouter();
  const { inputDialog, node: dialogNode } = useInputDialog();
  const [resumes, setResumes] = useState<ResumeRow[]>(initialResumes);
  const [creating, startCreate] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Multi-select state — checkbox per card. When at least one row
  // is selected, the sticky batch toolbar surfaces above the list
  // with Archive / Restore / Delete / Open all PDFs.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState<null | "archive" | "restore" | "delete">(null);

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelected(new Set()); }

  const active = resumes.filter((r) => !r.isArchived);
  const archived = resumes.filter((r) => r.isArchived);

  async function createBlank() {
    setError(null);
    const name = await inputDialog({
      title: "New resume",
      description: "Give it a name. You can rename it any time.",
      label: "Resume name",
      placeholder: "e.g. Main resume, Academic CV",
      defaultValue: "New resume",
      confirmLabel: "Create",
    });
    if (name === null) return;
    startCreate(async () => {
      const r = await fetch("/api/profile/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "New resume" }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; resume?: { id: string } };
      if (!r.ok || !j.ok || !j.resume) {
        setError(j.error ?? "Couldn't create resume.");
        return;
      }
      router.push(`/profile/resume?id=${j.resume.id}`);
    });
  }

  async function duplicate(source: ResumeRow) {
    setError(null);
    const name = await inputDialog({
      title: "Duplicate resume",
      description: `Make a copy of "${source.name}" with all its sections, items, and bullets.`,
      label: "New resume name",
      defaultValue: `${source.name} (copy)`,
      confirmLabel: "Duplicate",
    });
    if (name === null) return;
    const r = await fetch("/api/profile/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || `${source.name} (copy)`, sourceResumeId: source.id }),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; resume?: { id: string } };
    if (!r.ok || !j.ok || !j.resume) {
      setError(j.error ?? "Duplicate failed.");
      return;
    }
    router.push(`/profile/resume?id=${j.resume.id}`);
  }

  async function rename(row: ResumeRow) {
    setError(null);
    const name = await inputDialog({
      title: "Rename resume",
      label: "Resume name",
      defaultValue: row.name,
      confirmLabel: "Rename",
    });
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    // Optimistic update.
    setResumes((cur) => cur.map((x) => (x.id === row.id ? { ...x, name: trimmed } : x)));
    const r = await fetch(`/api/profile/resumes/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!r.ok) {
      setError("Rename failed — refresh to see actual state.");
    }
  }

  async function setArchived(row: ResumeRow, archived: boolean) {
    setError(null);
    if (archived && active.length <= 1) {
      const ok = window.confirm(
        "This is your only active resume. Archiving it will leave you with no live resume — you'll need to restore or create one to keep working. Continue?",
      );
      if (!ok) return;
    }
    // Optimistic update.
    setResumes((cur) => cur.map((x) => (x.id === row.id ? { ...x, isArchived: archived } : x)));
    const r = await fetch(`/api/profile/resumes/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: archived }),
    });
    if (!r.ok) {
      // Roll back.
      setResumes((cur) => cur.map((x) => (x.id === row.id ? { ...x, isArchived: !archived } : x)));
      setError("Archive update failed.");
    }
  }

  /** Permanently delete a resume — hard delete via the API's
   *  ?force=true mode. Cascades to comments + revisions.
   *
   *  No window.confirm() — the LaunchSwitch (cover-flip + 5s
   *  countdown + abort) already enforces a deliberate commitment
   *  ritual, and stacking a browser-native confirm on top would be
   *  visually + cognitively redundant. */
  async function hardDelete(row: ResumeRow) {
    setError(null);
    // Optimistic removal.
    setResumes((cur) => cur.filter((x) => x.id !== row.id));
    setSelected((s) => {
      const next = new Set(s);
      next.delete(row.id);
      return next;
    });
    const r = await fetch(`/api/profile/resumes/${row.id}?force=true`, { method: "DELETE" });
    if (!r.ok) {
      // Roll back by triggering a hard re-fetch.
      router.refresh();
      setError("Delete failed — refresh to see actual state.");
    }
  }

  // ── Batch actions ──────────────────────────────────────────────
  async function batchArchive(value: boolean) {
    setBatchBusy(value ? "archive" : "restore");
    try {
      const ids = Array.from(selected);
      // Fire-and-forget per-row; UI flips optimistically.
      setResumes((cur) => cur.map((x) => (ids.includes(x.id) ? { ...x, isArchived: value } : x)));
      await Promise.all(ids.map((id) =>
        fetch(`/api/profile/resumes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: value }),
        }),
      ));
      clearSelection();
    } finally {
      setBatchBusy(null);
    }
  }
  async function batchDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const ok = window.confirm(
      `Permanently delete ${ids.length} resume${ids.length === 1 ? "" : "s"}?\n\n` +
      `This is irreversible — comments + version history go with them. ` +
      `Choose Archive instead if you might want them back.`,
    );
    if (!ok) return;
    setBatchBusy("delete");
    try {
      setResumes((cur) => cur.filter((x) => !ids.includes(x.id)));
      await Promise.all(ids.map((id) =>
        fetch(`/api/profile/resumes/${id}?force=true`, { method: "DELETE" }),
      ));
      clearSelection();
    } finally {
      setBatchBusy(null);
    }
  }
  function batchOpenPDFs() {
    // Open each selected resume's print-view in its own tab. Browsers
    // typically queue these reliably when triggered by a user click;
    // if a popup blocker stops the first one we leave the others
    // un-opened so the user notices + retries.
    const ids = Array.from(selected);
    for (const id of ids) {
      window.open(`/profile/resume/preview?id=${id}`, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-fg-muted">
          {active.length} active{archived.length > 0 && ` · ${archived.length} archived`}
        </p>
        <button
          type="button"
          onClick={createBlank}
          disabled={creating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          New resume
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-md px-2.5 py-1.5">
          {error}
        </p>
      )}

      {/* Sticky batch toolbar — renders only when 1+ cards selected. */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-30 rounded-xl border border-brand-300 bg-brand-50/95 backdrop-blur-sm shadow-md px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-brand-600 text-white">
              <CheckSquare size={13} />
            </span>
            <span className="text-sm font-semibold text-brand-900">
              {selected.size} selected
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-fg-muted hover:bg-fg/5"
              title="Clear selection"
            >
              <X size={11} /> Clear
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={batchOpenPDFs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-card-solid text-fg ring-1 ring-inset ring-line hover:bg-elevated"
              title="Open each selected resume's print view in a new tab so you can save each as PDF"
            >
              <ExternalLink size={11} /> Open PDFs
            </button>
            <button
              type="button"
              onClick={() => batchArchive(true)}
              disabled={batchBusy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-card-solid text-fg ring-1 ring-inset ring-line hover:bg-elevated disabled:opacity-50"
            >
              {batchBusy === "archive" ? <Loader2 size={11} className="animate-spin" /> : <Archive size={11} />}
              Archive
            </button>
            <button
              type="button"
              onClick={() => batchArchive(false)}
              disabled={batchBusy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-card-solid text-fg ring-1 ring-inset ring-line hover:bg-elevated disabled:opacity-50"
            >
              {batchBusy === "restore" ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
              Restore
            </button>
            <button
              type="button"
              onClick={batchDelete}
              disabled={batchBusy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {batchBusy === "delete" ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              Delete permanently
            </button>
          </div>
        </div>
      )}

      {active.length === 0 && archived.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card-solid p-8 text-center text-sm text-fg-muted">
          You don&apos;t have a resume yet. Click <strong>New resume</strong> above to start one — or visit <Link href="/profile/resume" className="text-brand-700 underline">/profile/resume</Link> to scaffold a Main resume automatically.
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {active.map((r) => (
            <ResumeCard
              key={r.id}
              row={r}
              isSelected={selected.has(r.id)}
              onToggleSelect={() => toggleSelected(r.id)}
              onRename={() => rename(r)}
              onDuplicate={() => duplicate(r)}
              onArchive={() => setArchived(r, true)}
              onDelete={() => hardDelete(r)}
            />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <details className="rounded-xl border border-dashed border-line p-3 mt-6">
          <summary className="text-[11px] uppercase tracking-[0.18em] font-bold text-fg-muted cursor-pointer select-none">
            Archived ({archived.length})
          </summary>
          <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {archived.map((r) => (
              <ResumeCard
                key={r.id}
                isSelected={selected.has(r.id)}
                onToggleSelect={() => toggleSelected(r.id)}
                onDelete={() => hardDelete(r)}
                row={r}
                onRename={() => rename(r)}
                onDuplicate={() => duplicate(r)}
                onRestore={() => setArchived(r, false)}
              />
            ))}
          </ul>
        </details>
      )}

      {/* Input dialog portal — only rendered when an inputDialog()
          call is awaiting a response. See InputDialog for the API. */}
      {dialogNode}
    </div>
  );
}

function ResumeCard({
  row, isSelected, onToggleSelect, onRename, onDuplicate, onArchive, onRestore, onDelete,
}: {
  row: ResumeRow;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete: () => void;
}) {
  const updatedRel = formatRelative(row.lastEditedAt);
  return (
    <li className={
      "relative rounded-xl border p-3 transition-colors flex gap-3 " +
      (isSelected
        ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-300"
        : row.isArchived
          ? "border-line bg-bg/30"
          : "border-line bg-card-solid hover:bg-elevated")
    }>
      {/* Multi-select checkbox in the corner — clicking flips the
          selection without navigating into the resume. */}
      <button
        type="button"
        onClick={onToggleSelect}
        className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-6 h-6 rounded text-fg-muted hover:text-fg hover:bg-elevated"
        aria-label={isSelected ? "Deselect" : "Select"}
        title={isSelected ? "Deselect" : "Select for batch action"}
      >
        {isSelected ? <CheckSquare size={16} className="text-brand-700" /> : <Square size={16} />}
      </button>

      {/* Paper-style thumbnail — clickable through to the editor so
          the whole left column reads as "open this resume". */}
      <Link
        href={`/profile/resume?id=${row.id}`}
        className="shrink-0 self-start block hover:opacity-90 transition-opacity"
        aria-label={`Open ${row.name}`}
      >
        <ResumeThumbnail
          content={row.content}
          width={144}
          dimmed={row.isArchived}
        />
      </Link>

      <div className="min-w-0 flex-1 flex flex-col gap-1.5 pr-7">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/profile/resume?id=${row.id}`} className="block">
              <p className="text-sm font-semibold text-fg leading-tight hover:underline truncate">
                {row.name}
              </p>
            </Link>
            <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-fg-subtle mt-0.5 tabular-nums">
              v{row.version}
              {row.hasParsed && <span className="ml-1.5 text-brand-700 normal-case font-semibold inline-flex items-center gap-0.5"><Sparkles size={9} /> parsed</span>}
            </p>
          </div>
          {row.isArchived && (
            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-[0.14em] font-bold bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200">
              <Archive size={9} /> Archived
            </span>
          )}
        </div>

        {row.derivedFrom && (
          <p className="text-[11px] text-fg-muted">
            Derived from <Link href={`/profile/resume?id=${row.derivedFrom.id}`} className="font-medium text-brand-700 hover:underline">{row.derivedFrom.name}</Link>
          </p>
        )}
        {row.derivedForPosting && (
          <p className="text-[11px] text-fg-muted">
            Tailored for {row.derivedForPosting.companyName} · {row.derivedForPosting.title}
          </p>
        )}

        <div className="flex items-center gap-2 text-[11px] text-fg-muted">
          <span className="inline-flex items-center gap-1"><Clock size={11} /> {updatedRel}</span>
          {row.commentCount > 0 && (
            <span className="inline-flex items-center gap-1"><MessageCircle size={11} /> {row.commentCount}</span>
          )}
          {row.sourceFileUrl && (
            <a
              href={row.sourceFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand-700 hover:underline"
              title="Open the uploaded PDF in a new tab"
            >
              <FileText size={11} /> Uploaded PDF
            </a>
          )}
        </div>

        {/* AI-parse CTA — when the user has an uploaded PDF but the
            structured tree hasn't been seeded yet. The most common
            "where's my resume?" UX gap when users come from
            /profile/application without ever opening the editor. */}
        {row.sourceFileUrl && !row.hasParsed && (
          <Link
            href={`/profile/resume?id=${row.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-brand-50 text-brand-900 ring-1 ring-inset ring-brand-200 hover:bg-brand-100"
          >
            <Sparkles size={11} /> AI-parse from your uploaded PDF
          </Link>
        )}

        {/* Primary actions row — Open + Preview front and centre,
            larger so they're tap-friendly. */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          <Link
            href={`/profile/resume?id=${row.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            <FileText size={12} /> Open
          </Link>
          <Link
            href={`/profile/resume/preview?id=${row.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold bg-brand-50 text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100 transition-colors"
          >
            <Eye size={12} /> Preview PDF
          </Link>
        </div>

        {/* Secondary actions — slightly smaller, less visually loud.
            The LaunchSwitch leads the row (left-anchored). The cover
            already guarantees it can't be triggered accidentally, so
            the conventional "destructive last" placement isn't
            needed — keeping a stable left edge for the destructive
            control beats it migrating around as siblings appear and
            disappear (Archive vs. Restore swap). */}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-1">
          <LaunchSwitch
            label="DELETE"
            ariaLabel="Delete resume — protected switch with 10-second countdown"
            onFire={onDelete}
          />
          <button
            type="button"
            onClick={onDuplicate}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-fg-muted ring-1 ring-line hover:bg-elevated"
          >
            <Copy size={11} /> Duplicate
          </button>
          <button
            type="button"
            onClick={onRename}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-fg-muted ring-1 ring-line hover:bg-elevated"
          >
            <Pencil size={11} /> Rename
          </button>
          {onArchive && (
            <button
              type="button"
              onClick={onArchive}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-50"
            >
              <Archive size={11} /> Archive
            </button>
          )}
          {onRestore && (
            <button
              type="button"
              onClick={onRestore}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            >
              <RotateCcw size={11} /> Restore
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}
